require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { askAI } = require("./ai");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();
app.use(express.json());
app.use(cors());

// =========================
// 🔐 ENV CHECK
// =========================
if (!process.env.API_USER) throw new Error("Missing API_USER");
if (!process.env.API_PASS) throw new Error("Missing API_PASS");
if (!process.env.API_TOKEN_HASH) throw new Error("Missing API_TOKEN_HASH");

// =========================
// 📱 TELEGRAM CONFIG
// =========================
const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const phone = process.env.PHONE_NUMBER;

const sessionFile = "session.txt";

// Load session
let sessionString = "";
if (fs.existsSync(sessionFile)) {
  sessionString = fs.readFileSync(sessionFile, "utf8");
}

const stringSession = new StringSession(sessionString);

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

// =========================
// 🔄 STATE
// =========================
let isLoggedIn = false;
let phoneCodeHash = null;

// Restore session
(async () => {
  if (sessionString) {
    await client.connect();
    isLoggedIn = true;
    console.log("✅ Telegram session restored");
  }
})();

// =========================
// 🔐 AUTH MIDDLEWARE (HASHED)
// =========================
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    const isValid = await bcrypt.compare(
      token,
      process.env.API_TOKEN_HASH
    );

    if (!isValid) {
      return res.status(403).json({ error: "Invalid token" });
    }

    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Auth failed" });
  }
}

// =========================
// 📱 TELEGRAM AUTH CHECK
// =========================
function tgAuth(req, res, next) {
  if (!isLoggedIn && !sessionString) {
    return res.status(401).json({ error: "Telegram not logged in" });
  }
  next();
}

// =========================
// 🔓 LOGIN ROUTE
// =========================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.API_USER &&
    password === process.env.API_PASS
  ) {
    return res.json({
      success: true,
      token: "mysecrettoken", // 🔑 same token you hashed
    });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

// =========================
// 📲 TELEGRAM LOGIN FLOW
// =========================

// Step 1: Send OTP
app.post("/tg-send-otp", authMiddleware, async (req, res) => {
  try {
    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: apiId,
        apiHash: apiHash,
        settings: new Api.CodeSettings({}),
      })
    );

    phoneCodeHash = result.phoneCodeHash;

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Step 2: Verify OTP
app.post("/tg-verify-otp", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    isLoggedIn = true;

    fs.writeFileSync(sessionFile, client.session.save());

    res.json({ success: true, message: "Telegram logged in" });

  } catch (err) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
      return res.json({ success: false, need2FA: true });
    }

    console.log(err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

// Step 3: 2FA
app.post("/tg-2fa", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password required" });
    }

    await client.invoke(
      new Api.auth.CheckPassword({
        password,
      })
    );

    isLoggedIn = true;

    fs.writeFileSync(sessionFile, client.session.save());

    res.json({ success: true, message: "2FA success" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "2FA failed" });
  }
});

// =========================
// 📩 SEND MESSAGE
// =========================
app.post("/send", authMiddleware, tgAuth, async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Missing to/message" });
    }

    await client.sendMessage(to, { message });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send" });
  }
});

// =========================
// 📇 CONTACTS
// =========================
app.get("/contacts", authMiddleware, tgAuth, async (req, res) => {
  try {
    const result = await client.invoke(
      new Api.contacts.GetContacts({ hash: 0 })
    );

    const users = result.users.map((u) => ({
      id: u.id?.value?.toString(),
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      username: u.username || null,
      phone: u.phone || null,
    }));

    res.json({ success: true, data: users });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// =========================
// 🤖 AI
// =========================
app.get("/ai", authMiddleware, async (req, res) => {
  try {
    const { msg } = req.query;

    if (!msg) {
      return res.status(400).json({ error: "Missing msg" });
    }

    const response = await askAI(msg);

    res.json({ success: true, response });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI failed" });
  }
});

// =========================
// 🧪 TEST
// =========================
app.get("/me", authMiddleware, tgAuth, async (req, res) => {
  await client.sendMessage("me", { message: "Hello 🚀" });
  res.json({ success: true });
});

// =========================
// 🚀 START SERVER
// =========================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});