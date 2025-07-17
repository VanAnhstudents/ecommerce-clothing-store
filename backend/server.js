// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';

const PORT = process.env.PORT || 5000;

// Debug environment variables
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('DB_HOST:', process.env.DB_HOST);

// Test database connection before starting server
testConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Environment: ${process.env.NODE_ENV || 'undefined'}`);
        console.log(`🔐 JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    });
}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});