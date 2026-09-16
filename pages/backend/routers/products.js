// backend/routes/products.js

const express = require("express");
const pool = require("../database");

const router = express.Router();


// ==========================================
// GET ALL PRODUCTS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             ORDER BY p.id DESC`
        );

        res.json({
            success: true,
            products: result.rows
        });

    } catch (error) {

        console.error("Get products error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to get products"
        });

    }

});
    module.exports = router;
// ==========================================
// GET PRODUCT BY ID
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM products
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.json({
            success: true,
            product: result.rows[0]
        });

    } catch (error) {

        console.error("Get product error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to get product"
        });

    }

});


// ==========================================
// ADD PRODUCT
// ==========================================

router.post("/", async (req, res) => {

    try {

        const {
            name,
            category_id,
            price,
            stock,
            image,
            description
        } = req.body;


        if (!name || !category_id || price === undefined || stock === undefined) {

            return res.status(400).json({
                success: false,
                message: "Name, category, price and stock are required"
            });

        }


        const result = await pool.query(

            `INSERT INTO products
             (name, category_id, price, stock, image, description)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,

            [
                name,
                category_id,
                price,
                stock,
                image || null,
                description || null
            ]

        );


        res.status(201).json({

            success: true,

            message: "Product added successfully",

            product: result.rows[0]

        });

    } catch (error) {

        console.error("Add product error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to add product"

        });

    }

});


// ==========================================
// UPDATE PRODUCT
// ==========================================

router.put("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            category_id,
            price,
            stock,
            image,
            description
        } = req.body;


        if (!name || !category_id || price === undefined || stock === undefined) {

            return res.status(400).json({

                success: false,

                message: "Name, category, price and stock are required"

            });

        }


        const result = await pool.query(

            `UPDATE products

             SET name = $1,
                 category_id = $2,
                 price = $3,
                 stock = $4,
                 image = $5,
                 description = $6

             WHERE id = $7

             RETURNING *`,

            [
                name,
                category_id,
                price,
                stock,
                image || null,
                description || null,
                id
            ]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }


        res.json({

            success: true,

            message: "Product updated successfully",

            product: result.rows[0]

        });

    } catch (error) {

        console.error("Update product error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to update product"

        });

    }

});


// ==========================================
// DELETE PRODUCT
// ==========================================

router.delete("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const result = await pool.query(

            `DELETE FROM products

             WHERE id = $1

             RETURNING *`,

            [id]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Product not found"

            });

        }


        res.json({

            success: true,

            message: "Product deleted successfully",

            product: result.rows[0]

        });

    } catch (error) {

        console.error("Delete product error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to delete product"

        });

    }

});


module.exports = router;

