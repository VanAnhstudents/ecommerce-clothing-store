import { createPool } from 'mysql2/promise';

// Create connection pool
const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Anh@280105@',
    database: process.env.DB_NAME || 'ecommerce_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: false
});

// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        console.log(`📊 Connected to: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

export default {
    pool,
    testConnection
};

// Also export named exports for backward compatibility
export { pool, testConnection };

const execute = async (sql, params = []) => {
  let connection;
  try {
    connection = await pool.getConnection(); 
    const [rows, fields] = await connection.execute(sql, params); 
    return { rows, fields }; 
  } catch (error) {
    console.error('MySQL Query Error:', error.message);
    console.error('SQL:', sql);
    console.error('Parameters:', params);
    throw error; 
  } finally {
    if (connection) {
      connection.release(); 
    }
  }
};

const checkDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database!');
    connection.release();
  } catch (error) {
    console.error('Could not connect to MySQL database:', error.message);
    process.exit(1); 
  }
};

// EXPORT pool CŨNG VẬY
export { pool, execute, checkDbConnection }; 