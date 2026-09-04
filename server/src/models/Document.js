import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
  },
  { _id: true, timestamps: true }
);

const deadlineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    date: { type: Date, default: null },
    rawText: { type: String, default: "" }, // in case AI couldn't parse an exact date
  },
  { _id: false }
);

const riskSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { _id: false, timestamps: true }
);

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    extractedText: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    errorMessage: { type: String, default: "" },

    // AI-generated analysis
    summary: { type: String, default: "" },
    requirements: [{ type: String }],
    deadlines: [deadlineSchema],
    risks: [riskSchema],
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    missingItems: [{ type: String }],

    actions: [actionItemSchema],

    generatedEmail: { type: String, default: "" },

    chatHistory: [chatMessageSchema],
  },
  { timestamps: true }
);

documentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Document", documentSchema);
