import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  toggleAction,
  createEmailDraft,
  chatWithDocument,
  getDashboardStats,
} from "../controllers/document.controller.js";

const router = Router();

router.use(protect); // every document route requires auth

router.post("/upload", upload.single("file"), uploadDocument);
router.get("/dashboard/stats", getDashboardStats);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.delete("/:id", deleteDocument);
router.patch("/:id/actions/:actionId", toggleAction);
router.post("/:id/email", createEmailDraft);
router.post("/:id/chat", chatWithDocument);

export default router;
