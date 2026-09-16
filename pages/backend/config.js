
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const config = {
    databaseUrl: process.env.DATABASE_URL,
    database: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || "ecommerce_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        ssl: process.env.DB_SSL === "true"
    },

    server: {
        port: process.env.PORT || 5000
    }
};

module.exports = config;

