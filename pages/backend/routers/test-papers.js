const express = require("express");
const multer = require("multer");
const pool = require("../database");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (request, file, callback) => {
        if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
            callback(null, true);
            return;
        }

        callback(new Error("Only PDF files are allowed."));
    }
});

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS test_papers (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(120) NOT NULL,
            difficulty VARCHAR(30) NOT NULL,
            duration INTEGER NOT NULL CHECK (duration > 0),
            questions INTEGER NOT NULL CHECK (questions > 0),
            description TEXT,
            pdf_name VARCHAR(255) NOT NULL,
            pdf_data BYTEA NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

router.get("/", async (request, response) => {
    try {
        await ensureTable();
        const result = await pool.query(`
            SELECT id, name, category, difficulty, duration, questions,
                   description, pdf_name, created_at
            FROM test_papers
            ORDER BY created_at DESC, id DESC
        `);

        response.json({
            success: true,
            testPapers: result.rows.map(paper => ({
                ...paper,
                pdfUrl: `/api/test-papers/${paper.id}/pdf`
            }))
        });
    } catch (error) {
        console.error("Get test papers error:", error.message);
        response.status(500).json({ success: false, message: "Failed to load test papers." });
    }
});

router.post("/", upload.single("pdf"), async (request, response) => {
    try {
        const { name, category, difficulty, duration, questions, description } = request.body;

        if (!name || !category || !difficulty || !duration || !questions || !request.file) {
            return response.status(400).json({
                success: false,
                message: "Name, category, difficulty, duration, questions, and a PDF are required."
            });
        }

        await ensureTable();
        const result = await pool.query(`
            INSERT INTO test_papers
                (name, category, difficulty, duration, questions, description, pdf_name, pdf_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, category, difficulty, duration, questions,
                      description, pdf_name, created_at
        `, [
            name.trim(),
            category.trim(),
            difficulty.trim(),
            Number(duration),
            Number(questions),
            description ? description.trim() : null,
            request.file.originalname,
            request.file.buffer
        ]);

        const paper = result.rows[0];
        response.status(201).json({
            success: true,
            testPaper: { ...paper, pdfUrl: `/api/test-papers/${paper.id}/pdf` }
        });
    } catch (error) {
        console.error("Create test paper error:", error.message);
        response.status(500).json({ success: false, message: "Failed to create test paper." });
    }
});

router.get("/:id/pdf", async (request, response) => {
    try {
        const result = await pool.query(
            "SELECT pdf_name, pdf_data FROM test_papers WHERE id = $1",
            [request.params.id]
        );

        if (!result.rows.length) {
            return response.status(404).send("PDF not found.");
        }

        response.type("application/pdf");
        response.setHeader("Content-Disposition", `inline; filename="${result.rows[0].pdf_name.replace(/"/g, "")}"`);
        response.send(result.rows[0].pdf_data);
    } catch (error) {
        console.error("Get test paper PDF error:", error.message);
        response.status(500).send("Failed to load PDF.");
    }
});

router.delete("/:id", async (request, response) => {
    try {
        await ensureTable();
        const result = await pool.query("DELETE FROM test_papers WHERE id = $1 RETURNING id", [request.params.id]);

        if (!result.rows.length) {
            return response.status(404).json({ success: false, message: "Test paper not found." });
        }

        response.json({ success: true, message: "Test paper deleted successfully." });
    } catch (error) {
        console.error("Delete test paper error:", error.message);
        response.status(500).json({ success: false, message: "Failed to delete test paper." });
    }
});

router.use((error, request, response, next) => {
    if (error instanceof multer.MulterError || error.message === "Only PDF files are allowed.") {
        return response.status(400).json({ success: false, message: error.message });
    }

    next(error);
});

module.exports = router;