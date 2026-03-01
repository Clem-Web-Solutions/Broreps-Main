import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
  connectTimeout: 10000,
  acquireTimeout: 10000,
  multipleStatements: true
});

// Execute SQL statements safely (handle IF NOT EXISTS for ALTER TABLE)
async function executeSQL(sql, description) {
  try {
    await pool.query(sql);
    console.log(`✅ ${description}`);
    return true;
  } catch (err) {
    // Ignore duplicate column / key errors
    if (
      err.code === 'ER_DUP_FIELDNAME' ||
      err.code === 'ER_DUP_INDEX_NAME' ||
      err.code === 'ER_DUP_KEYNAME'      // duplicate index on CREATE INDEX
    ) {
      console.log(`ℹ️  ${description} - already exists`);
      return true;
    }
    console.warn(`⚠️  ${description} - ${err.message}`);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const initSQLPath = join(__dirname, '../init-db.sql');
    const initSQL = readFileSync(initSQLPath, 'utf-8');

    await pool.query(initSQL);
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('⚠️  Database initialization warning:', err.message);
    // Don't fail if initialization has issues (tables may already exist)
  }
}

// Execute SQL files from sql/ directory
async function executeSQLDirectory() {
  try {
    const sqlDir = join(__dirname, '../sql');
    const files = readdirSync(sqlDir).filter(f => f.endsWith('.sql'));

    console.log(`📂 Found ${files.length} SQL files to execute`);

    for (const file of files) {
      const filePath = join(sqlDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      // Split by semicolon and execute each statement separately
      // This handles ALTER TABLE statements better than multipleStatements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        await executeSQL(statement, `Executing ${file}`);
      }
    }

    console.log('✅ All SQL files executed successfully');
  } catch (err) {
    console.error('⚠️  SQL directory execution warning:', err.message);
  }
}

// Test connection with detailed info
pool.getConnection()
  .then(async connection => {
    console.log('✅ Database connected successfully');
    console.log(`📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME}`);

    // Initialize tables on connection
    await initializeDatabase();

    // Execute SQL directory files
    await executeSQLDirectory();

    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed');
    console.error(`📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.error(`👤 User: ${process.env.DB_USER}`);
    console.error(`📛 Error: ${err.code} - ${err.message}`);
    if (err.code === 'ETIMEDOUT') {
      console.error('💡 Possible fixes:');
      console.error('   1. Check firewall rules on database server');
      console.error('   2. Ensure MySQL bind-address allows remote connections');
      console.error('   3. Verify IP whitelist includes your current IP');
      console.error('   4. Test connectivity: mysql -h 51.38.236.228 -P 3306 -u broreps -p');
    }
  });

export default pool;
