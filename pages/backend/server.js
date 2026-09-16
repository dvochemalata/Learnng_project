const express = require("express");
const config = require("./config");

const authRouter = require("./auth");
const usersRouter = require("./routers/users");
const categoriesRouter = require("./routers/categories");
const productsRouter = require("./routers/products");
const ordersRouter = require("./routers/orders");
const testPapersRouter = require("./routers/test-papers");
const candidateResultsRouter = require("./routers/candidate-results");

const app = express();
const PORT = config.server.port;

app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Atlas backend is running",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/test-papers", testPapersRouter);
app.use("/api/candidate-results", candidateResultsRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.listen(PORT, () => {
    console.log(`Atlas backend running on http://localhost:${PORT}`);
});
