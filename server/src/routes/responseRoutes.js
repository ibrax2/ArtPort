import express from "express";
import {
  createResponse,
  getResponses,
  getResponseById,
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.route("/").get(protect, getResponses).post(protect, createResponse);
router.route("/:id").get(protect, getResponseById);

export default router;
