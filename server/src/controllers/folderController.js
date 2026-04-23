import Folder from "../models/Folder.js";
import Artwork from "../models/Artwork.js";
import User from "../models/User.js";

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
export const createFolder = async (req, res) => {
  try {
    // Ensure user is authenticated
    // if (!req.user) {
    //   return res.status(401).json({ message: "Not authorized" });
    // }

    const { folderName, parentFolderId, isPublic } = req.body;

    // Validate folder name
    if (!folderName || folderName.trim().length === 0) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    if (folderName.trim().length > 100) {
      return res
        .status(400)
        .json({ message: "Folder name must be less than 100 characters" });
    }

    // If parentFolderId is provided, verify it belongs to the user
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);

      if (!parentFolder) {
        return res.status(404).json({ message: "Parent folder not found" });
      }

      if (String(parentFolder.userId) !== String(req.user._id)) {
        return res.status(403).json({
          message: "You do not have permission to create folders in this directory",
        });
      }
    }

    const folder = await Folder.create({
      userId: req.user._id,
      folderName: folderName.trim(),
      parentFolderId: parentFolderId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    // If it's a subfolder, add it to the parent's subfolderIds
    if (parentFolderId) {
      await Folder.findByIdAndUpdate(parentFolderId, {
        $push: { subfolderIds: folder._id },
      });
    }

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
    const folder = await Folder.findById(req.params.id).populate("userId", "username");

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
    }).select("_id title description filePath thumbnailPath uploadDate isPublic");

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

    // Recursive function to build tree structure
    const buildFolderTree = async (folderId) => {
      const folder = await Folder.findById(folderId).select(
        "_id folderName isPublic createdAt updatedAt",
      );

      if (!folder) return null;

      const subfolders = await Folder.find({
        parentFolderId: folderId,
      }).select("_id folderName isPublic createdAt updatedAt");

      const artworks = await Artwork.find({
        _id: { $in: folder.artworkIds },
      }).select("_id title isPublic");

      const children = await Promise.all(
        subfolders.map((subfolder) => buildFolderTree(subfolder._id)),
      );

      return {
        ...folder.toObject(),
        artworks,
        subfolders: children.filter((child) => child !== null),
      };
    };

    if (!user.rootFolderId) {
      return res.status(404).json({
        message: "Root folder not found. Please contact support.",
      });
    }

    const folderTree = await buildFolderTree(user.rootFolderId);

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

    if (!folderName || folderName.trim().length === 0) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    if (folderName.trim().length > 100) {
      return res
        .status(400)
        .json({ message: "Folder name must be less than 100 characters" });
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

    folder.folderName = folderName.trim();
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

    const parentFolderId = folder.parentFolderId;

    // Check if folder has a parent (can't delete root folder through this endpoint)
    if (!parentFolderId) {
      return res.status(400).json({
        message: "Cannot delete a root or system folder",
      });
    }

    // Check for subfolders by taking the length of subfolderIds array
    const subfolderCount = folder.subfolderIds.length;

    // Check for artworks by taking the length of artworkIds array
    const artworkCount = folder.artworkIds.length;

    if (deleteContents) {
      // Recursively delete all subfolders and their contents
      const deleteFolderAndContents = async (folderId) => {
        const folderToDelete = await Folder.findById(folderId);
        if (!folderToDelete) return;

        // Delete all artworks in this folder
        if (folderToDelete.artworkIds.length > 0) {
          await Artwork.deleteMany({ _id: { $in: folderToDelete.artworkIds } });
        }

        // Recursively delete subfolders
        if (folderToDelete.subfolderIds.length > 0) {
          for (const subfolderId of folderToDelete.subfolderIds) {
            await deleteFolderAndContents(subfolderId);
          }
        }
      }

      // Remove the folder from its parent's subfolderIds
      if (parentFolderId) {
        await Folder.findByIdAndUpdate(parentFolderId, {
          $pull: { subfolderIds: folder._id },
        });
      }

      // Delete the folder itself
      await Folder.findByIdAndDelete(req.params.id);

      res.json({
        message: "Folder and all contents deleted successfully",
        deletedFolders: subfolderCount + 1,
        deletedArtworks: artworkCount,
      });
    } else {
      if (subfolderCount > 0) {
        // Move subfolders to parent folder and update their parentFolderId 
        await Folder.updateMany(
          { _id: { $in: folder.subfolderIds } },
          { parentFolderId: parentFolderId }
        );

        // Add the moved subfolders to the parent folder's subfolderIds
        await Folder.findByIdAndUpdate(parentFolderId, {
          $push: { subfolderIds: { $each: folder.subfolderIds } },
        });
      }

      // Move artworks to parent folder
      if (artworkCount > 0 && parentFolderId) {
        const parentFolder = await Folder.findById(parentFolderId);
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
      return res.status(400).json({ message: "isPublic parameter is required" });
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
