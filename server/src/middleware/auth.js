import jwt from "jsonwebtoken";
import User from "../models/User.js";

const AUTH_COOKIE_NAME = process.env.AUTHCOOKIE_NAME || "artport_token";

const getTokenFromCookies = (req) => {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${AUTH_COOKIE_NAME}=`)) {
      continue;
    }

    const rawValue = part.slice(`${AUTH_COOKIE_NAME}=`.length);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
};

const getTokenFromRequest = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return getTokenFromCookies(req);
};

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token (exclude password)
    req.user = await User.findById(decoded.id).select("-passwordHash");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Optionally attach req.user when a valid token is present, but never reject missing/invalid tokens.
export const optionalProtect = async (req, _res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-passwordHash");
  } catch {
    req.user = null;
  }

  return next();
};
