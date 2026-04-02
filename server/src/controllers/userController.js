import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { uploadImageToS3 } from "./imageUploadController.js";

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
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

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePictureUrl: user.profilePictureUrl,
      token: generateToken(user._id),
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
      res.json(user);
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

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      bio: updatedUser.bio,
      profilePictureUrl: updatedUser.profilePictureUrl,
      bannerPictureUrl: updatedUser.bannerPictureUrl,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
