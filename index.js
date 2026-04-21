require("dotenv").config();
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { authMiddleware, tgAuth } = require("./middlewares/BasicMIDDLEWARES");
const { state, config } = require("./Global-vars");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://ai.studio/apps/3b14344b-7532-43b2-afcc-74cf76c90532", // ⚠️ http typo fixed if needed
        "https://ai-assistant-livid-iota.vercel.app",
      ];

      // ✅ Allow Postman / server-to-server (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"), false);
      }
    },
  })
);

// =========================
// 🔐 ENV CHECK
// =========================
if (!process.env.API_TOKEN) throw new Error("Missing API_TOKEN");

// Load session
if (fs.existsSync(config.sessionFile)) {
  state.sessionString = fs.readFileSync(config.sessionFile, "utf8");
}

const stringSession = new StringSession(state.sessionString);

const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
  connectionRetries: 5,
});

// Restore session
(async () => {
  if (state.sessionString) {
    await client.connect();
    state.isLoggedIn = true;
    console.log("✅ Telegram session restored");
  }
})();

// =========================
// 📲 TELEGRAM LOGIN FLOW
// =========================

// Step 1: Send OTP
app.post("/tg-send-otp", authMiddleware, async (req, res) => {
  try {
    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: config.phone,
        apiId: config.apiId,
        apiHash: config.apiHash,
        settings: new Api.CodeSettings({}),
      })
    );

    state.phoneCodeHash = result.phoneCodeHash;

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
        phoneNumber: config.phone,
        phoneCodeHash: state.phoneCodeHash,
        phoneCode: code,
      })
    );

    state.isLoggedIn = true;

    fs.writeFileSync(config.sessionFile, client.session.save());

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

    state.isLoggedIn = true;

    fs.writeFileSync(config.sessionFile, client.session.save());

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

app.get("/last-messages", authMiddleware, tgAuth, async (req, res) => {
  try {
    const result = await client.invoke(
      new Api.messages.GetDialogs({
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        limit: 20,
        hash: 0,
      })
    );

    const dialogs = result.dialogs;
    const users = result.users;
    const chats = result.chats;
    const messages = result.messages;

    // 🔥 Helper to resolve peer (user/group/channel)
    function getPeerInfo(peer) {
      if (!peer) return null;

      if (peer.userId) {
        const user = users.find(
          (u) => u.id?.value === peer.userId?.value
        );
        return {
          id: peer.userId?.value?.toString(),
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          username: user?.username || null,
          type: "user",
        };
      }

      if (peer.chatId) {
        const chat = chats.find(
          (c) => c.id?.value === peer.chatId?.value
        );
        return {
          id: peer.chatId?.value?.toString(),
          name: chat?.title || "Group",
          type: "group",
        };
      }

      if (peer.channelId) {
        const channel = chats.find(
          (c) => c.id?.value === peer.channelId?.value
        );
        return {
          id: peer.channelId?.value?.toString(),
          name: channel?.title || "Channel",
          type: "channel",
        };
      }

      return null;
    }

    // 🔥 Build response
    const formatted = dialogs.map((dialog) => {
      const msg = messages.find(
        (m) => m.id?.value === dialog.topMessage?.value
      );

      const peer = getPeerInfo(dialog.peer);

      return {
        chat: peer,
        lastMessage: {
          id: msg?.id?.value?.toString() || null,
          text: msg?.message || "",
          date: msg?.date || null,
        },
        unreadCount: dialog.unreadCount || 0,
        pinned: dialog.pinned || false,
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// =========================
// 📥 CHECK NEW MESSAGES + MARK READ
// =========================
app.get("/check-messages", authMiddleware, tgAuth, async (req, res) => {
  try {
    const result = await client.invoke(
      new Api.messages.GetDialogs({
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        limit: 20,
        hash: 0,
      })
    );

    const dialogs = result.dialogs || [];
    const messages = result.messages || [];

    const unreadChats = [];

    for (const dialog of dialogs) {
      // ✅ Skip if no unread
      if (!dialog.unreadCount || dialog.unreadCount === 0) continue;

      // ✅ Skip broken dialogs
      if (!dialog.peer || !dialog.topMessage) continue;

      let entity;

      // 🔥 SAFEST WAY → get valid peer
      try {
        entity = await client.getInputEntity(dialog.peer);
      } catch (e) {
        console.log("⚠️ Skipping invalid peer");
        continue;
      }

      // ✅ Find last message
      const msg = messages.find((m) => m.id === dialog.topMessage);

      // 🔥 MARK AS READ
      try {
        await client.invoke(
          new Api.messages.ReadHistory({
            peer: entity,
            maxId: dialog.topMessage,
          })
        );
      } catch (e) {
        console.log("⚠️ Failed to mark read");
      }

      unreadChats.push({
        chatId:
          dialog.peer.userId?.value?.toString() ||
          dialog.peer.chatId?.value?.toString() ||
          dialog.peer.channelId?.value?.toString() ||
          "unknown",

        unreadCount: dialog.unreadCount,

        lastMessage: {
          text: msg?.message || "",
          date: msg?.date || null,
        },
      });
    }

    res.json({
      success: true,
      count: unreadChats.length,
      data: unreadChats,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to check messages" });
  }
});

// =========================
// 🧪 TEST
// =========================
app.get("/me", authMiddleware, tgAuth, async (req, res) => {
  const {message} = req.body;
  await client.sendMessage("me", { message: message || "Hello, From Telegram BACKEND (Abdul Basit) 🚀" });
  res.json({ success: true });
});

// =========================
// 🚀 START SERVER
// =========================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});