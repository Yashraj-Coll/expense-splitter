require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setup() {
  const dbName = process.env.DB_NAME || 'expense_splitter';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS `' + dbName + '`');
  await conn.query('USE `' + dbName + '`');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await conn.query(sql);
  await conn.end();
  console.log('Database "' + dbName + '" is ready');
}

if (require.main === module) {
  setup().catch((err) => {
    console.log('Setup failed:', err.message);
    process.exit(1);
  });
}

module.exports = setup;
