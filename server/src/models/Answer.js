import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    responseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Response",
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Option",
      default: null,
    },
    value: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Answer || mongoose.model("Answer", answerSchema);
