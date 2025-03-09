const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  try {
    // Get database configuration from environment variables
    const host = process.env.DATABASE_HOST || 'localhost';
    const port = process.env.DATABASE_PORT || 3306;
    const user = process.env.DATABASE_USERNAME || 'root';
    const password = process.env.DATABASE_PASSWORD || '';
    const database = process.env.DATABASE_NAME || 'restaurant_app';

    console.log(`Connecting to MySQL server at ${host}:${port}...`);
    
    // Create connection without database name
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password
    });

    console.log('Connected to MySQL server.');
    console.log(`Checking if database '${database}' exists...`);

    // Check if database exists
    const [rows] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [database]
    );

    if (rows.length === 0) {
      console.log(`Database '${database}' does not exist. Creating...`);
      await connection.execute(`CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`Database '${database}' created successfully.`);
    } else {
      console.log(`Database '${database}' already exists.`);
    }

    await connection.end();
    console.log('Database connection closed.');
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  }
}

createDatabase();
