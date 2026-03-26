import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt'; 
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Local Imports
import { generateMistralResponse } from './ai-service.js'; 
import User from './models/User.js'; 
import Call from './models/Call.js';
import { protect } from './middleware/auth.js'; 

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET;

// 1. Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("DB Connection Error:", err));

// 2. Reusable Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- AI TEST ROUTE ---
app.post('/api/ai/test', async (req, res) => {
    const { prompt } = req.body;
    try {
        const aiOutput = await generateMistralResponse(prompt, true); 
        res.json({ output: aiOutput });
    } catch (error) {
        res.status(500).json({ error: "Mistral failed to respond." });
    }
});

// --- AUTH: REGISTER ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
            role: 'user',
            apiCalls: 0
        });

        await newUser.save();
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH: LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, user: { email: user.email, role: user.role, apiCalls: user.apiCalls } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FORGOT PASSWORD ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        // 1. Don't confirm if the email exists or not (Privacy)
        if (!user) return res.json({ success: true, message: "Check your email." });

        // 2. Generate a random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. HASH the token before saving to DB 
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // 4. Send the unhashed token in the link
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        
        await transporter.sendMail({
            from: `"FrontDesk AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `<p>Your reset link (expires in 1hr): <a href="${resetUrl}">${resetUrl}</a></p>`
        });

        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: "Internal server error" }); 
    }
});

// --- AUTH: RESET PASSWORD ---
app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        // 1. Get the new password and the token from the URL
        const { password } = req.body;
        const resetToken = req.params.token;

        // 2. Hash the token from the URL so we can compare it to the DB
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Find a user with this hashed token, check if it's still valid 
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        // 4. If no user is found, or the time ran out, reject the request
        if (!user) {
            return res.status(400).json({ message: "Token is invalid or has expired." });
        }

        // 5. Hash the NEW password using bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 6. Update the user's password
        user.passwordHash = hashedPassword;

        // 7. Clear the reset token fields so the link can never be used again
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        // 8. Save the updated user to the database
        await user.save();

        res.json({ success: true, message: "Password has been successfully reset." });

    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- TELEPHONY: DISPATCH AI CALL ---
app.post('/api/telephony/make-call', protect, async (req, res) => {
    const { phoneNumber, goal } = req.body;
    try {
        const user = await User.findById(req.user.id);

        if (user.apiCalls >= 20) {
            return res.status(403).json({ 
                error: "Call limit reached. Please upgrade your plan or contact support." 
            });
        }
        
        // Use local Mistral model
        const aiScript = await generateMistralResponse(goal);

        // Save Transcript
        const newCall = new Call({
            userId: user._id,
            userEmail: user.email,
            phoneNumber,
            goal,
            transcript: aiScript
        });
        await newCall.save();

        // Increment Usage (20-call limit logic)
        user.apiCalls += 1;
        await user.save();

        res.json({ success: true, script: aiScript, apiCalls: user.apiCalls });
    } catch (err) { res.status(500).json({ error: "AI Dispatch Failed" }); }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/users', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Denied" });
    const users = await User.find({}, 'email role apiCalls createdAt _id');
    res.json(users);
});

app.get('/api/admin/all-calls', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Denied" });
    const calls = await Call.find().sort({ createdAt: -1 });
    res.json(calls);
});

// --- USER ROUTES ---
app.get('/api/calls/my-calls', protect, async (req, res) => {
    const calls = await Call.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(calls);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));