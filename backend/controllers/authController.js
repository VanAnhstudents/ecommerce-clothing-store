import { hash, compare } from 'bcryptjs';
import { pool } from '../config/database.js';
import { generateToken } from '../config/jwt.js';

const register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address, role } = req.body;

        // Validate required fields
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ 
                message: 'Username, email, password, and full_name are required' 
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email or username already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await hash(password, saltRounds);

        // Create new user
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone || null, address || null, role || 'customer']
        );

        const userId = result.insertId;

        // Generate token
        const token = generateToken({ 
            id: userId, 
            email, 
            role: role || 'customer' 
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: userId,
                username,
                email,
                full_name,
                role: role || 'customer'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Find user
        const [users] = await pool.execute(
            'SELECT id, username, email, password, full_name, role FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default {
    register,
    login
};