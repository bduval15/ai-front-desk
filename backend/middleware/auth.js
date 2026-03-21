import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token;

    // Check headers for "Authorization: Bearer <token>"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token
            token = req.headers.authorization.split(' ')[1];

            // Verify token using the secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');

            // Attach user data (id and role) to the request object
            req.user = decoded;

            next(); // Move to the next function (the route handler)
        } catch (error) {
            console.error("JWT Verification Error:", error.message);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }
};