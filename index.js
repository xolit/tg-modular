require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();
app.use(express.json());

// =========================
// 🌍 CORS (PUBLIC SAFE)
// =========================
app.use(
  cors({
    origin: ["http://localhost:5173", "https://ai-assistant-livid-iota.vercel.app"],
    credentials: true,
  })
);

// =========================
// 🔐 ENV CHECK
// =========================
if (!process.env.API_TOKEN) throw new Error("Missing API_TOKEN");
if (!process.env.TG_API_ID) throw new Error("Missing TG_API_ID");
if (!process.env.TG_API_HASH) throw new Error("Missing TG_API_HASH");
if (!process.env.PHONE_NUMBER) throw new Error("Missing PHONE_NUMBER");

// =========================
// 📱 TELEGRAM CONFIG
// =========================
const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const phone = process.env.PHONE_NUMBER;

// 🔥 SESSION FROM ENV (IMPORTANT)
let stringSession = new StringSession(process.env.TG_SESSION || "");

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// =========================
// 🔐 AUTH MIDDLEWARE
// =========================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token || token !== process.env.API_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  next();
}

// =========================
// 🔄 STATE
// =========================
let phoneCodeHash = null;
let isLoggedIn = false;

// =========================
// 🚀 INIT
// =========================
(async () => {
  if (process.env.TG_SESSION) {
    await client.connect();
    isLoggedIn = true;
    console.log("✅ Session restored");
  }
})();

// =========================
// 📲 SEND OTP
// =========================
app.post("/tg-send-otp", authMiddleware, async (req, res) => {
  try {
    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({}),
      })
    );

    phoneCodeHash = result.phoneCodeHash;

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 🔑 VERIFY OTP
// =========================
app.post("/tg-verify-otp", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    isLoggedIn = true;

    // 🔥 SAVE SESSION (IMPORTANT)
    const session = client.session.save();

    res.json({
      success: true,
      session, 
    });

  } catch (err) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
      return res.json({ need2FA: true });
    }

    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 🔐 2FA
// =========================
app.post("/tg-2fa", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    await client.invoke(
      new Api.auth.CheckPassword({
        password,
      })
    );

    isLoggedIn = true;

    const session = client.session.save();

    res.json({
      success: true,
      session,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 📩 SEND MESSAGE
// =========================
app.post("/send", authMiddleware, async (req, res) => {
  try {
    if (!isLoggedIn) {
      return res.status(401).json({ error: "Login required" });
    }

    const { to, message } = req.body;

    await client.sendMessage(to, { message });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 📇 CONTACTS
// =========================
app.get("/contacts", authMiddleware, async (req, res) => {
  try {
    const result = await client.invoke(
      new Api.contacts.GetContacts({ hash: 0 })
    );

    const users = result.users.map((u) => ({
      id: u.id?.value?.toString(),
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      username: u.username,
    }));

    res.json({ success: true, data: users });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 📥 CHECK UNREAD
// =========================
app.get("/check-messages", authMiddleware, async (req, res) => {
  try {
    const dialogs = await client.getDialogs({ limit: 20 });

    const unread = dialogs
      .filter((d) => d.unreadCount > 0)
      .map((d) => ({
        name: d.name,
        unread: d.unreadCount,
        last: d.lastMessage?.text,
      }));

    res.json({ success: true, data: unread });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// 🚀 START SERVER
// =========================
app.listen(5050, () => {
  console.log("🚀 Running on http://localhost:5050");
});