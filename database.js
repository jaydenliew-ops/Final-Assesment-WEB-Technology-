require('dotenv').config();
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'housing_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'housing_sales_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 100,
  charset: 'utf8mb4',
  timezone: 'Z'
});
// Keep TIMESTAMP decoding, NOW(), and browser ISO dates in the same timezone.
pool.pool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));
module.exports = pool;
