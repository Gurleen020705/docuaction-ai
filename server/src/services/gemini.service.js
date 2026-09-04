import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/ApiError.js";

let genAI = null;

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(500, "GEMINI_API_KEY is not configured on the server.");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const getModel = (jsonMode = false) => {
  const client = getClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  return client.getGenerativeModel({
    model: modelName,
    generationConfig: jsonMode
      ? { responseMimeType: "application/json", temperature: 0.3 }
      : { temperature: 0.5 },
  });
};

/** Strips markdown code fences some models still wrap JSON in, just in case. */
const cleanJson = (text) => text.replace(/```json/gi, "").replace(/```/g, "").trim();

// Cap the text sent to the model so huge documents don't blow context/cost.
const truncate = (text, maxChars = 30000) =>
  text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[...document truncated...]` : text;

const ANALYSIS_PROMPT = (docText) => `
You are DocuAction AI, an assistant that turns real-world documents (notices, letters, contracts, forms, circulars) into concrete, actionable output for the person who received them.

Read the document text below and respond with ONLY a valid JSON object (no markdown, no commentary) matching EXACTLY this schema:

{
  "summary": "string - a concise 2-4 sentence plain-language summary of what this document is and why it matters to the recipient",
  "requirements": ["string - each concrete document/item/qualification the recipient must provide or satisfy"],
  "deadlines": [{ "label": "string - what the deadline is for", "date": "YYYY-MM-DD or null if no explicit date is given", "rawText": "string - the exact date phrase as written in the document, empty string if none" }],
  "risks": [{ "description": "string - a concrete risk, consequence, or penalty if the recipient does not act", "severity": "LOW | MEDIUM | HIGH" }],
  "priority": "LOW | MEDIUM | HIGH - overall urgency of this document for the recipient",
  "missingItems": ["string - required items that appear to be referenced as needed but that the document itself flags as missing, incomplete, or not yet provided by the recipient. Empty array if none are evident."],
  "actions": [{ "title": "string - short actionable task, e.g. 'Submit signed NOC to admin office'", "description": "string - 1-2 sentence detail on how/why to do this", "dueDate": "YYYY-MM-DD or null", "priority": "LOW | MEDIUM | HIGH" }]
}

Rules:
- Base everything strictly on the document text. Do not invent facts not implied by the text.
- If the document contains no deadlines, requirements, or risks, return empty arrays for those fields - do not fabricate them.
- "actions" should be the concrete next steps the recipient should take, derived from the requirements/deadlines/risks. Always produce at least one action if the document implies any response is needed.
- Dates must be resolved to real calendar dates (YYYY-MM-DD) whenever the document gives enough context (e.g. combine a written date with an implied year); use null only when truly unresolvable.
- priority should reflect real urgency: HIGH for imminent deadlines or serious consequences, LOW for purely informational documents.

DOCUMENT TEXT:
"""
${truncate(docText)}
"""
`;

/**
 * Sends extracted document text to Gemini and returns a structured
 * analysis object. This is the core AI-driven feature of the app -
 * no part of this output is hardcoded or templated.
 */
export const analyzeDocument = async (docText) => {
  if (!docText || docText.trim().length < 10) {
    throw new ApiError(422, "Document text is too short or empty to analyze.");
  }

  const model = getModel(true);
  let result;
  try {
    result = await model.generateContent(ANALYSIS_PROMPT(docText));
  } catch (err) {
    throw new ApiError(502, `Gemini API request failed: ${err.message}`);
  }

  const raw = result.response.text();
  let parsed;
  try {
    parsed = JSON.parse(cleanJson(raw));
  } catch (err) {
    throw new ApiError(502, "Gemini returned a response that could not be parsed as JSON.");
  }

  return {
    summary: parsed.summary || "",
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    priority: ["LOW", "MEDIUM", "HIGH"].includes(parsed.priority) ? parsed.priority : "MEDIUM",
    missingItems: Array.isArray(parsed.missingItems) ? parsed.missingItems : [],
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.map((a) => ({
          title: a.title || "Untitled action",
          description: a.description || "",
          dueDate: a.dueDate || null,
          priority: ["LOW", "MEDIUM", "HIGH"].includes(a.priority) ? a.priority : "MEDIUM",
        }))
      : [],
  };
};

/**
 * Generates a ready-to-send email/response based on the document's
 * full analysis (summary, requirements, deadlines, missing items).
 */
export const generateEmail = async (documentAnalysis, userName) => {
  const model = getModel(false);

  const prompt = `
You are drafting an email on behalf of ${userName || "the recipient"}, responding to or acting on the document analyzed below.

Document summary: ${documentAnalysis.summary}
Requirements: ${documentAnalysis.requirements.join("; ") || "None specified"}
Deadlines: ${documentAnalysis.deadlines.map((d) => `${d.label} (${d.date || d.rawText || "no date"})`).join("; ") || "None specified"}
Missing items still needed: ${documentAnalysis.missingItems.join("; ") || "None"}
Priority: ${documentAnalysis.priority}

Write a professional, concise email (or application/response letter) appropriate to this document's context. Include:
- A clear subject line (as "Subject: ...")
- A polite, professional body
- Explicit mention of any missing items the sender still needs to arrange, if applicable
- A closing with a placeholder signature line like "[Your Name]"

Return ONLY the email text, no extra commentary.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    throw new ApiError(502, `Gemini API request failed while generating email: ${err.message}`);
  }
};

/**
 * Document-specific chat: answers a user's question using the document's
 * extracted text and prior analysis as grounding context, plus recent
 * chat history for continuity.
 */
export const chatAboutDocument = async ({ docText, analysis, chatHistory, question }) => {
  const model = getModel(false);

  const historyText = (chatHistory || [])
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `
You are DocuAction AI's document assistant. Answer the user's question using ONLY the document content and analysis below. If the answer isn't in the document, say so honestly rather than guessing.

DOCUMENT TEXT:
"""
${truncate(docText, 15000)}
"""

PRIOR ANALYSIS:
Summary: ${analysis?.summary || "N/A"}
Requirements: ${(analysis?.requirements || []).join("; ") || "None"}
Deadlines: ${(analysis?.deadlines || []).map((d) => `${d.label} (${d.date || d.rawText})`).join("; ") || "None"}
Risks: ${(analysis?.risks || []).map((r) => r.description).join("; ") || "None"}

CONVERSATION SO FAR:
${historyText || "(no prior messages)"}

User's new question: ${question}

Respond conversationally and concisely.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    throw new ApiError(502, `Gemini API request failed during chat: ${err.message}`);
  }
};

export default { analyzeDocument, generateEmail, chatAboutDocument };
