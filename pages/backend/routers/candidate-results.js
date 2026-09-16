const express = require("express");
const pool = require("../database");

const router = express.Router();

async function ensureTable() {
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

router.get("/", async (request, response) => {
    try {
        await ensureTable();
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
        response.json({ success: true, results: result.rows });
    } catch (error) {
        console.error("Get candidate results error:", error.message);
        response.status(500).json({ success: false, message: "Failed to load candidate results." });
    }
});

router.post("/", async (request, response) => {
    try {
        const { userId, candidateName, testPaperId, testPaperName, marks, totalMarks } = request.body;
        const numericMarks = Number(marks);
        const numericTotalMarks = Number(totalMarks);

        if (!candidateName || !testPaperName || !numericTotalMarks || Number.isNaN(numericMarks)) {
            return response.status(400).json({
                success: false,
                message: "Candidate name, paper name, marks, and total marks are required."
            });
        }

        await ensureTable();
        const percentage = Number(((numericMarks / numericTotalMarks) * 100).toFixed(2));
        const result = await pool.query(`
            INSERT INTO candidate_results
                (user_id, candidate_name, test_paper_id, test_paper_name, marks, total_marks, percentage)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, user_id, candidate_name, test_paper_id, test_paper_name,
                      marks, total_marks, percentage, created_at
        `, [
            userId || null,
            candidateName.trim(),
            testPaperId || null,
            testPaperName.trim(),
            numericMarks,
            numericTotalMarks,
            percentage
        ]);

        response.status(201).json({ success: true, result: result.rows[0] });
    } catch (error) {
        console.error("Save candidate result error:", error.message);
        response.status(500).json({ success: false, message: "Failed to save candidate result." });
    }
});

module.exports = router;