COMP 4601 – Lab 1

Link to the demonstration video:


Group members:
Ziyi Jiang 101266200
Zhimei Li 101258414

# Overview
This project demonstrates the use of Node.js, RESTful API design, and server-side HTML rendering to manage and view products in an e-commerce–style system.
The application supports searching, viewing, and manipulating products, as well as adding and viewing product reviews.  
Data is stored in memory.

# Features
- Search products by name
- Filter products by stock availability
- Create new products via JSON requests
- View a specific product by ID (JSON or HTML)
- Add reviews (ratings from 1–10) to a product
- View reviews for a specific product (JSON or HTML)


# File Descriptions
- server.js  
  Main server file.  
  Defines RESTful routes for products and reviews, handles request validation, and serves JSON or HTML responses.
- products.json 
  Initial product data loaded into memory when the server starts.  
  Each product contains an id, name, price, dimensions, stock, and reviews.
- views/
  Contains Pug templates used to render HTML pages.
  - layout.pug – Base layout shared by all pages  
  - index.pug – Home page  
  - products_list.pug – Displays a list of products  
  - product.pug – Displays a single product and its details  
  - reviews.pug – Displays reviews for a specific product  
- package.json / package-lock.json  
  Project configuration and dependency definitions.


# How to Run the Project

# Prerequisites
- Node.js (v18 or later recommended)

# Steps
1. Navigate to the project directory:
    ```bash
    cd COMP4601LAB1
2. Install dependencies:
    npm install
3. Start the server:
    node server.js
4. Open a browser and visit:
    http://localhost:3000

