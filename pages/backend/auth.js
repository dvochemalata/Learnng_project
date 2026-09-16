const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("./database");

const router = express.Router();

// ==========================================
// USER LOGIN
// ==========================================

router.post("/login", async (req, res) => {

    try {

        const {
            identifier,
            email,
            password
        } = req.body;
        const loginIdentifier = identifier || email;

        const result = await pool.query(
            `SELECT id, name, email, password, role
             FROM users
             WHERE email = $1
                OR ($1 ~ '^[0-9]+$' AND id = $1::BIGINT)`,
            [loginIdentifier]
        );


        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }


        const user = result.rows[0];


        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }


        // Login successful
        res.json({

            success: true,

            message: "Login successful",

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }

        });


    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({

            success: false,

            message: "Server error"

        });

    }

});


// ==========================================
// USER REGISTRATION
// ==========================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // Validate fields
        if (!name || !email || !password) {

            return res.status(400).json({

                success: false,

                message: "All fields are required"

            });

        }


        // Check existing user
        const existingUser = await pool.query(

            `SELECT id
             FROM users
             WHERE email = $1`,

            [email]

        );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({

                success: false,

                message: "Email already registered"

            });

        }


        // Hash password
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        // Create user
        const result = await pool.query(

            `INSERT INTO users
             (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role`,

            [
                name,
                email,
                hashedPassword,
                "user"
            ]

        );


        res.status(201).json({

            success: true,

            message: "Registration successful",

            user: result.rows[0]

        });


    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).json({

            success: false,

            message: "Server error"

        });

    }

});


module.exports = router;

