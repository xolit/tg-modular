// =========================
// 🔄 STATES
// =========================
const state = {
  isLoggedIn: false,
  phoneCodeHash: null,
  sessionString: ""
};

// =========================
// 📱 TELEGRAM CONFIG
// =========================
const config = {
  apiId: Number(process.env.TG_API_ID),
  apiToken: process.env.API_TOKEN,
  apiHash: process.env.TG_API_HASH,
  phone: process.env.PHONE_NUMBER,
  sessionFile: "session.txt"
};

module.exports = {
  state,
  config
};