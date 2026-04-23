import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    folderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    artworkIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Artwork",
      default: [],
    },
    subfolderIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Folder",
      default: [],
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

export default mongoose.models.Folder || mongoose.model("Folder", folderSchema);
