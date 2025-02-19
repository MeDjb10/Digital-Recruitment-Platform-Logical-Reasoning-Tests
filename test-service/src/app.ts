const express = require('express');
const bodyParser = require('body-parser');
const { setRoutes } = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up routes
setRoutes(app);

// Start the server
app.listen(PORT, () => {
    console.log(`Test Management Service is running on port ${PORT}`);
});