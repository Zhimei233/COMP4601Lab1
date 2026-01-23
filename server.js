/*
Product structure (from products.json):
{
  id: Number,
  name: String,
  price: Number,
  dimensions: { x: Number, y: Number, z: Number },
  stock: Number
}

Lab1 Required API:
  1) GET  /products?name=...&all=true|inStock=true   (search, can combine params)
  2) POST /products   (create; JSON body: name, price, x, y, z, stock)
  3) GET  /products/:productID           (JSON or HTML)
  4) POST /products/:productID/reviews   (add rating 1-10)
  5) GET  /products/:productID/reviews   (JSON or HTML)

No persistence required (reset on restart).
Teacher style: app.param + verify/add middleware.
*/

const path = require("path");
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Store products as object keyed by ID
let products = {};          // { "0": productObj, ... }
let nextProductID = 0;

// Load products.json into memory, and add reviews=[]
function initProducts() {
  // Important: require caches; but lab is fine since no persistence + single run
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
      reviews: [] // reviews not in file; required by lab
    };

    nextProductID = Math.max(nextProductID, id + 1);
  }
}
initProducts();

// ------------------ Helpers ------------------
function searchProducts(query) {
  const name = (query.name || "").toString().trim().toLowerCase();
  const inStock = String(query.inStock || "").toLowerCase() === "true";
  const all = String(query.all || "").toLowerCase() === "true";

  let arr = Object.values(products);

  if (name) {
    arr = arr.filter(p => (p.name || "").toLowerCase().includes(name));
  }

  // Can combine name + (inStock/all)
  if (inStock) arr = arr.filter(p => Number(p.stock) > 0);
  if (all) { /* include all, no filter */ }

  return arr;
}

// ------------------ Routes ------------------

// Basic web client
app.get("/", (req, res) => {
  res.status(200).render("index");
});

// 1) Search (JSON)
app.get("/products", (req, res) => {
  const results = searchProducts(req.query);
  // return list without reviews (optional)
  const stripped = results.map(({ reviews, ...rest }) => rest);
  res.status(200).json(stripped);
});

// 2) Create product (teacher style: verify + add)
// Accept JSON: name, price, x, y, z, stock  (x/y/z are TOP-LEVEL)
app.post("/products", [verifyProduct, addProduct]);

function verifyProduct(req, res, next) {
  if (!req.body) {
    return res.status(400).send("JSON body required containing name, price, x, y, z, stock.");
  }

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
  if (!Number.isInteger(stock) || stock < 0) return res.status(400).send("Invalid stock (must be integer >= 0).");
  if (![x, y, z].every(v => Number.isFinite(v) && v > 0)) return res.status(400).send("Invalid dimensions x/y/z (must be > 0).");

  // store cleaned values for addProduct
  req.cleanedProduct = { name, price, stock, x, y, z };
  next();
}

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

  // teacher example uses 200
  res.status(200).json(product);
}

// Teacher style: app.param for any :productID usage
app.param("productID", (req, res, next) => {
  const id = String(req.params.productID);
  if (Object.prototype.hasOwnProperty.call(products, id)) {
    req.product = products[id];
    next();
  } else {
    res.status(404).send("Unknown product ID");
  }
});

// 3) View product by ID (JSON or HTML)
app.get("/products/:productID", (req, res) => {
  const p = req.product;

  const avg =
    p.reviews.length === 0
      ? null
      : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

  res.format({
    "application/json": () => res.status(200).json(p),
    "text/html": () => res.status(200).render("product", { product: p, avgRating: avg }),
    default: () => res.status(200).json(p)
  });
});

// 4) Add review (rating 1-10) (teacher style: verify + add)
app.post("/products/:productID/reviews", verifyReview, addReview);

function verifyReview(req, res, next) {
  if (!req.body) {
    return res.status(400).send("JSON body required containing rating (1-10).");
  }
  if (!Object.prototype.hasOwnProperty.call(req.body, "rating")) {
    return res.status(400).send("JSON body required containing rating (1-10).");
  }

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return res.status(400).send("rating must be an integer from 1 to 10.");
  }

  next();
}

function addReview(req, res, next) {
  const review = {
    rating: Number(req.body.rating),
    createdAt: new Date().toISOString()
  };

  req.product.reviews.push(review);
  res.status(200).json(review);
}

// 5) View ONLY reviews (JSON or HTML)
app.get("/products/:productID/reviews", (req, res) => {
  const p = req.product;

  const avg =
    p.reviews.length === 0
      ? null
      : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length;

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
