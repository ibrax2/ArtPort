import Artwork from "../models/Artwork.js";
import User from "../models/User.js";
import Folder from "../models/Folder.js";
import jwt from "jsonwebtoken";
import { uploadImageToS3 } from "./imageUploadController.js";
import { withMediaDeliveryUrls } from "../utils/mediaDelivery.js";
import { validationError } from "../utils/apiErrors.js";
import { profanity } from "../utils/profanity.js";

const SPECIAL_FOLDERS = {
  BOOKMARKS: "bookmarks",
  ARCHIVE: "archive",
};

const normalizeFolderName = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getOptionalCurrentUser = async (req) => {
  if (req.user?._id) {
    return req.user;
  }

  const authHeader = req.headers?.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token && req.headers?.cookie) {
    const cookieName = process.env.AUTHCOOKIE_NAME || "artport_token";
    const parts = req.headers.cookie.split(";").map((part) => part.trim());

    for (const part of parts) {
      if (!part.startsWith(`${cookieName}=`)) continue;
      const rawValue = part.slice(`${cookieName}=`.length);
      try {
        token = decodeURIComponent(rawValue);
      } catch {
        token = rawValue;
      }
      break;
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("_id username");
  } catch {
    return null;
  }
};

// @desc    Get all artworks
// @route   GET /api/artworks
// @access  Public
export const getArtworks = async (req, res) => {
  try {
    const currentUser = await getOptionalCurrentUser(req);
    const requestedUserId =
      typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const includePrivate =
      String(req.query.includePrivate || "")
        .trim()
        .toLowerCase() === "true";

    const publicUsers = await User.find({ isPrivate: { $ne: true } })
      .select("_id")
      .lean();

    const allowedUserIds = new Set(publicUsers.map((user) => String(user._id)));
    if (currentUser?._id) {
      allowedUserIds.add(String(currentUser._id));
    }

    if (requestedUserId && !allowedUserIds.has(requestedUserId)) {
      return res.json([]);
    }

    const artworkQuery = requestedUserId
      ? { userId: requestedUserId }
      : { userId: { $in: Array.from(allowedUserIds) } };

    const canViewPrivateRequestedUser =
      requestedUserId && String(currentUser?._id) === String(requestedUserId);

    if (!canViewPrivateRequestedUser || !includePrivate) {
      artworkQuery.isPublic = true;
    }

    const artworks = await Artwork.find(artworkQuery)
      .populate("userId", "_id username profilePictureUrl isPrivate")
      .populate("folderId", "_id userId isPublic folderName");

    const shouldIncludePrivateFolderContent =
      Boolean(canViewPrivateRequestedUser) && includePrivate;

    const visibleArtworks = artworks.filter((artwork) => {
      if (!artwork.folderId || typeof artwork.folderId !== "object") {
        return true;
      }

      if (artwork.folderId.isPublic !== false) {
        return true;
      }

      if (!shouldIncludePrivateFolderContent) {
        return false;
      }

      return String(artwork.folderId.userId) === String(currentUser?._id);
    });

    res.json(visibleArtworks.map((artwork) => withMediaDeliveryUrls(artwork)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new artwork
// @route   POST /api/artworks
// @access  Private (Mocked for now)
export const createArtwork = async (req, res) => {
  try {
    const { title, description, userId, folderId } = req.body;

    const truncatedTitle = title.trim();
    // For description, we can allow empty but still check for profanity if provided
    const truncatedDescription = description ? description.trim() : "";

    if (!truncatedTitle) {
      return validationError(
        res,
        "ARTWORK_TITLE_REQUIRED",
        "Title is required",
      );
    }
    if (profanity.exists(truncatedTitle)) {
      return validationError(
        res,
        "ARTWORK_TITLE_PROFANITY",
        "Title contains inappropriate content",
      );
    }
    if (profanity.exists(truncatedDescription)) {
      return validationError(
        res,
        "ARTWORK_DESCRIPTION_PROFANITY",
        "Description contains inappropriate content",
      );
    }

    // Handle image uploads through imageUploadController
    let filePath = req.body.filePath;
    let thumbnailPath = req.body.thumbnailPath || "";

    if (req.files?.image?.[0]) {
      filePath = await uploadImageToS3(req.files.image[0], "artworks");
    }

    if (req.files?.thumbnailImage?.[0]) {
      thumbnailPath = await uploadImageToS3(
        req.files.thumbnailImage[0],
        "artworks/thumbnails",
      );
    }

    if (!filePath) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!req.user || String(req.user._id) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let selectedFolder = null;
    if (folderId) {
      selectedFolder = await Folder.findById(folderId);
      if (!selectedFolder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      if (String(selectedFolder.userId) !== String(req.user._id)) {
        return res.status(403).json({
          message: "You can only post into your own folders",
        });
      }

      if (
        normalizeFolderName(selectedFolder.folderName) ===
        SPECIAL_FOLDERS.BOOKMARKS
      ) {
        return res.status(400).json({
          message: "You cannot upload your own artwork directly to Bookmarks",
        });
      }
    }

    const artwork = new Artwork({
      userId,
      title: truncatedTitle,
      description: truncatedDescription,
      filePath,
      thumbnailPath,
      folderId: selectedFolder?._id || null,
      isPublic:
        selectedFolder &&
        normalizeFolderName(selectedFolder.folderName) ===
          SPECIAL_FOLDERS.ARCHIVE
          ? false
          : true,
    });

    const createdArtwork = await artwork.save();

    if (selectedFolder) {
      const hasArtwork = selectedFolder.artworkIds.some(
        (id) => String(id) === String(createdArtwork._id),
      );
      if (!hasArtwork) {
        selectedFolder.artworkIds.push(createdArtwork._id);
        await selectedFolder.save();
      }
    }

    const populatedArtwork =
      typeof createdArtwork.populate === "function"
        ? await createdArtwork.populate(
            "userId",
            "_id username profilePictureUrl",
          )
        : createdArtwork;
    res.status(201).json(withMediaDeliveryUrls(populatedArtwork));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get artwork by ID
// @route   GET /api/artworks/:id
// @access  Public
export const getArtworkById = async (req, res) => {
  try {
    const currentUser = await getOptionalCurrentUser(req);
    const artwork = await Artwork.findById(req.params.id)
      .populate("userId", "_id username profilePictureUrl")
      .populate("folderId", "_id userId isPublic folderName");

    if (artwork) {
      if (
        artwork.folderId &&
        typeof artwork.folderId === "object" &&
        artwork.folderId.isPublic === false &&
        String(currentUser?._id) !== String(artwork.folderId.userId)
      ) {
        return res.status(404).json({ message: "Artwork not found" });
      }

      if (
        !artwork.isPublic &&
        String(currentUser?._id) !== String(artwork.userId?._id)
      ) {
        return res.status(404).json({ message: "Artwork not found" });
      }

      res.json(withMediaDeliveryUrls(artwork));
    } else {
      res.status(404).json({ message: "Artwork not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update artwork metadata/folder
// @route   PATCH /api/artworks/:id
// @access  Private
export const updateArtwork = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: "Artwork not found" });
    }

    if (String(artwork.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      const nextTitle =
        typeof req.body.title === "string" ? req.body.title.trim() : "";
      if (!nextTitle) {
        return validationError(
          res,
          "ARTWORK_TITLE_REQUIRED",
          "Title is required",
        );
      }
      if (profanity.exists(nextTitle)) {
        return validationError(
          res,
          "ARTWORK_TITLE_PROFANITY",
          "Title contains inappropriate content",
        );
      }
      artwork.title = nextTitle;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      const nextDescription =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
      if (profanity.exists(nextDescription)) {
        return validationError(
          res,
          "ARTWORK_DESCRIPTION_PROFANITY",
          "Description contains inappropriate content",
        );
      }
      artwork.description = nextDescription;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "folderId")) {
      const requestedFolderId =
        typeof req.body.folderId === "string" ? req.body.folderId.trim() : "";

      let nextFolder = null;
      if (requestedFolderId) {
        nextFolder = await Folder.findById(requestedFolderId);
        if (!nextFolder) {
          return res.status(404).json({ message: "Target folder not found" });
        }
        if (String(nextFolder.userId) !== String(req.user._id)) {
          return res.status(403).json({
            message: "You can only move artwork into your own folders",
          });
        }
        if (
          normalizeFolderName(nextFolder.folderName) ===
          SPECIAL_FOLDERS.BOOKMARKS
        ) {
          return res.status(400).json({
            message: "You cannot move your own artwork into Bookmarks",
          });
        }
      }

      const currentFolderId = artwork.folderId ? String(artwork.folderId) : "";
      const nextFolderId = nextFolder ? String(nextFolder._id) : "";

      if (currentFolderId && currentFolderId !== nextFolderId) {
        const currentFolder = await Folder.findById(currentFolderId);
        if (currentFolder) {
          currentFolder.artworkIds = currentFolder.artworkIds.filter(
            (id) => String(id) !== String(artwork._id),
          );
          await currentFolder.save();
        }
      }

      if (nextFolder && currentFolderId !== nextFolderId) {
        const exists = nextFolder.artworkIds.some(
          (id) => String(id) === String(artwork._id),
        );
        if (!exists) {
          nextFolder.artworkIds.push(artwork._id);
          await nextFolder.save();
        }
      }

      artwork.folderId = nextFolder ? nextFolder._id : null;
      artwork.isPublic =
        nextFolder &&
        normalizeFolderName(nextFolder.folderName) === SPECIAL_FOLDERS.ARCHIVE
          ? false
          : true;
    }

    const saved = await artwork.save();
    const populated = await Artwork.findById(saved._id)
      .populate("userId", "_id username profilePictureUrl isPrivate")
      .populate("folderId", "_id folderName isPublic");
    return res.json(withMediaDeliveryUrls(populated));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
