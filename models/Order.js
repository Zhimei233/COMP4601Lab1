const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },   // snapshot
    price: { type: Number, required: true },  // snapshot
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, unique: true, index: true },
    purchaserName: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);