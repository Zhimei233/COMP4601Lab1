const mongoose = require("mongoose");

// Schema for individual items in an order
const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },   
    price: { type: Number, required: true },  
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

// Schema for orders
const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, unique: true, index: true },
    purchaserName: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);