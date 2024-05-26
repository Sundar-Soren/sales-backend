// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const env = require("dotenv");
env.config();

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());

// MongoDB connection
mongoose
  .connect(process.env.DATABASE)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define MongoDB schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const saleOrderSchema = new mongoose.Schema({
  customer_id: mongoose.Schema.Types.ObjectId,
  items: [
    { sku_id: mongoose.Schema.Types.ObjectId, price: Number, quantity: Number },
  ],
  paid: Boolean,
  invoice_no: String,
  invoice_date: Date,
});

const User = mongoose.model("User", userSchema);
const SaleOrder = mongoose.model("SaleOrder", saleOrderSchema);

// Routes
// Authentication endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username: user.username }, "secretkey");
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid username or password" });
  }
});

// Middleware to authenticate requests
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, "secretkey", (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

// Create sale order endpoint
app.post("/sale-orders", authenticateToken, async (req, res) => {
  try {
    const saleOrder = new SaleOrder(req.body);
    await saleOrder.save();
    res.status(201).json(saleOrder);
  } catch (err) {
    console.error("Error creating sale order:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get active sale orders endpoint
app.get("/sale-orders/active", authenticateToken, async (req, res) => {
  try {
    const activeSaleOrders = await SaleOrder.find({ paid: false });
    res.json(activeSaleOrders);
  } catch (err) {
    console.error("Error fetching active sale orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get completed sale orders endpoint
app.get("/sale-orders/completed", authenticateToken, async (req, res) => {
  try {
    const completedSaleOrders = await SaleOrder.find({ paid: true });
    res.json(completedSaleOrders);
  } catch (err) {
    console.error("Error fetching completed sale orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/", (req, res) => {
  return res.json({ message: "Its working" });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
