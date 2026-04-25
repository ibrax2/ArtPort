import express from "express";
import {
  getArtworks,
  createArtwork,
  getArtworkById,
  updateArtwork,
} from "../controllers/artworkController.js";
import {
  moveArtworkToFolder,
  copyArtworkToFolder,
  saveArtworkToBookmarks,
  removeArtworkFromBookmarks,
} from "../controllers/ArtworkFolderController.js";
import { upload } from "../middleware/upload.js";
import { optionalProtect, protect } from "../middleware/auth.js";

const router = express.Router();

router
  .route("/")
  .get(optionalProtect, getArtworks)
  .post(
    protect,
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "thumbnailImage", maxCount: 1 },
    ]),
    createArtwork,
  );

router.route("/:id").get(optionalProtect, getArtworkById).patch(protect, updateArtwork);
router.route("/:id/move").post(protect, moveArtworkToFolder);
router.route("/:id/copy").post(protect, copyArtworkToFolder);
router.route("/:id/bookmark").post(protect, saveArtworkToBookmarks);
router.route("/:id/unbookmark").post(protect, removeArtworkFromBookmarks);

export default router;
