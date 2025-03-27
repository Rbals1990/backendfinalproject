// Middleware JWT Authentication
import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Access denied. Token not provided." });
  }

  let token = authHeader;

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Verified token payload:", verified); // Debugging log
    req.user = verified;
    next();
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(403).json({ error: "Invalid token" });
  }
};
