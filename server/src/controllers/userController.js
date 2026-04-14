import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { uploadImageToS3 } from "./imageUploadController.js";
import { withUserDeliveryUrls } from "../utils/mediaDelivery.js";

const AUTH_COOKIE_NAME = env.process.env.AUTHCOOKIE_NAME || "artport_token";

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all users
// @route   GET /api/users
// @access  Public
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json(users.map((user) => withUserDeliveryUrls(user)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current authenticated user
// @route   GET /api/users/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    return res.json(withUserDeliveryUrls(req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password with bcrypt (10 salt rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let profilePictureUrl = "";
    if (req.file) {
      profilePictureUrl = await uploadImageToS3(req.file, "users");
    }

    const user = await User.create({
      username,
      email,
      passwordHash,
      profilePictureUrl,
    });

    if (user) {
      const token = generateToken(user._id);
      setAuthCookie(res, token);
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePictureUrl: withUserDeliveryUrls(user).profilePictureUrl,
        token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePictureUrl: withUserDeliveryUrls(user).profilePictureUrl,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");

    if (user) {
      res.json(withUserDeliveryUrls(user));
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile by username
// @route   GET /api/users/by-username/:username
// @access  Public
export const getUserByUsername = async (req, res) => {
  try {
    const usernameRegex = new RegExp(
      `^${escapeRegex(req.params.username)}$`,
      "i",
    );
    const user = await User.findOne({ username: usernameRegex }).select(
      "-passwordHash -email",
    );

    if (user) {
      res.json(withUserDeliveryUrls(user));
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PATCH /api/users/:id
// @access  Public
export const updateUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (String(req.user._id) !== String(req.params.id)) {
      return res
        .status(403)
        .json({ message: "You can only update your own profile" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    if (req.body.bio) user.bio = req.body.bio;
    if (req.body.bannerPictureUrl)
      user.bannerPictureUrl = req.body.bannerPictureUrl;

    const profileFile = req.files?.profilePicture?.[0] || req.file;
    const bannerFile = req.files?.bannerPicture?.[0];

    if (profileFile) {
      const profilePictureUrl = await uploadImageToS3(profileFile, "users");
      user.profilePictureUrl = profilePictureUrl;
    }

    if (bannerFile) {
      const bannerPictureUrl = await uploadImageToS3(
        bannerFile,
        "users/banners",
      );
      user.bannerPictureUrl = bannerPictureUrl;
    }

    const updatedUser = await user.save();

    res.json(withUserDeliveryUrls(updatedUser));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
