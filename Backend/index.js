require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");
const stockApi = require("./services/stockApi");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

/* =========================
   ROOT & HEALTH ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("Stock Backend API is running 🚀");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* =========================
   STOCK ROUTES
========================= */

// Fetch live stock price
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const yahooSymbol = stockApi.toYahooSymbol(symbol);
    const stockData = await stockApi.getStockPrice(yahooSymbol);
    res.json(stockData);
  } catch (error) {
    console.error("Error fetching stock:", error);
    res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

// app.get("/api/stock/:symbol", async (req, res) => {
//   try {
//     const { symbol } = req.params;
//     const yahooSymbol = stockApi.toYahooSymbol(symbol);

//     console.time(`yahoo-fetch-${symbol}`);
//     const stockData = await stockApi.getStockPrice(yahooSymbol);
//     console.timeEnd(`yahoo-fetch-${symbol}`);

//     res.json(stockData);
//   } catch (error) {
//     console.error("Error fetching stock:", error);
//     res.status(500).json({ error: "Failed to fetch stock data" });
//   }
// });

// Fetch multiple stocks in batch
app.get("/api/stocks/batch", async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({ error: "symbols query parameter required" });
    }

    const symbolArray = symbols
      .split(",")
      .map((s) => stockApi.toYahooSymbol(s.trim()));

    const stocksData = await stockApi.getMultipleStocks(symbolArray);
    res.json(stocksData);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Failed to fetch stocks data" });
  }
});

/* =========================
   HOLDINGS & POSITIONS
========================= */

// Fetch holdings
app.get("/allHoldings", async (req, res) => {
  try {
    const allHoldings = await HoldingsModel.find({});
    res.json(allHoldings);
  } catch (err) {
    console.error("Error fetching holdings:", err);
    res.status(500).json({ error: "Failed to fetch holdings" });
  }
});

// Fetch positions
app.get("/allPositions", async (req, res) => {
  try {
    const allPositions = await PositionsModel.find({});
    res.json(allPositions);
  } catch (err) {
    console.error("Error fetching positions:", err);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

/* =========================
   ORDERS
========================= */

// Place new order
app.post("/newOrder", async (req, res) => {
  try {
    let { name, qty, price, mode } = req.body;

    // Normalize input
    name = String(name || "").trim().toUpperCase();
    qty = Number(qty);
    price = Number(price);
    mode = String(mode || "").trim().toUpperCase();

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!name) {
      return res.status(400).json({
        error: "Stock symbol is required",
      });
    }

    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return res.status(400).json({
        error: "Quantity must be a positive whole number",
      });
    }

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        error: "Price must be greater than 0",
      });
    }

    if (!["BUY", "SELL"].includes(mode)) {
      return res.status(400).json({
        error: "Order mode must be BUY or SELL",
      });
    }

    // -----------------------------
    // BUY
    // -----------------------------

    if (mode === "BUY") {
      const holding = await HoldingsModel.findOne({ name });

      if (holding) {
        const oldQty = holding.qty;
        const oldAvg = holding.avg;

        const newQty = oldQty + qty;

        const totalInvestment =
          oldQty * oldAvg + qty * price;

        const newAveragePrice =
          totalInvestment / newQty;

        holding.qty = newQty;
        holding.avg = newAveragePrice;

        // For now this is the latest traded price.
        // We'll improve live-price handling next.
        holding.price = price;

        await holding.save();
      } else {
        const newHolding = new HoldingsModel({
          name,
          qty,
          avg: price,
          price,
          net: 0,
          day: 0,
        });

        await newHolding.save();
      }
    }

    // -----------------------------
    // SELL
    // -----------------------------

    if (mode === "SELL") {
      const holding = await HoldingsModel.findOne({ name });

      if (!holding) {
        return res.status(400).json({
          error: `You don't own any ${name} shares`,
        });
      }

      if (qty > holding.qty) {
        return res.status(400).json({
          error: `You only own ${holding.qty} shares of ${name}`,
        });
      }

      holding.qty -= qty;

      if (holding.qty === 0) {
        await HoldingsModel.deleteOne({
          _id: holding._id,
        });
      } else {
        await holding.save();
      }
    }

    // -----------------------------
    // SAVE ORDER
    // -----------------------------

    const newOrder = new OrdersModel({
      name,
      qty,
      price,
      mode,
      status: "EXECUTED",
    });

    await newOrder.save();

    res.status(201).json({
      message: "Order executed successfully",
      order: newOrder,
    });
  } catch (err) {
    console.error("Error processing order:", err);

    res.status(500).json({
      error: "Failed to process order",
    });
  }
});

// Fetch all orders
app.get("/allOrders", async (req, res) => {
  try {
    const orders = await OrdersModel.find();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/* =========================
   DATABASE CONNECTION
========================= */

mongoose
  .connect(uri)
  .then(() => {
    console.log("DB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });
