# 🚀 Telegram + AI Backend API

## 📌 Overview

This backend allows you to:

* Login with API credentials
* Authenticate using Bearer token
* Connect Telegram via OTP
* Send messages via Telegram
* Fetch contacts
* Use AI responses

---

## 🔐 Authentication

### Login

**POST /login**

```json
{
  "username": "admin",
  "password": "1234"
}
```

Response:

```json
{
  "success": true,
  "token": "mysecrettoken"
}
```

---

### Use Token

All protected routes require:

```
Authorization: Bearer mysecrettoken
```

---

## 📲 Telegram Login Flow

### 1. Send OTP

**POST /tg-send-otp**

---

### 2. Verify OTP

**POST /tg-verify-otp**

```json
{
  "code": "12345"
}
```

---

### 3. 2FA (if enabled)

**POST /tg-2fa**

```json
{
  "password": "your_password"
}
```

---

## 📩 Send Message

**POST /send**

```json
{
  "to": "me",
  "message": "Hello!"
}
```

---

## 📇 Get Contacts

**GET /contacts**

---

## 🤖 AI Chat

**GET /ai?msg=hello**

---

## 🧪 Test Route

**GET /me**

---

## ⚙️ Environment Variables

```
API_USER=admin
API_PASS=1234
API_TOKEN_HASH=your_hashed_token

TG_API_ID=your_id
TG_API_HASH=your_hash
PHONE_NUMBER=+91xxxxxxxxxx
```

---

## 🔐 Security Notes

* Token is stored as hash (bcrypt)
* Never expose `.env`
* Use HTTPS in production

---

## 🚀 Run Server

```
node index.js
```

Server runs on:

```
http://localhost:3000
```

---

## 💡 Future Improvements

* JWT authentication
* Multi-user support
* Auto-reply bot
* File/image sending
* Frontend dashboard

---
