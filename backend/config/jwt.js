import jwt from 'jsonwebtoken';

const generateToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

const verifyToken = (token) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured in environment variables');
    }
    
    return jwt.verify(token, process.env.JWT_SECRET);
};

export default {
    generateToken,
    verifyToken
};

// Also export individual functions
export { generateToken, verifyToken };