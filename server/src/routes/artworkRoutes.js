import express from "express";
import {
  getArtworks,
  createArtwork,
  getArtworkById,
} from "../controllers/artworkController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router
  .route("/")
  .get(getArtworks)
  .post(
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "thumbnailImage", maxCount: 1 },
    ]),
    createArtwork,
  );

router.route("/:id").get(getArtworkById);

export default router;
