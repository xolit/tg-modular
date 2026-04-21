# 🚀 Telegram Backend API

## 📌 What is this?

This backend lets you:

* Login to Telegram using OTP
* Send messages
* Get contacts
* Read messages
* Automatically mark messages as read

---

# 👨‍💻 Author

Built with ❤️ by **Abdul Basit**

📸 Instagram: @xolit_edits
🌐 Portfolio: https://gogamestore.vercel.app

---

# ⭐ Support

If this project helped you, consider giving it a ⭐ on GitHub and sharing it!

---


---

# 🔐 Authentication

All requests require a token:

```
Authorization: Bearer YOUR_API_TOKEN
```

---

# 📲 Telegram Login (IMPORTANT)

You only need to login **once**. After that, you save a session and reuse it.

---

## 🧭 Step-by-Step Login Flow

### 1️⃣ Send OTP

**POST /tg-send-otp**

👉 This sends an OTP to your Telegram number.

---

### 2️⃣ Verify OTP

**POST /tg-verify-otp**

**Body:**

```json
{
  "code": "12345"
}
```

**Response:**

```json
{
  "success": true,
  "session": "LONG_SESSION_STRING"
}
```

⚠️ **IMPORTANT:**
You will receive a `session` string — this is your permanent login key.

---

## 💾 How to Save `TG_SESSION`

This is the most important step.

---

### ✅ Option 1 — Backend (.env) ✅ BEST

1. Copy the session from response:

```
"session": "ABC123..."
```

2. Paste into your `.env`:

```
TG_SESSION=ABC123...
```

3. Restart server

✅ Done — no OTP needed again

---

### ✅ Option 2 — Frontend Storage

You can store it in:

* localStorage
* database
* your backend API

Example:

```js
localStorage.setItem("tg_session", session);
```

Then send it to backend later if needed.

---

### ❌ If you DON'T save it

* You must login with OTP every time
* Session will be lost on restart

---

## 🔐 2FA (if enabled)

If you get:

```json
{
  "need2FA": true
}
```

Call:

**POST /tg-2fa**

```json
{
  "password": "your_password"
}
```

---

# 📩 Send Message

**POST /send**

```json
{
  "to": "me",
  "message": "Hello!"
}
```

---

# 📇 Get Contacts

**GET /contacts**

---

# 💬 Get Last Chats

**GET /last-messages**

---

# 📥 Check New Messages

**GET /check-messages**

✅ Also marks messages as **read automatically**

---

# 🧪 Test Route

**GET /me**

Sends message to yourself

---

# ⚙️ Environment Variables

Create `.env`:

```
TG_API_ID=
TG_API_HASH=
PHONE_NUMBER=
API_TOKEN=
TG_SESSION=   ← (leave empty first time)
```

---

# 🚀 Run Project

```bash
npm install
node index.js
```

Server:

```
http://localhost:5050
```

---

# 🔐 Security Tips

* Never upload `.env` to GitHub
* Use strong `API_TOKEN`
* Use HTTPS in production

---

# 🧠 Simple Explanation

* OTP login → gives `session`
* Save session → no login again
* Session = your Telegram login key

---

# ✅ Done

You now have a fully working Telegram API 🚀
