import mongoose from "mongoose";

const artworkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    filePath: {
      type: String,
      required: true,
    },
    thumbnailPath: {
      type: String,
      default: "",
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Artwork ||
  mongoose.model("Artwork", artworkSchema);
