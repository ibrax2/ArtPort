import express from "express";
import {
  createFeedbackForm,
  getFeedbackForms,
  getFeedbackFormById,
  updateFeedbackForm,
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router
  .route("/")
  .get(protect, getFeedbackForms)
  .post(protect, createFeedbackForm);
router
  .route("/:id")
  .get(protect, getFeedbackFormById)
  .put(protect, updateFeedbackForm);

export default router;
