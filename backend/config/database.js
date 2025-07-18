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

// Cải thiện hàm execute để hỗ trờ transaction
const execute = async (sql, params = [], connection = null) => {
  let conn = connection;
  let shouldRelease = false;
  
  try {
    if (!conn) {
      conn = await pool.getConnection();
      shouldRelease = true;
    }
    
    const [rows, fields] = await conn.execute(sql, params);
    return { rows, fields };
  } catch (error) {
    console.error('MySQL Query Error:', error.message);
    console.error('SQL:', sql);
    console.error('Parameters:', params);
    throw error;
  } finally {
    if (shouldRelease && conn) {
      conn.release();
    }
  }
};

const getConnectionForTransaction = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error getting connection for transaction:', error.message);
    throw error;
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

const withTransaction = async (callback) => {
  const connection = await getConnectionForTransaction();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export {
  pool,
  testConnection, 
  execute, 
  checkDbConnection, 
  getConnectionForTransaction, 
  withTransaction 
};