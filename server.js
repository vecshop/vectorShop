const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/send-whatsapp", async (req, res) => {
  const { phone, apiKey, message } = req.body;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&apikey=${apiKey}&text=${encodeURIComponent(
    message
  )}`;

  try {
    const fetch = await import("node-fetch").then((mod) => mod.default);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to send WhatsApp notification");

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
