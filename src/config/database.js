const mysql = require('mysql2');
require('dotenv').config();

console.log('🔄 Attempting to connect to database...');
console.log(`📍 Host: ${process.env.DB_HOST}`);
console.log(`📚 Database: ${process.env.DB_NAME}`);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 90000, // Increased to 90 seconds
  acquireTimeout: 90000,
  socketPath: undefined, // Remove any socket path configurations
  ssl: {
    // If your hosting requires SSL
    rejectUnauthorized: false
  }
});

const promisePool = pool.promise();

// Function to test connection with retries
const testConnection = async (retries = 3, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await promisePool.getConnection();
      console.log('✅ Database connected successfully!');
      console.log('🔐 Connection ID:', connection.threadId);
      console.log('📡 Connection established at:', new Date().toLocaleString());
      connection.release();
      return true;
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1} failed`);
      console.error('🚫 Error type:', error.code);
      console.error('💬 Error message:', error.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Max retries reached. Could not establish database connection');
        throw error;
      }
    }
  }
};

// Initialize connection
testConnection()
  .catch(error => {
    console.error('🔥 Database connection failed after all retries');
    console.error('Full error:', error);
    process.exit(1); // Exit if we can't connect to database
  });

module.exports = promisePool;