# 🚀 Telegram Backend API

## 📌 Overview

This backend allows you to:

* Authenticate using Bearer token
* Connect Telegram via OTP
* Send messages via Telegram
* Fetch contacts and messages
* Check and mark messages as read

---

## 🔐 Authentication

All protected routes require:

```
Authorization: Bearer YOUR_API_TOKEN
```

---

## 📲 Telegram Login Flow

### 1. Send OTP

**POST /tg-send-otp**

**Response:**
```json
{
  "success": true,
  "message": "OTP sent"
}
```

---

### 2. Verify OTP

**POST /tg-verify-otp**

**Request:**
```json
{
  "code": "12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telegram logged in"
}
```

**Error Response (2FA Required):**
```json
{
  "success": false,
  "need2FA": true
}
```

---

### 3. 2FA (if enabled)

**POST /tg-2fa**

**Request:**
```json
{
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA success"
}
```

---

## 📩 Send Message

**POST /send**

**Request:**
```json
{
  "to": "me",
  "message": "Hello!"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## 📇 Get Contacts

**GET /contacts**

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789",
      "name": "John Doe",
      "username": "johndoe",
      "phone": "+1234567890"
    }
  ]
}
```

---

## 💬 Get Last Messages

**GET /last-messages**

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "chat": {
        "id": "123456789",
        "name": "John Doe",
        "username": "johndoe",
        "type": "user"
      },
      "lastMessage": {
        "id": "123",
        "text": "Hello there!",
        "date": 1640995200
      },
      "unreadCount": 2,
      "pinned": false
    }
  ]
}
```

---

## 📥 Check New Messages (Auto Mark Read)

**GET /check-messages**

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "chatId": "123456789",
      "unreadCount": 5,
      "lastMessage": {
        "text": "Hey, check this out!",
        "date": 1640995200
      }
    }
  ]
}
```

---

## � Test Route

**GET /me**

**Response:**
```json
{
  "success": true
}
```

---

## ⚙️ Environment Variables

```
TG_API_ID=your_telegram_api_id
TG_API_HASH=your_telegram_api_hash
PHONE_NUMBER=+91xxxxxxxxxx
API_TOKEN=your_secret_token
```

---

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up your `.env` file with the required variables

3. Start the server:
```bash
npm run dev
```

4. Server runs on `http://localhost:3000`

---

## 📝 Notes

- All routes require Bearer token authentication
- Telegram routes require successful login first
- Messages are automatically marked as read when checked

```
TG_API_ID=your_id
TG_API_HASH=your_hash
PHONE_NUMBER=+91xxxxxxxxxx
```

---

## 🔐 Security Notes
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
