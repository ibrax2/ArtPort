import User from "../models/User.js";
import Folder from "../models/Folder.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { uploadImageToS3 } from "./imageUploadController.js";
import { withUserDeliveryUrls } from "../utils/mediaDelivery.js";

// Import profanity filter from outside package to check for inappropriate content in usernames and bios
import { Profanity } from '@2toad/profanity';
const profanity = new Profanity({
    // Include multiple languages for better coverage, but can be customized based on target audience
    languages: ['ar', 'zh', 'en', 'fr', 'de', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'es'],
});

const AUTH_COOKIE_NAME = process.env.AUTHCOOKIE_NAME || "artport_token";

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

    // Truncate username and email to remove leading/trailing whitespace
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password) {
      return res.status(400).json({ message: "Username, email, and password are required" });
    }

    // Check for profanity in username, send message if found.
    if (profanity.exists(trimmedUsername)) {
      return res.status(400).json({ message: "Username contains inappropriate content" });
    }

    // const userExists = await User.findOne({ email });
    const emailExists = await User.findOne({ email: trimmedEmail });
    const usernameExists = await User.findOne({ username: trimmedUsername });

    // if (userExists) {
    if (emailExists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    if (usernameExists) {
      return res.status(400).json({ message: "User with this username already exists" });
    }

    // Check password for invalid characters (only allow letters, numbers, and certain special characters)
    const passwordCharactersRegex = /^[A-Za-z\d!?@#$%^&*()_+-=]{8,}$/;
    if (!passwordCharactersRegex.test(password)) {
      return res.status(400)
        .json({ message: "Password contains invalid characters. Please use only letters, numbers, and the following special characters: !?@#$%^&*()_+-=" });
    }

    // Check password strength (at least 8 characters, including uppercase, lowercase, and numbers)
    const passwordStrengthRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d!?@#$%^&*()_+-=]{8,}$/;
    if (!passwordStrengthRegex.test(password)) {
      return res.status(400)
        .json({ message: "Password is too weak. It must be at least 8 characters long and include both uppercase and lowercase letters and numbers." });
    }

    // Hash password with bcrypt (10 salt rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let profilePictureUrl = "";
    if (req.file) {
      profilePictureUrl = await uploadImageToS3(req.file, "users");
    }

    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      passwordHash,
      profilePictureUrl,
    });

    if (user) {
      // Initialize folder structure for new user
      // Create root folder
      const rootFolder = await Folder.create({
        userId: user._id,
        folderName: "Root",
        parentFolderId: null,
        isPublic: true,
      });

      // Create "Portfolio" folder
      await Folder.create({
        userId: user._id,
        folderName: "Portfolio",
        parentFolderId: rootFolder._id,
        isPublic: true,
      });

      // Create "Bookmarks" folder
      await Folder.create({
        userId: user._id,
        folderName: "Bookmarks",
        parentFolderId: rootFolder._id,
        isPublic: false,
      });

      // Update user with root folder reference
      user.rootFolderId = rootFolder._id;
      await user.save();

      const token = generateToken(user._id);
      setAuthCookie(res, token);
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePictureUrl: withUserDeliveryUrls(user).profilePictureUrl,
        rootFolderId: user.rootFolderId,
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

    if (req.body.username) {
      // Check for profanity in username, send message if found.
      if (profanity.exists(req.body.username))  return res.status(400).json({ message: "Username contains inappropriate content" });
      if (req.body.username.trim() === "")      return res.status(400).json({ message: "Username cannot be empty" });
      
      // Check if the username is already taken by another user (excluding current user)
      const usernameExists = await User.findOne({ username: req.body.username.trim() });
      if (usernameExists && String(usernameExists._id) !== String(req.user._id)) {
        return res.status(400).json({ message: "User with this username already exists" });
      }

      // Good to update username if no issues detected.
      user.username = req.body.username.trim();
    }

    if (req.body.email) {
      if (req.body.email.trim() === "") return res.status(400).json({ message: "Email cannot be empty" });

      // Check if the email is already taken by another user (excluding current user)
      const emailExists = await User.findOne({ email: req.body.email.trim() });
      if (emailExists && String(emailExists._id) !== String(req.user._id)) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Good to update email if no issues detected.
      user.email = req.body.email.trim();
    }
    if (req.body.bio) {
      // Check for profanity in bio, send message if found.
      if (profanity.exists(req.body.bio)) {
        return res.status(400).json({ message: "Bio contains inappropriate content" });
      }
      // Good to update bio if no profanity detected.
      user.bio = req.body.bio;
    }
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
