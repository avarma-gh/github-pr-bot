require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

// Middleware to parse JSON and preserve the raw body
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Import webhook handler
const { handleWebhook } = require("./utils/webhook");

// Webhook endpoint
app.post("/webhook", handleWebhook);

// Test GET endpoint
app.get("/webhook", (req, res) => {
  res.send("Webhook endpoint is working. Send a POST request to test.");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
