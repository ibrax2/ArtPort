import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    option: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Option || mongoose.model("Option", optionSchema);
