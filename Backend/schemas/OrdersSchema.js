const { Schema } = require("mongoose");

const OrdersSchema = new Schema(
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
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    mode: {
      type: String,
      required: true,
      enum: ["BUY", "SELL"],
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["EXECUTED", "REJECTED"],
      default: "EXECUTED",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = { OrdersSchema };