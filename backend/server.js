const bcrypt = require('bcryptjs');
const { LlamaModel, LlamaContext, LlamaChatSession } = require("node-llama-cpp");
const path = require("path");
const modelPath = path.join(__dirname, "models-storage", "mistral-7b-instruct-v0.2.Q4_K_M.gguf");

console.log("Initializing Mistral-7B (Local Hosting)...");

const model = new LlamaModel({
    modelPath: modelPath,
});

const context = new LlamaContext({ model });
const session = new LlamaChatSession({ context });

const generateResponse = async (goal) => {
    const prompt = `System: You are a professional front desk assistant. 
    User Goal: ${goal}
    Task: Write a short, 2-sentence opening script for a phone call to achieve this goal. 
    Assistant Script:`;

    const response = await session.prompt(prompt);
    return response;
};

module.exports = { generateResponse };



// 1. REGISTRATION ROUTE (With Hashing)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // HASH THE PASSWORD (Salt factor of 10)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save to MongoDB
        const newUser = new User({
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. LOGIN ROUTE (Comparing Hashed Password)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in DB
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        // COMPARE hashed password with user input
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // If match, send success
        res.json({ 
            success: true, 
            user: { email: user.email, role: user.role } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});