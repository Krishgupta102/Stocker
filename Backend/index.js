require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Fetch holdings
app.get("/allHoldings", async (req, res) => {
  let allHoldings = await HoldingsModel.find({});
  res.json(allHoldings);
});

// Fetch positions
app.get("/allPositions", async (req, res) => {
  let allPositions = await PositionsModel.find({});
  res.json(allPositions);
});

// ✅ Place a new order (BUY or SELL)
app.post("/newOrder", async (req, res) => {
  const { name, qty, price, mode } = req.body;

  try {
    // Save order in Orders collection
    const newOrder = new OrdersModel({
      name,
      qty,
      price,
      mode,
    });
    await newOrder.save();

    // BUY functionality
    if (mode === "BUY") {
      let holding = await HoldingsModel.findOne({ name });

      if (holding) {
        // Update existing holding (avg price recalculated)
        const totalCost =
          holding.avg * holding.qty + parseFloat(price) * parseInt(qty);
        const newQty = holding.qty + parseInt(qty);
        holding.avg = totalCost / newQty;
        holding.qty = newQty;
        holding.price = price; // latest market price
        await holding.save();
      } else {
        // Create new holding
        const newHolding = new HoldingsModel({
          name,
          qty,
          avg: price,
          price,
          net: "0%",
          day: "0%",
        });
        await newHolding.save();
      }
    }

    // SELL functionality
    else if (mode === "SELL") {
      let holding = await HoldingsModel.findOne({ name });

      if (!holding) {
        return res
          .status(400)
          .json({ error: "You don’t have this stock in holdings" });
      }

      if (holding.qty < qty) {
        return res
          .status(400)
          .json({ error: "Not enough quantity to sell" });
      }

      // Reduce qty
      holding.qty -= parseInt(qty);

      if (holding.qty === 0) {
        // Remove holding completely if no qty left
        await HoldingsModel.deleteOne({ _id: holding._id });
      } else {
        await holding.save();
      }
    }

    res.json({ message: "Order executed successfully" });
  } catch (err) {
    console.error("Error processing order:", err);
    res.status(500).json({ error: "Failed to process order" });
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

app.listen(PORT, () => {
  console.log("App started!");
  mongoose.connect(uri);
  console.log("DB started!");
});
