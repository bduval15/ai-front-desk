import "dotenv/config";
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateMistralResponse } from './ai-service.js'; 
import User from './models/User.js'; 
const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
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
            password: hashedPassword,
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

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'supersecret', 
            { expiresIn: '1h' }
        );

        res.json({ 
            success: true, 
            token,
            user: { email: user.email, role: user.role, apiCalls: user.apiCalls } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN ONLY ROUTE: Get all user stats
app.get('/api/admin/users', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access Denied: Admins Only" });
    }

    try {
        const users = await User.find({}, '-password'); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching system users" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));