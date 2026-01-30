const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 10 }
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema({
  // 为了兼容你 Lab1 的 /products/:id（数字ID），保留 numeric id 字段
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  dimensions: {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    z: { type: Number, required: true, min: 0 }
  },
  stock: { type: Number, required: true, min: 0 },
  reviews: { type: [ReviewSchema], default: [] }
});

module.exports = mongoose.model("Product", ProductSchema);