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

// --- AI TEST ROUTE (For AIDemo Page - Bonus Mark Proof) ---
app.post('/api/ai/test', async (req, res) => {
    const { prompt } = req.body;
    try {
        const aiOutput = await generateMistralResponse(prompt);
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
        if (!user) return res.status(404).json({ message: "Email not found" });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        await transporter.sendMail({
            from: `"FrontDesk AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Reset Your Password',
            html: `<p>Click <a href="http://localhost:3000/reset-password/${token}">here</a> to reset your password.</p>`
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Email failed" }); }
});

// --- TELEPHONY: DISPATCH AI CALL (The core logic) ---
app.post('/api/telephony/make-call', protect, async (req, res) => {
    const { phoneNumber, goal } = req.body;
    try {
        const user = await User.findById(req.user.id);
        
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