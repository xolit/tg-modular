require("dotenv").config();
const fs = require("fs");
const express = require("express");
const { askAI } = require("./ai");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const app = express();
app.use(express.json());

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const phone = process.env.PHONE_NUMBER;

const sessionFile = "session.txt";

// ✅ Load session if exists
let sessionString = "";
if (fs.existsSync(sessionFile)) {
  sessionString = fs.readFileSync(sessionFile, "utf8");
}

const stringSession = new StringSession(sessionString);

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

(async () => {
  await client.start({
    phoneNumber: async () => phone,
    phoneCode: async () => await input.text("Enter OTP: "),
    password: async () => await input.text("Enter 2FA password: "),
    onError: (err) => console.log(err),
  });

  console.log("✅ Telegram connected");

  // ✅ Save session AFTER login
  fs.writeFileSync(sessionFile, client.session.save());

  // =========================
  // 🚀 ROUTES
  // =========================

  // ✅ Send message
  app.post("/send", async (req, res) => {
    try {
      const { to, message } = req.body;
    //   const { to, message } = req.query; // ✅ For testing via browser

      if (!to || !message) {
        return res.status(400).json({ error: "Missing to/message" });
      }

      await client.sendMessage(to, { message });

      res.json({ success: true, message: "Message sent" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: "Failed to send" });
    }
  });

  // ✅ Get contacts
app.get("/contacts", async (req, res) => {
  try {
    const result = await client.invoke(
      new Api.contacts.GetContacts({ hash: 0 })
    );

    const users = result.users;

    const formatted = users.map((user) => ({
      id: user.id?.value?.toString(), // ✅ FIX HERE
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      username: user.username || null,
      phone: user.phone || null,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

  // ✅ Send to yourself (test)
  app.get("/me", async (req, res) => {
    await client.sendMessage("me", { message: "Hello from API tree" });
    res.json({ success: true });
  });

    app.get("/ai", async (req, res) => {
        const {msg} = req.query;
        const aiResponse = await askAI(msg);
        res.json({ success: true, response: aiResponse });
  });

  app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
  });
})();