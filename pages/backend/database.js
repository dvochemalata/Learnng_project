
const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool(
    config.databaseUrl
        ? {
              connectionString: config.databaseUrl,
              ssl: { rejectUnauthorized: false }
          }
        : {
              host: config.database.host,
              port: config.database.port,
              database: config.database.database,
              user: config.database.user,
              password: config.database.password,
              ssl: config.database.ssl ? { rejectUnauthorized: false } : false
          }
);

// Test database connection
pool.connect()
    .then(client => {
        console.log("PostgreSQL database connected successfully!");

        client.release();
    })
    .catch(error => {
        console.error("PostgreSQL connection failed:");
        console.error(error.message);
    });

// Export pool
module.exports = pool;

