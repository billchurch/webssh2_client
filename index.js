const express = require('express');
const path = require('path');

const app = express();
const port = 3000; // You can change this to any port you prefer

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Client server listening at http://localhost:${port}`);
});