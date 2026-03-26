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

// --- AUTH: FORGOT PASSWORD ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        // 1. Privacy protection: don't reveal if email exists
        if (!user) return res.json({ success: true, message: "Check your email." });

        // 2. Generate random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. Hash token for DB storage
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // 4. Dynamic URL for Render vs Localhost
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
        
        await transporter.sendMail({
            from: `"FrontDesk AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `<p>Your reset link (expires in 1hr): <a href="${resetUrl}">${resetUrl}</a></p>`
        });

        res.json({ success: true });
    } catch (err) { 
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: "Internal server error" }); 
    }
});

// --- AUTH: RESET PASSWORD ---
app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const resetToken = req.params.token;

        // Hash token from URL to compare with DB
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Token is invalid or has expired." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.passwordHash = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

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