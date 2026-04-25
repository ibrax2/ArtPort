import express from "express";
import { protect, optionalProtect } from "../middleware/auth.js";
import {
  createFolder,
  getFolderById,
  getFolderContents,
  renameFolder,
  deleteFolder,
  updateFolderPrivacy,
} from "../controllers/folderController.js";

const router = express.Router();

router.route("/").post(protect, createFolder);

router.route("/:id").get(optionalProtect, getFolderById).patch(protect, renameFolder).delete(protect, deleteFolder);

router.route("/:id/contents").get(optionalProtect, getFolderContents);
router.route("/:id/privacy").patch(protect, updateFolderPrivacy);

export default router;
