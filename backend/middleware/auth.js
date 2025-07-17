import { verifyToken } from '../config/jwt.js';
import { pool } from '../config/database.js';

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = verifyToken(token);
        
        // Kiểm tra user có tồn tại không
        const [users] = await pool.execute(
            'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found or inactive' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Middleware kiểm tra role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

export default {
    auth,
    authorize
};