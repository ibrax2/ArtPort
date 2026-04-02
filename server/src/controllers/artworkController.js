import Artwork from "../models/Artwork.js";
import { uploadImageToS3 } from "./imageUploadController.js";
import { withMediaDeliveryUrls } from "../utils/mediaDelivery.js";

// @desc    Get all artworks
// @route   GET /api/artworks
// @access  Public
export const getArtworks = async (req, res) => {
  try {
    const artworks = await Artwork.find().populate(
      "userId",
      "username profilePictureUrl",
    );
    res.json(artworks.map((artwork) => withMediaDeliveryUrls(artwork)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new artwork
// @route   POST /api/artworks
// @access  Private (Mocked for now)
export const createArtwork = async (req, res) => {
  try {
    const { title, description, userId } = req.body;

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

    const artwork = new Artwork({
      userId,
      title,
      description,
      filePath,
      thumbnailPath,
    });

    const createdArtwork = await artwork.save();
    res.status(201).json(withMediaDeliveryUrls(createdArtwork));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get artwork by ID
// @route   GET /api/artworks/:id
// @access  Public
export const getArtworkById = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id).populate(
      "userId",
      "username profilePictureUrl",
    );

    if (artwork) {
      res.json(withMediaDeliveryUrls(artwork));
    } else {
      res.status(404).json({ message: "Artwork not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
