const { Schema } = require("mongoose");

const HoldingsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // Number of shares currently owned
    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    // Weighted average price at which shares were purchased
    avg: {
      type: Number,
      required: true,
      min: 0,
    },

    // Latest market price received from market-data service
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Unrealized P&L percentage
    net: {
      type: Number,
      default: 0,
    },

    // Today's market percentage change
    day: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = { HoldingsSchema };