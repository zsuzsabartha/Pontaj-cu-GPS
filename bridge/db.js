
import sql from 'mssql';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const config = {
  user: process.env.DB_USER || 'PontajAppUser',
  password: process.env.DB_PASS || 'StrongPass123!',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'PontajSmart',
  options: {
    encrypt: true, // Use true for Azure, false/true for local dev depending on cert
    trustServerCertificate: true // Trust self-signed certs (common in dev)
  },
  port: parseInt(process.env.DB_PORT || '1433')
};

export const connectDB = async () => {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('Database Connection Failed! Config:', { ...config, password: '***' });
    console.error(err);
    throw err;
  }
};
