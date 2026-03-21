require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./middleware/mongodb');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(cors());

// connect to DB
connectDB();

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
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ email, passwordHash });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH: LOGIN (With JWT) ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate JWT
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));