import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}

export async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
        return response(200, { success: true });
    }

    if (event.httpMethod !== "POST") {
        return response(405, { success: false, message: "Method not allowed" });
    }

    const action = event.path.split("/").pop();
    let input;

    try {
        input = JSON.parse(event.body || "{}");
    } catch {
        return response(400, { success: false, message: "Invalid request body" });
    }

    try {
        if (action === "register") {
            const { name, email, password } = input;

            if (!name || !email || !password) {
                return response(400, { success: false, message: "All fields are required" });
            }

            const existingUser = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

            if (existingUser.rows.length > 0) {
                return response(409, { success: false, message: "Email already registered" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                `INSERT INTO users (name, email, password, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, name, email, role`,
                [name, email, hashedPassword, "user"]
            );

            return response(201, {
                success: true,
                message: "Registration successful",
                user: result.rows[0]
            });
        }

        if (action === "login") {
            const { email, password } = input;
            const result = await pool.query(
                `SELECT id, name, email, password, role
                 FROM users WHERE email = $1`,
                [email]
            );

            if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) {
                return response(401, { success: false, message: "Invalid email or password" });
            }

            const user = result.rows[0];
            return response(200, {
                success: true,
                message: "Login successful",
                user: { id: user.id, name: user.name, email: user.email, role: user.role }
            });
        }

        return response(404, { success: false, message: "Route not found" });
    } catch (error) {
        console.error("Auth function error:", error);
        return response(500, { success: false, message: "Server error" });
    }
}