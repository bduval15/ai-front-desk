import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const CALL_LIMIT = 20;

export const getUsageWarning = (apiCalls = 0) => {
    if (apiCalls >= CALL_LIMIT) {
        return "20-call limit reached. New outbound calls are blocked until usage is reduced or the plan changes.";
    }

    if (apiCalls >= CALL_LIMIT - 2) {
        return `Warning: ${CALL_LIMIT - apiCalls} call${CALL_LIMIT - apiCalls === 1 ? '' : 's'} remaining before the 20-call limit is reached.`;
    }

    return '';
};

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id email role apiCalls');

        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            apiCalls: user.apiCalls,
            warning: getUsageWarning(user.apiCalls)
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
