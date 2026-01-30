const path = require("path");
const express = require("express");
const mongoose = require("mongoose");

const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// MongoDB connection URL
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/comp4601lab2";

// seed products.json if DB empty
async function seedIfEmpty() {
  const count = await Product.countDocuments();
  if (count > 0) return;

  const list = require(path.join(__dirname, "products.json"));
  const docs = list.map((p, idx) => ({
    id: Number.isFinite(Number(p.id)) ? Number(p.id) : idx,
    name: p.name,
    price: Number(p.price),
    dimensions: {
      x: Number(p.dimensions?.x),
      y: Number(p.dimensions?.y),
      z: Number(p.dimensions?.z)
    },
    stock: Number(p.stock),
    reviews: [] // ratings from 1 to 10
  }));

  await Product.insertMany(docs);
  console.log(`Seeded ${docs.length} products`);
}

async function getNextProductId() {
  const last = await Product.findOne({}, { id: 1 }).sort({ id: -1 }).lean();
  return last ? last.id + 1 : 0;
}

// Helpers to load product by :productID param
async function loadProductOr404(req, res, next) {
  const id = Number(req.params.productID);
  if (!Number.isInteger(id)) return res.status(404).send("Unknown product ID");

  const p = await Product.findOne({ id }).lean();
  if (!p) return res.status(404).send("Unknown product ID");

  req.product = p;
  next();
}

// page routes
app.get("/", (req, res) => res.status(200).render("index"));
app.get("/about", (req, res) => res.status(200).render("about"));

// products routes
// Search products (default all, inStock=true filters)
app.get("/products", async (req, res) => {
  const name = (req.query.name || "").toString().trim();
  const inStock = String(req.query.inStock || "").toLowerCase() === "true";

  const filter = {};
  if (name) filter.name = { $regex: name, $options: "i" };
  if (inStock) filter.stock = { $gt: 0 };

  const results = await Product.find(filter, { _id: 0, reviews: 0 }).sort({ id: 1 }).lean();

  res.format({
    "application/json": () => res.status(200).json(results),
    "text/html": () => res.status(200).render("products_list", { products: results, query: req.query }),
    default: () => res.status(200).json(results)
  });
});

// Create product
app.post("/products", verifyProduct, async (req, res) => {
  const nextId = await getNextProductId();
  const c = req.cleanedProduct;

  const product = await Product.create({
    id: nextId,
    name: c.name,
    price: c.price,
    dimensions: { x: c.x, y: c.y, z: c.z },
    stock: c.stock,
    reviews: []
  });

  res.status(200).json(product);
});

// View product details (JSON/HTML)
app.get("/products/:productID", loadProductOr404, (req, res) => {
  const p = req.product;
  const avg = p.reviews.length === 0 ? null : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

  res.format({
    "application/json": () => res.status(200).json(p),
    "text/html": () => res.status(200).render("product", { product: p, avgRating: avg }),
    default: () => res.status(200).json(p)
  });
});

// Add review (rating 1-10) for product
app.post("/products/:productID/reviews", loadProductOr404, verifyReview, async (req, res) => {
  const id = Number(req.params.productID);
  const rating = Number(req.body.rating);

  await Product.updateOne({ id }, { $push: { reviews: { rating } } });
  res.status(200).json({ rating });
});

// List reviews (JSON/HTML)
app.get("/products/:productID/reviews", loadProductOr404, (req, res) => {
  const p = req.product;
  const avg = p.reviews.length === 0 ? null : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

  res.format({
    "application/json": () => res.status(200).json(p.reviews),
    "text/html": () =>
      res.status(200).render("reviews", {
        productId: p.id,
        productName: p.name,
        reviews: p.reviews,
        avgRating: avg
      }),
    default: () => res.status(200).json(p.reviews)
  });
});

// Orders
// create order
app.post("/orders", async (req, res) => {
  const issues = [];

  // order body validation
  const purchaserName = String(req.body?.purchaserName || "").trim();
  const items = req.body?.items;

  if (!purchaserName) issues.push({ type: "MISSING_NAME" });
  if (!Array.isArray(items) || items.length === 0) issues.push({ type: "EMPTY_ITEMS" });

  if (issues.length > 0) return res.status(409).json({ error: "Order invalid", issues });

  // items validation
  const normalized = items.map(it => ({
    productId: Number(it.productId),
    quantity: Number(it.quantity)
  }));

  // check item fields
  for (const it of normalized) {
    if (!Number.isInteger(it.productId)) issues.push({ type: "BAD_PRODUCT_ID", productId: it.productId });
    if (!Number.isInteger(it.quantity) || it.quantity < 1)
      issues.push({ type: "BAD_QUANTITY", productId: it.productId, quantity: it.quantity });
  }
  if (issues.length > 0) return res.status(409).json({ error: "Order invalid", issues });

  const ids = normalized.map(x => x.productId);
  const prodDocs = await Product.find({ id: { $in: ids } }).lean();
  const prodMap = new Map(prodDocs.map(p => [p.id, p]));

   // check products exist
  for (const it of normalized) {
    if (!prodMap.has(it.productId)) issues.push({ type: "PRODUCT_NOT_FOUND", productId: it.productId });
  }
  if (issues.length > 0) return res.status(409).json({ error: "Order invalid", issues });

  // check stock availability
  for (const it of normalized) {
    const p = prodMap.get(it.productId);
    if (p.stock < it.quantity) {
      issues.push({ type: "INSUFFICIENT_STOCK", productId: it.productId, requested: it.quantity, available: p.stock });
    }
  }
  if (issues.length > 0) return res.status(409).json({ error: "Order invalid", issues });

  // Deduct stock safely
  const applied = [];
  try {
    for (const it of normalized) {
      const result = await Product.updateOne(
        { id: it.productId, stock: { $gte: it.quantity } },
        { $inc: { stock: -it.quantity } }
      );
      if (result.modifiedCount !== 1) throw new Error("Concurrent stock change");
      applied.push(it);
    }

    // create order
    const orderItems = normalized.map(it => {
      const p = prodMap.get(it.productId);
      return { productId: p.id, name: p.name, price: p.price, quantity: it.quantity };
    });

    const last = await Order.findOne({}, { orderNumber: 1 }).sort({ orderNumber: -1 }).lean();
    const nextOrderNumber = last ? last.orderNumber + 1 : 1;

    const order = await Order.create({ orderNumber: nextOrderNumber, purchaserName, items: orderItems });
    return res.status(201).json({ orderNumber: order.orderNumber, link: `/orders/${order._id}` });
  } catch (e) {
    for (const it of applied) {
      await Product.updateOne({ id: it.productId }, { $inc: { stock: it.quantity } });
    }
    return res.status(409).json({ error: "Order invalid", issues: [{ type: "INSUFFICIENT_STOCK_OR_CONCURRENT_UPDATE" }] });
  }
});

// List orders summary
app.get("/orders", async (req, res) => {
  const orders = await Order.find(
    {},
    { orderNumber: 1, purchaserName: 1, createdAt: 1 }
  )
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(
    orders.map(o => ({
      orderNumber: o.orderNumber,
      purchaserName: o.purchaserName,
      createdAt: o.createdAt,
      link: `/orders/${o._id}`
    }))
  );
});

// get order details
app.get("/orders/:orderID", async (req, res) => {
  const id = req.params.orderID;
  if (!mongoose.isValidObjectId(id)) return res.status(404).send("Unknown order ID");

  const order = await Order.findById(id).lean();
  if (!order) return res.status(404).send("Unknown order ID");

  const items = (order.items || []).map(it => ({
    productId: it.productId,
    name: it.name,
    price: it.price,
    quantity: it.quantity,
    lineTotal: it.price * it.quantity,
    productLink: `/products/${it.productId}`
  }));
  const total = items.reduce((s, x) => s + x.lineTotal, 0);

  res.status(200).json({
    orderNumber: order.orderNumber,      
    purchaserName: order.purchaserName,
    createdAt: order.createdAt,
    items,
    total
  });
});

// Orders page (HTML)
app.get("/orders-page", async (req, res) => {
  const products = await Product.find(
    {},
    { _id: 0, id: 1, name: 1, price: 1, stock: 1 }
  )
    .sort({ id: 1 })
    .lean();

  res.status(200).render("orders_page", { products });
});

// Validation middleware
function verifyProduct(req, res, next) {
  if (!req.body) return res.status(400).send("JSON body required containing name, price, x, y, z, stock.");

  const required = ["name", "price", "x", "y", "z", "stock"];
  for (const k of required) {
    if (!Object.prototype.hasOwnProperty.call(req.body, k)) {
      return res.status(400).send("JSON body required containing name, price, x, y, z, stock.");
    }
  }

  const name = String(req.body.name || "").trim();
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const x = Number(req.body.x);
  const y = Number(req.body.y);
  const z = Number(req.body.z);

  if (!name) return res.status(400).send("Invalid name.");
  if (!Number.isFinite(price) || price < 0) return res.status(400).send("Invalid price.");
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).send("Invalid stock (integer >= 0).");
  if (![x, y, z].every(v => Number.isFinite(v) && v > 0)) {
    return res.status(400).send("Invalid x/y/z (must be > 0).");
  }

  req.cleanedProduct = { name, price, stock, x, y, z };
  next();
}

// rating 1-10 validation middleware
function verifyReview(req, res, next) {
  if (!req.body) return res.status(400).send("JSON body required containing rating (1-10).");
  if (!Object.prototype.hasOwnProperty.call(req.body, "rating")) {
    return res.status(400).send("JSON body required containing rating (1-10).");
  }

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return res.status(400).send("rating must be an integer from 1 to 10.");
  }
  next();
}

// Start
(async () => {
  await mongoose.connect(MONGO_URL);
  console.log("Mongo connected:", MONGO_URL);
  await seedIfEmpty();

  app.listen(3000);
  console.log("Server listening at http://localhost:3000");
})();
