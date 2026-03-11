import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    feedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Response ||
  mongoose.model("Response", responseSchema);
