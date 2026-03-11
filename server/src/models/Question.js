import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["mcq", "rating", "text"],
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    ratingMin: {
      type: Number,
      default: null,
    },
    ratingMax: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Question ||
  mongoose.model("Question", questionSchema);
