// middleware/authUser.js
import jwt from "jsonwebtoken";

const authUser = async (req, res, next) => {
  try {
    console.log("🔐 authUser middleware called");

    // 1. محاولة أخذ التوكن من Authorization header
    let token = req.headers.authorization?.split(" ")[1];
    
    // 2. إذا لم يكن موجوداً، نحاول من query parameter
    if (!token && req.query.token) {
      token = req.query.token;
      console.log("📎 Token taken from query parameter");
    }

    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    console.log("🟡 Token received, verifying...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified, user id:", decoded.id);

    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

export default authUser;