const express = require("express");
const pool = require("../database");

const router = express.Router();

const DEFAULT_CATEGORIES = [
    { id: 1, name: "Programming" },
    { id: 2, name: "AI" },
    { id: 3, name: "Data Science" },
    { id: 4, name: "Data Analytics" }
];

async function syncDefaultCategories() {
    try {
        for (const category of DEFAULT_CATEGORIES) {
            await pool.query(
                `INSERT INTO categories (id, name)
                 VALUES ($1, $2)
                 ON CONFLICT (id)
                 DO UPDATE SET name = EXCLUDED.name`,
                [category.id, category.name]
            );
        }
    } catch (error) {
        console.error("Sync default categories error:", error);
    }
}

router.get("/", async (req, res) => {
    try {
        await syncDefaultCategories();

        const result = await pool.query(
            `SELECT id, name
             FROM categories
             ORDER BY id`
        );

        res.json({
            success: true,
            categories: result.rows
        });
    } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to get categories"
        });
    }
});

module.exports = router;
