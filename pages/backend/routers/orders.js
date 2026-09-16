// backend/routes/orders.js

const express = require("express");
const pool = require("../database");

const router = express.Router();


// ==========================================
// GET ALL ORDERS
// ==========================================

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                o.id,
                o.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                o.total_amount,
                o.status,
                o.created_at
            FROM orders o
            LEFT JOIN users u
                ON o.user_id = u.id
            ORDER BY o.id DESC
        `);

        res.json({
            success: true,
            orders: result.rows
        });

    } catch (error) {

        console.error("Get orders error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to get orders"
        });

    }

});


// ==========================================
// GET ORDER BY ID
// ==========================================

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;


        // Get order information

        const orderResult = await pool.query(`
            SELECT
                o.id,
                o.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                o.total_amount,
                o.status,
                o.created_at
            FROM orders o
            LEFT JOIN users u
                ON o.user_id = u.id
            WHERE o.id = $1
        `, [id]);


        if (orderResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });

        }


        // Get order items

        const itemsResult = await pool.query(`
            SELECT
                oi.id,
                oi.product_id,
                p.name AS product_name,
                oi.quantity,
                oi.price,
                oi.quantity * oi.price AS item_total
            FROM order_items oi
            LEFT JOIN products p
                ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [id]);


        res.json({

            success: true,

            order: orderResult.rows[0],

            items: itemsResult.rows

        });

    } catch (error) {

        console.error("Get order error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to get order"

        });

    }

});


// ==========================================
// CREATE NEW ORDER
// ==========================================

router.post("/", async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            user_id,
            items
        } = req.body;


        /*
            Expected items format:

            [
                {
                    "product_id": 1,
                    "quantity": 2
                },
                {
                    "product_id": 3,
                    "quantity": 1
                }
            ]
        */


        if (!user_id || !Array.isArray(items) || items.length === 0) {

            return res.status(400).json({

                success: false,

                message: "User ID and order items are required"

            });

        }


        await client.query("BEGIN");


        let totalAmount = 0;

        const orderItems = [];


        // ==========================================
        // CHECK PRODUCTS AND CALCULATE TOTAL
        // ==========================================

        for (const item of items) {

            const productResult = await client.query(

                `SELECT id, name, price, stock
                 FROM products
                 WHERE id = $1
                 FOR UPDATE`,

                [item.product_id]

            );


            if (productResult.rows.length === 0) {

                throw new Error(
                    `Product ${item.product_id} not found`
                );

            }


            const product = productResult.rows[0];

            const quantity = Number(item.quantity);


            if (!Number.isInteger(quantity) || quantity <= 0) {

                throw new Error(
                    `Invalid quantity for product ${product.id}`
                );

            }


            if (product.stock < quantity) {

                throw new Error(
                    `Insufficient stock for ${product.name}`
                );

            }


            const itemTotal =
                Number(product.price) * quantity;


            totalAmount += itemTotal;


            orderItems.push({

                product_id: product.id,

                quantity: quantity,

                price: product.price

            });

        }


        // ==========================================
        // CREATE ORDER
        // ==========================================

        const orderResult = await client.query(

            `INSERT INTO orders
             (user_id, total_amount, status)
             VALUES ($1, $2, $3)
             RETURNING *`,

            [
                user_id,
                totalAmount,
                "Pending"
            ]

        );


        const order = orderResult.rows[0];


        // ==========================================
        // CREATE ORDER ITEMS
        // AND REDUCE STOCK
        // ==========================================

        for (const item of orderItems) {

            await client.query(

                `INSERT INTO order_items
                 (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,

                [
                    order.id,
                    item.product_id,
                    item.quantity,
                    item.price
                ]

            );


            await client.query(

                `UPDATE products
                 SET stock = stock - $1
                 WHERE id = $2`,

                [
                    item.quantity,
                    item.product_id
                ]

            );

        }


        await client.query("COMMIT");


        res.status(201).json({

            success: true,

            message: "Order created successfully",

            order: order

        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error("Create order error:", error);

        res.status(500).json({

            success: false,

            message: error.message || "Unable to create order"

        });

    } finally {

        client.release();

    }

});


// ==========================================
// UPDATE ORDER STATUS
// ==========================================

router.put("/:id/status", async (req, res) => {

    try {

        const { id } = req.params;

        const { status } = req.body;


        const allowedStatuses = [

            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled"

        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message: "Invalid order status"

            });

        }


        const result = await pool.query(

            `UPDATE orders
             SET status = $1
             WHERE id = $2
             RETURNING *`,

            [
                status,
                id
            ]

        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }


        res.json({

            success: true,

            message: "Order status updated successfully",

            order: result.rows[0]

        });

    } catch (error) {

        console.error("Update order status error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to update order status"

        });

    }

});


// ==========================================
// DELETE ORDER
// ==========================================

router.delete("/:id", async (req, res) => {

    const client = await pool.connect();

    try {

        const { id } = req.params;


        await client.query("BEGIN");


        // Delete order items first

        await client.query(

            `DELETE FROM order_items
             WHERE order_id = $1`,

            [id]

        );


        // Delete order

        const result = await client.query(

            `DELETE FROM orders
             WHERE id = $1
             RETURNING *`,

            [id]

        );


        if (result.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({

                success: false,

                message: "Order not found"

            });

        }


        await client.query("COMMIT");


        res.json({

            success: true,

            message: "Order deleted successfully",

            order: result.rows[0]

        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error("Delete order error:", error);

        res.status(500).json({

            success: false,

            message: "Unable to delete order"

        });

    } finally {

        client.release();

    }

});


module.exports = router;

