const path = require("path");
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve CSS
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Data store
let products = {};
let nextProductID = 0;

// Initialize products from JSON file
function initProducts() {
  const list = require(path.join(__dirname, "products.json"));

  products = {};
  nextProductID = 0;

  for (const p of list) {
    const idNum = Number(p.id);
    const id = Number.isFinite(idNum) ? idNum : nextProductID;

    products[String(id)] = {
      id,
      name: p.name,
      price: Number(p.price),
      dimensions: {
        x: Number(p.dimensions?.x),
        y: Number(p.dimensions?.y),
        z: Number(p.dimensions?.z)
      },
      stock: Number(p.stock),
      reviews: []
    };

    nextProductID = Math.max(nextProductID, id + 1);
  }
}
initProducts();

// searchProducts helper
function searchProducts(query) {
  const name = (query.name || "").toString().trim().toLowerCase();
  const inStock = String(query.inStock || "").toLowerCase() === "true";
  const all = String(query.all || "").toLowerCase() === "true";

  let arr = Object.values(products);

  if (name) arr = arr.filter(p => (p.name || "").toLowerCase().includes(name));
  if (inStock) arr = arr.filter(p => Number(p.stock) > 0);
  if (all) { /* include all */ }

  return arr;
}

// Routes
app.get("/", (req, res) => res.status(200).render("index"));

// List of products
app.get("/products", (req, res) => {
  const results = searchProducts(req.query);
  const stripped = results.map(({ reviews, ...rest }) => rest);

  res.format({
    "application/json": () => res.status(200).json(stripped),
    "text/html": () => res.status(200).render("products_list", { products: stripped, query: req.query }),
    default: () => res.status(200).json(stripped)
  });
});

// Create product (JSON body)
app.post("/products", [verifyProduct, addProduct]);

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

// Add product to data store
function addProduct(req, res, next) {
  const c = req.cleanedProduct;

  const product = {
    id: nextProductID,
    name: c.name,
    price: c.price,
    dimensions: { x: c.x, y: c.y, z: c.z },
    stock: c.stock,
    reviews: []
  };

  products[String(nextProductID)] = product;
  nextProductID++;

  res.status(200).json(product);
}

// param middleware to load product by ID
app.param("productID", (req, res, next) => {
  const id = String(req.params.productID);
  if (Object.prototype.hasOwnProperty.call(products, id)) {
    req.product = products[id];
    next();
  } else {
    res.status(404).send("Unknown product ID");
  }
});

// View product details
app.get("/products/:productID", (req, res) => {
  const p = req.product;
  const avg =
    p.reviews.length === 0 ? null : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

  res.format({
    "application/json": () => res.status(200).json(p),
    "text/html": () => res.status(200).render("product", { product: p, avgRating: avg }),
    default: () => res.status(200).json(p)
  });
});

app.post("/products/:productID/reviews", verifyReview, addReview);

// Middleware to verify review
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

// Middleware to add review
function addReview(req, res, next) {
  const review = { rating: Number(req.body.rating) };
  req.product.reviews.push(review);
  res.status(200).json(review);
}

// List of reviews for a product
app.get("/products/:productID/reviews", (req, res) => {
  const p = req.product;
  const avg =
    p.reviews.length === 0 ? null : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

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

app.listen(3000);
console.log("Server listening at http://localhost:3000");
