const { Schema } = require("mongoose");

const HoldingsSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 0,
    },

    avg: {
      type: Number,
      required: true,
      min: 0,
    },

    // Latest market price.
    // This will be updated from the stock API.
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

    // Today's percentage change
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