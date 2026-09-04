import fs from "fs/promises";
import path from "path";
// pdf-parse's index.js runs a debug guard on require.main - importing the
// lib entry directly avoids that issue in an ESM context.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Extracts raw text from an uploaded file based on its extension.
 * Supports PDF and plain text out of the box. DOC/DOCX are accepted at
 * upload time but text extraction quality for legacy .doc is limited.
 */
export const extractText = async (filePath, originalFileName) => {
  const ext = path.extname(originalFileName).toLowerCase();

  try {
    if (ext === ".pdf") {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return (data.text || "").trim();
    }

    if (ext === ".txt") {
      const text = await fs.readFile(filePath, "utf-8");
      return text.trim();
    }

    if (ext === ".docx" || ext === ".doc") {
      // Fallback best-effort read; recommend PDF/TXT for best results.
      const buffer = await fs.readFile(filePath, "utf-8").catch(() => "");
      return buffer.trim();
    }

    throw new ApiError(400, `Unsupported file extension: ${ext}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, `Failed to extract text from document: ${error.message}`);
  }
};

export default extractText;
