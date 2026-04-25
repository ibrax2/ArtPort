import express from "express";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";
import {
  getCurrentUser,
  getUsers,
  registerUser,
  loginUser,
  getUserProfile,
  getUserByUsername,
  updateUser,
} from "../controllers/userController.js";
import { getUserFolderTree } from "../controllers/folderController.js";

const router = express.Router();

router.route("/").get(getUsers);

router.post("/register", upload.single("profilePicture"), registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

router.get("/by-username/:username", getUserByUsername);
router.get("/:id/folder-tree", protect, getUserFolderTree);

router.patch(
  "/:id",
  protect,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "bannerPicture", maxCount: 1 },
  ]),
  updateUser,
);

router.route("/:id").get(getUserProfile);

export default router;
