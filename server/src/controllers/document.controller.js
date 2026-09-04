import fs from "fs/promises";
import Document from "../models/Document.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { extractText } from "../services/textExtraction.service.js";
import {
  analyzeDocument,
  generateEmail,
  chatAboutDocument,
} from "../services/gemini.service.js";

/** Helper: fetch a document but only if it belongs to the requesting user. */
const findOwnedDocOrFail = async (docId, userId) => {
  const doc = await Document.findOne({ _id: docId, user: userId });
  if (!doc) {
    throw new ApiError(404, "Document not found.");
  }
  return doc;
};

// @route POST /api/documents/upload
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded. Please attach a PDF, DOCX, or TXT file.");
  }

  const doc = await Document.create({
    user: req.user._id,
    originalFileName: req.file.originalname,
    storedFileName: req.file.filename,
    fileSizeBytes: req.file.size,
    status: "PROCESSING",
  });

  try {
    const text = await extractText(req.file.path, req.file.originalname);

    if (!text || text.trim().length < 10) {
      doc.status = "FAILED";
      doc.errorMessage =
        "Could not extract readable text from this file. If it's a scanned/image-only PDF, try a text-based version.";
      await doc.save();
      return res.status(201).json({ document: doc });
    }

    doc.extractedText = text;

    const analysis = await analyzeDocument(text);

    doc.summary = analysis.summary;
    doc.requirements = analysis.requirements;
    doc.deadlines = analysis.deadlines;
    doc.risks = analysis.risks;
    doc.priority = analysis.priority;
    doc.missingItems = analysis.missingItems;
    doc.actions = analysis.actions;
    doc.status = "COMPLETED";

    await doc.save();
    return res.status(201).json({ document: doc });
  } catch (error) {
    doc.status = "FAILED";
    doc.errorMessage = error.message || "AI analysis failed.";
    await doc.save();
    // Report success on upload (record exists) but surface the failure clearly.
    return res.status(201).json({ document: doc });
  }
});

// @route GET /api/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ user: req.user._id })
    .select("-extractedText -chatHistory")
    .sort({ createdAt: -1 });
  res.json({ documents: docs });
});

// @route GET /api/documents/:id
export const getDocument = asyncHandler(async (req, res) => {
  const doc = await findOwnedDocOrFail(req.params.id, req.user._id);
  res.json({ document: doc });
});

// @route DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await findOwnedDocOrFail(req.params.id, req.user._id);
  await doc.deleteOne();
  res.json({ message: "Document deleted." });
});

// @route PATCH /api/documents/:id/actions/:actionId
export const toggleAction = asyncHandler(async (req, res) => {
  const doc = await findOwnedDocOrFail(req.params.id, req.user._id);
  const action = doc.actions.id(req.params.actionId);
  if (!action) {
    throw new ApiError(404, "Action item not found.");
  }
  action.completed =
    typeof req.body.completed === "boolean" ? req.body.completed : !action.completed;
  await doc.save();
  res.json({ document: doc });
});

// @route POST /api/documents/:id/email
export const createEmailDraft = asyncHandler(async (req, res) => {
  const doc = await findOwnedDocOrFail(req.params.id, req.user._id);

  if (doc.status !== "COMPLETED") {
    throw new ApiError(400, "This document hasn't finished being analyzed yet.");
  }

  const email = await generateEmail(
    {
      summary: doc.summary,
      requirements: doc.requirements,
      deadlines: doc.deadlines,
      missingItems: doc.missingItems,
      priority: doc.priority,
    },
    req.user.name
  );

  doc.generatedEmail = email;
  await doc.save();
  res.json({ email, document: doc });
});

// @route POST /api/documents/:id/chat
export const chatWithDocument = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    throw new ApiError(400, "Message cannot be empty.");
  }

  const doc = await findOwnedDocOrFail(req.params.id, req.user._id);
  if (doc.status !== "COMPLETED") {
    throw new ApiError(400, "This document hasn't finished being analyzed yet.");
  }

  const reply = await chatAboutDocument({
    docText: doc.extractedText,
    analysis: {
      summary: doc.summary,
      requirements: doc.requirements,
      deadlines: doc.deadlines,
      risks: doc.risks,
    },
    chatHistory: doc.chatHistory,
    question: message,
  });

  doc.chatHistory.push({ role: "user", content: message });
  doc.chatHistory.push({ role: "assistant", content: reply });
  await doc.save();

  res.json({ reply, chatHistory: doc.chatHistory });
});

// @route GET /api/documents/dashboard/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const docs = await Document.find({ user: req.user._id }).select(
    "actions deadlines priority status"
  );

  let totalActions = 0;
  let completedActions = 0;
  let upcomingDeadlines = [];
  let highPriorityDocs = 0;

  const now = new Date();
  const in14days = new Date();
  in14days.setDate(now.getDate() + 14);

  docs.forEach((doc) => {
    if (doc.priority === "HIGH") highPriorityDocs += 1;
    doc.actions.forEach((a) => {
      totalActions += 1;
      if (a.completed) completedActions += 1;
    });
    doc.deadlines.forEach((d) => {
      if (d.date && new Date(d.date) >= now && new Date(d.date) <= in14days) {
        upcomingDeadlines.push({ documentId: doc._id, label: d.label, date: d.date });
      }
    });
  });

  upcomingDeadlines.sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json({
    totalDocuments: docs.length,
    totalActions,
    completedActions,
    pendingActions: totalActions - completedActions,
    highPriorityDocs,
    upcomingDeadlines: upcomingDeadlines.slice(0, 10),
  });
});
