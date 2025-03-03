// ----- SERVER SIDE CODE -----
// This Express server is used for local development on Replit.
// When deploying to Netlify, you'll configure Netlify to publish your 'public' folder
// and Netlify will serve your static files (index.html, dashboard.html, etc.) directly.
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route for the storefront (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dedicated route for the dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start the Express server (for local testing)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
