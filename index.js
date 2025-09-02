// client
// index.js

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  // Run the development server
  const express = await import("express");
  const app = express.default();
  
  // Security headers middleware
  const { securityHeadersMiddleware } = await import('./client/src/js/csp-config.js');

  const port = 3000;
  
  // Apply security headers to all responses
  app.use(securityHeadersMiddleware);
  
  app.use(express.default.static(path.join(__dirname, "client/public")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "client/public", "client.htm"));
  });

  app.listen(port, () => {
    console.log(`Client server listening at http://localhost:${port}`);
    console.log('Security headers including CSP are enabled');
  });
}

// Always export the client module as default
const clientModule = await import('./client/index.js');
export default clientModule.default;