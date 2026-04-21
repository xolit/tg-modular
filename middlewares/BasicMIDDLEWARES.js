const { state } = require("../Global-vars");

// =========================
// 🔐 AUTH MIDDLEWARE
// =========================
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    if (token !== process.env.API_TOKEN) {
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
  if (!state.isLoggedIn && !state.sessionString) {
    return res.status(401).json({ error: "Telegram not logged in" });
  }
  next();
}

module.exports = {
  authMiddleware,
  tgAuth
};