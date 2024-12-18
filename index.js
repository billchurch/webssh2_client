// client
// index.js
// another change

if (require.main === module) {
  // Run the development server
  const path = require("path");
  const express = require("express");
  const app = express();

  const port = 3000;
  app.use(express.static(path.join(__dirname, "client/public")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "client/public", "client.htm"));
  });

  app.listen(port, () => {
    console.log(`Client server listening at http://localhost:${port}`);
  });
} else {
  // We're called as a module
  module.exports = require('./client');
}