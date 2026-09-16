import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    };
}

function getEndpoint(event) {
    return event.path
        .replace(/^.*\/\.netlify\/functions\/api\/?/, "")
        .replace(/^\/api\/?/, "")
        .replace(/^\/+|\/+$/g, "");
}

async function ensureResultsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS candidate_results (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
            candidate_name VARCHAR(200) NOT NULL,
            test_paper_id BIGINT REFERENCES test_papers(id) ON UPDATE CASCADE ON DELETE SET NULL,
            test_paper_name VARCHAR(200) NOT NULL,
            marks INTEGER NOT NULL CHECK (marks >= 0),
            total_marks INTEGER NOT NULL CHECK (total_marks > 0),
            percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        ALTER TABLE candidate_results
        ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
    `);
}

export async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
        return jsonResponse(200, { success: true });
    }

    try {
        const endpoint = getEndpoint(event);
        const userMatch = endpoint.match(/^users\/(\d+)$/);

        if (event.httpMethod === "GET" && endpoint === "users") {
            const result = await pool.query(`
                SELECT id, name, email, role, created_at
                FROM users
                ORDER BY id DESC
            `);
            return jsonResponse(200, { success: true, users: result.rows });
        }

        if (event.httpMethod === "GET" && userMatch) {
            const result = await pool.query(`
                SELECT id, name, email, role, created_at
                FROM users
                WHERE id = $1
            `, [userMatch[1]]);

            if (!result.rows.length) {
                return jsonResponse(404, { success: false, message: "User not found" });
            }

            return jsonResponse(200, { success: true, user: result.rows[0] });
        }

        if (event.httpMethod === "GET" && endpoint === "candidate-results") {
            await ensureResultsTable();
            const result = await pool.query(`
                SELECT candidate_results.id, candidate_results.user_id,
                    candidate_results.candidate_name, candidate_results.test_paper_id,
                    candidate_results.test_paper_name, candidate_results.marks,
                    candidate_results.total_marks, candidate_results.percentage,
                    candidate_results.created_at
                FROM candidate_results
                INNER JOIN users ON users.id = candidate_results.user_id
                ORDER BY candidate_results.created_at DESC, candidate_results.id DESC
            `);
            return jsonResponse(200, { success: true, results: result.rows });
        }

        return jsonResponse(404, { success: false, message: "Route not found" });
    } catch (error) {
        console.error("API function error:", error);
        return jsonResponse(500, { success: false, message: "Unable to load candidate data" });
    }
}