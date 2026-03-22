import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateMistralResponse } from './ai-service.js'; 
import User from './models/User.js'; 
import { protect } from './middleware/auth.js'; 
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("DB Connection Error:", err));

// --- AI TEST ROUTE ---
app.post('/api/ai/test', async (req, res) => {
    const { prompt } = req.body;
    try {
        const aiOutput = await generateMistralResponse(prompt);
        res.json({ output: aiOutput });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Mistral failed to respond." });
    }
});

// --- AUTH: REGISTER ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email,
            passwordHash: hashedPassword,
            role: role || 'user',
            apiCalls: 0
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH: LOGIN (With JWT) ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: "User not found" });
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'supersecret', 
            { expiresIn: '1h' }
        );

        res.json({ 
            success: true, 
            token,
            user: { 
                email: user.email, 
                role: user.role, 
                apiCalls: user.apiCalls 
            } 
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ADMIN ONLY ROUTE: Get all user stats
app.get('/api/admin/users', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access Denied: Admins Only" });
    }

    try {
        const users = await User.find({}, '-passwordHash'); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching system users" });
    }
});

// --- FORGOT PASSWORD: Generate Token & Send Email ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "No account with that email exists." });
        }

        // 1. Generate Token
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        // 2. Setup Transporter (Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 3. Define Mail Options
        const mailOptions = {
            from: `"FrontDesk AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Reset Your FrontDesk AI Password',
            html: `
                <div style="font-family: sans-serif; background-color: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center;">
                    <h1 style="color: #4f46e5;">FrontDesk AI</h1>
                    <p>You requested a password reset. Click the button below to secure your account:</p>
                    <a href="http://localhost:3000/reset-password/${token}" 
                       style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; margin: 20px 0;">
                       Reset Password
                    </a>
                    <p style="color: #64748b; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions); 

        res.json({ success: true, message: "Reset link sent to your email!" });

    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: "Failed to send reset email." });
    }
});

// --- RESET PASSWORD: Verify Token & Update Password ---
app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // 1. Find user with valid token that hasn't expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Update user and clear reset fields
        user.passwordHash = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ success: true, message: "Password updated successfully!" });

    } catch (err) {
        res.status(500).json({ error: "Failed to reset password." });
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));