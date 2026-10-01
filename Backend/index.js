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
const http = require("http");
const { setupWebSocket } = require("./websocket");

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
    const holdings = await HoldingsModel.find({}).lean();

    if (holdings.length === 0) {
      return res.json([]);
    }

    // ----------------------------------------
    // Get unique stock symbols
    // ----------------------------------------

    const symbols = [
      ...new Set(
        holdings.map((holding) =>
          stockApi.toYahooSymbol(holding.name)
        )
      ),
    ];

    // ----------------------------------------
    // Fetch live prices
    // ----------------------------------------

    const liveStocks =
      await stockApi.getMultipleStocks(symbols);

    // ----------------------------------------
    // Create lookup map
    // ----------------------------------------

    const livePriceMap = new Map();

    liveStocks.forEach((stock) => {
      livePriceMap.set(stock.name, stock);
    });

    // ----------------------------------------
    // Calculate portfolio values
    // ----------------------------------------

    const updatedHoldings = holdings.map((holding) => {
      const liveStock = livePriceMap.get(holding.name);

      const qty = Number(holding.qty) || 0;
      const avg = Number(holding.avg) || 0;

      // If live price isn't available,
      // keep the stored price.
      const currentPrice =
        liveStock?.price != null
          ? Number(liveStock.price)
          : Number(holding.price) || 0;

      // Investment
      const investment = avg * qty;

      // Current market value
      const currentValue =
        currentPrice * qty;

      // Profit / Loss
      const pnl =
        currentValue - investment;

      // Profit / Loss percentage
      const pnlPercent =
        investment > 0
          ? (pnl / investment) * 100
          : 0;

      // Day change
      const dayPercent =
        liveStock?.percent || "0.00%";

      return {
        ...holding,

        // Live data
        price: currentPrice,

        change:
          liveStock?.change || 0,

        previousClose:
          liveStock?.previousClose || 0,

        dayHigh:
          liveStock?.dayHigh || 0,

        dayLow:
          liveStock?.dayLow || 0,

        isDown:
          liveStock?.isDown || false,

        // Portfolio calculations
        investment,

        currentValue,

        pnl,

        pnlPercent,

        // Display values
        net:
          `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`,

        day: dayPercent,
      };
    });

    res.json(updatedHoldings);

  } catch (err) {
    console.error(
      "Error fetching holdings:",
      err
    );

    res.status(500).json({
      error: "Failed to fetch holdings",
    });
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

    const server = http.createServer(app);

    setupWebSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket running on ws://localhost:${PORT}/ws`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });
