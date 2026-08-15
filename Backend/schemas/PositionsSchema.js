const { Schema } = require("mongoose");

const PositionsSchema = new Schema(
  {
    product: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    qty: {
      type: Number,
      required: true,
    },

    avg: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    net: {
      type: Number,
      default: 0,
    },

    day: {
      type: Number,
      default: 0,
    },

    isLoss: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = { PositionsSchema };