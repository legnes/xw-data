require('dotenv').config();
const { Pool } = require('pg')

const isProduction = process.env.NODE_ENV === 'production';
const db = new Pool({
  connectionString: isProduction ?
                    process.env.DATABASE_URL :
                    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = {
  isProduction,
  db
};