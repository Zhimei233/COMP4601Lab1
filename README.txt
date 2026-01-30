COMP 4601 – Lab 2

Link to the demonstration video:
Lab1：https://drive.google.com/file/d/17B1mVuCJi3b2ZFLCOb8z4P4JXhNqBLPn/view?usp=sharing
Lab2: https://drive.google.com/file/d/1tNVJeaI6bq7pzCBZpIx_fkjBm6BvRlLI/view?usp=sharing

Group members:
Ziyi Jiang 101266200
Zhimei Li 101258414

# Overview
This project demonstrates the use of Node.js, MongoDB, RESTful API design, 
and server-side HTML rendering with Pug to build an e commerce style web application.

# Features
- Search products by name
- Filter products by stock availability
- Create new products via JSON requests
- View a specific product by ID (JSON or HTML)
- Add reviews (ratings from 1–10) to a product
- View reviews for a specific product (JSON or HTML)
- Create a new order using a JSON request
- Validate product availability and stock levels
- Automatically update product stock when an order is created
- View a list of orders
- View details for a specific order


# File Descriptions
- server.js  
  Main server file.  
  Defines RESTful routes for products, reviews, and orders.
  Connects to MongoDB, performs validation, and returns JSON or HTML responses.
- models/
  - Products.js: Defines the product schema and embedded reviews
  - Order.js: Defines the order schema and ordered items
- products.json
  Initial product data used to seed the database when it is empty.
- public/
  styles.css: The styles for the webside.
- views/
  Contains Pug templates used to render HTML pages.
  - layout.pug: Base layout shared by all pages  
  - index.pug: Home page  
  - products_list.pug: Displays a list of products  
  - product.pug: Displays a single product and its details  
  - reviews.pug: Displays reviews for a specific product 
  - orders_page.pug: Page used to create and view orders
- package.json / package-lock.json  
  Project configuration and dependency definitions.


# How to Run the Project

# Prerequisites
- Node.js (v18 or later recommended)
- MongoDB installed and running locally

# Steps
1. Navigate to the project directory:
    cd COMP4601LAB1
2. Install dependencies:
    npm install
    //make sure you have mongoDB installed: Get-Service *mongo*
    npm i mongoose
3. Start the server:
    node server.js
    or
    npm run dev
4. Open a browser and visit:
    http://localhost:3000

