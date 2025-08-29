// client
// index.js

if (require.main === module) {
  // Run the development server
  const path = require("path");
  const express = require("express");
  const app = express();
  
  // Security headers middleware
  const { securityHeadersMiddleware } = require('./client/src/js/csp-config.js');

  const port = 3000;
  
  // Apply security headers to all responses
  app.use(securityHeadersMiddleware);
  
  app.use(express.static(path.join(__dirname, "client/public")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "client/public", "client.htm"));
  });

  app.listen(port, () => {
    console.log(`Client server listening at http://localhost:${port}`);
    console.log('Security headers including CSP are enabled');
  });
} else {
  // We're called as a module
  module.exports = require('./client');
}