import Folder from "../models/Folder.js";
import Artwork from "../models/Artwork.js";
import User from "../models/User.js";
import { validationError } from "../utils/apiErrors.js";
import { profanity } from "../utils/profanity.js";

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
export const createFolder = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { folderName, parentFolderId, isPublic } = req.body;

    const truncatedFolderName = folderName.trim();
    if (!truncatedFolderName) {
      return validationError(
        res,
        "FOLDER_NAME_REQUIRED",
        "Folder name is required",
      );
    }
    if (profanity.exists(truncatedFolderName)) {
      return validationError(
        res,
        "FOLDER_NAME_PROFANITY",
        "Folder name contains inappropriate content",
      );
    }

    if (truncatedFolderName.length > 100) {
      return validationError(
        res,
        "FOLDER_NAME_TOO_LONG",
        "Folder name must be less than 100 characters",
      );
    }

    // If parentFolderId is provided, verify it belongs to the user
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);

      if (!parentFolder) {
        return res.status(404).json({ message: "Parent folder not found" });
      }

      if (String(parentFolder.userId) !== String(req.user._id)) {
        return res.status(403).json({
          message:
            "You do not have permission to create folders in this directory",
        });
      }
    }

    const folder = await Folder.create({
      userId: req.user._id,
      folderName: truncatedFolderName,
      parentFolderId: parentFolderId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    res.status(201).json(folder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get folder by ID
// @route   GET /api/folders/:id
// @access  Public (but only show public folders or own private folders)
export const getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id).populate(
      "userId",
      "username",
    );

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check access: public folders or own folders
    if (
      !folder.isPublic &&
      (!req.user || String(folder.userId._id) !== String(req.user._id))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get folder contents (artworks and subfolders)
// @route   GET /api/folders/:id/contents
// @access  Public (respects folder privacy)
export const getFolderContents = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Check access
    if (
      !folder.isPublic &&
      (!req.user || String(folder.userId) !== String(req.user._id))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get subfolders
    const subfolders = await Folder.find({
      parentFolderId: req.params.id,
    }).select("_id folderName isPublic createdAt updatedAt");

    // Get artworks stored in this folder
    const artworks = await Artwork.find({
      _id: { $in: folder.artworkIds },
    }).select(
      "_id title description filePath thumbnailPath uploadDate isPublic",
    );

    res.json({
      folder,
      subfolders,
      artworks,
      summary: {
        subfoldersCount: subfolders.length,
        artworksCount: artworks.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get full folder tree for user
// @route   GET /api/users/:id/folder-tree
// @access  Private (only own tree)
export const getUserFolderTree = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (String(req.user._id) !== String(req.params.id)) {
      return res.status(403).json({
        message: "You can only view your own folder tree",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.rootFolderId) {
      return res.status(404).json({
        message: "Root folder not found. Please contact support.",
      });
    }

    const folders = await Folder.find({ userId: req.params.id })
      .select(
        "_id folderName isPublic createdAt updatedAt parentFolderId artworkIds",
      )
      .lean();

    const foldersById = new Map(
      folders.map((folder) => [String(folder._id), folder]),
    );
    const childrenByParentId = new Map();

    for (const folder of folders) {
      if (!folder.parentFolderId) continue;
      const parentKey = String(folder.parentFolderId);
      if (!childrenByParentId.has(parentKey)) {
        childrenByParentId.set(parentKey, []);
      }
      childrenByParentId.get(parentKey).push(folder);
    }

    const artworkIds = Array.from(
      new Set(
        folders.flatMap((folder) =>
          Array.isArray(folder.artworkIds)
            ? folder.artworkIds.map((id) => String(id))
            : [],
        ),
      ),
    );

    const artworks =
      artworkIds.length > 0
        ? await Artwork.find({ _id: { $in: artworkIds } })
            .select("_id title isPublic")
            .lean()
        : [];
    const artworksById = new Map(
      artworks.map((artwork) => [String(artwork._id), artwork]),
    );

    const buildFolderTree = (folderId) => {
      const folder = foldersById.get(String(folderId));
      if (!folder) return null;

      const folderArtworks = Array.isArray(folder.artworkIds)
        ? folder.artworkIds
            .map((id) => artworksById.get(String(id)))
            .filter(Boolean)
        : [];

      const subfolders = (childrenByParentId.get(String(folder._id)) || [])
        .map((child) => buildFolderTree(child._id))
        .filter((child) => child !== null);

      return {
        _id: folder._id,
        folderName: folder.folderName,
        isPublic: folder.isPublic,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        artworks: folderArtworks,
        subfolders,
      };
    };

    const folderTree = buildFolderTree(user.rootFolderId);

    res.json(folderTree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rename a folder
// @route   PATCH /api/folders/:id
// @access  Private
export const renameFolder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { folderName } = req.body;

    const truncatedFolderName = folderName.trim();
    if (!truncatedFolderName) {
      return validationError(
        res,
        "FOLDER_NAME_REQUIRED",
        "Folder name is required",
      );
    }
    if (profanity.exists(truncatedFolderName)) {
      return validationError(
        res,
        "FOLDER_NAME_PROFANITY",
        "Folder name contains inappropriate content",
      );
    }

    if (truncatedFolderName.length > 100) {
      return validationError(
        res,
        "FOLDER_NAME_TOO_LONG",
        "Folder name must be less than 100 characters",
      );
    }

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (String(folder.userId) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You do not have permission to update this folder",
      });
    }

    // Prevent renaming root folder structure (optional check)
    // You might want to allow/disallow renaming "Portfolio" and "Archive"
    // For now, we'll allow renaming everything

    folder.folderName = truncatedFolderName;
    const updatedFolder = await folder.save();

    res.json(updatedFolder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a folder and optionally its contents
// @route   DELETE /api/folders/:id
// @access  Private
export const deleteFolder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { deleteContents } = req.body; // If false, move contents to parent

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (String(folder.userId) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You do not have permission to delete this folder",
      });
    }

    // Check if folder has a parent (can't delete root folder through this endpoint)
    if (!folder.parentFolderId) {
      return res.status(400).json({
        message: "Cannot delete a root or system folder",
      });
    }

    // Check for subfolders
    const subfolderCount = await Folder.countDocuments({
      parentFolderId: req.params.id,
    });

    const artworkCount = await Artwork.countDocuments({
      folderId: req.params.id,
    });

    if (deleteContents) {
      // Recursively delete all subfolders and their contents
      const deleteSubfolders = async (parentId) => {
        const subfolders = await Folder.find({ parentFolderId: parentId });

        for (const subfolder of subfolders) {
          await deleteSubfolders(subfolder._id);
          await Folder.findByIdAndDelete(subfolder._id);
        }
      };

      await deleteSubfolders(req.params.id);

      // Delete all artworks in this folder
      await Artwork.deleteMany({ folderId: req.params.id });

      // Delete the folder itself
      await Folder.findByIdAndDelete(req.params.id);

      res.json({
        message: "Folder and all contents deleted successfully",
        deletedFolders: subfolderCount + 1,
        deletedArtworks: artworkCount,
      });
    } else {
      // Move subfolders to parent folder
      if (subfolderCount > 0) {
        await Folder.updateMany(
          { parentFolderId: req.params.id },
          { parentFolderId: folder.parentFolderId },
        );
      }

      // Move artworks to parent folder
      if (artworkCount > 0 && folder.parentFolderId) {
        const parentFolder = await Folder.findById(folder.parentFolderId);
        if (parentFolder) {
          parentFolder.artworkIds.push(...folder.artworkIds);
          await parentFolder.save();
        }
      }

      // Delete the folder
      await Folder.findByIdAndDelete(req.params.id);

      res.json({
        message: "Folder deleted. Contents moved to parent folder.",
        movedFolders: subfolderCount,
        movedArtworks: artworkCount,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update folder privacy settings
// @route   PATCH /api/folders/:id/privacy
// @access  Private
export const updateFolderPrivacy = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { isPublic } = req.body;

    if (isPublic === undefined) {
      return res
        .status(400)
        .json({ message: "isPublic parameter is required" });
    }

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (String(folder.userId) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You do not have permission to update this folder",
      });
    }

    folder.isPublic = isPublic;
    const updatedFolder = await folder.save();

    res.json(updatedFolder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
