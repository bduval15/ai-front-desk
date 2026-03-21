const bcrypt = require('bcryptjs');

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