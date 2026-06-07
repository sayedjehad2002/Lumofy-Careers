// Shared file validation with magic byte detection for enterprise security

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Magic bytes for supported file types
const MAGIC_BYTES: { type: string; bytes: number[]; offset?: number }[] = [
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { type: "application/msword", bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA5, 0xB1, 0x1A, 0xE1] }, // OLE2 (DOC)
  { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: [0x50, 0x4B, 0x03, 0x04] }, // PK (ZIP/DOCX)
];

// Dangerous extensions to reject outright
const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "vbs", "vbe",
  "js", "jse", "wsf", "wsh", "ps1", "sh", "bash", "csh",
  "dll", "sys", "drv", "bin", "app", "dmg",
  "php", "py", "rb", "pl", "jar", "class",
  "html", "htm", "svg", "xml",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  sanitizedName?: string;
}

function matchesMagicBytes(buffer: Uint8Array): string | null {
  for (const magic of MAGIC_BYTES) {
    const offset = magic.offset || 0;
    if (buffer.length < offset + magic.bytes.length) continue;
    const matches = magic.bytes.every((b, i) => buffer[offset + i] === b);
    if (matches) return magic.type;
  }
  return null;
}

export function validateFile(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // 1. Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size must be under ${Math.round(maxSize / 1024 / 1024)}MB` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  // 2. Check extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "File type is not allowed. Only PDF, DOC, DOCX accepted." };
  }

  if (!["pdf", "doc", "docx"].includes(ext)) {
    return { valid: false, error: "Unsupported file type. Only PDF, DOC, DOCX allowed." };
  }

  // 3. Check MIME type
  let contentType = file.type;
  if (!contentType || contentType === "application/octet-stream") {
    if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "doc") contentType = "application/msword";
    else if (ext === "docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    return { valid: false, error: "Invalid MIME type. Only PDF, DOC, DOCX allowed." };
  }

  // 4. Sanitize filename (strip special chars, limit length)
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .slice(0, 100);
  const sanitizedName = `${baseName || "document"}.${ext}`;

  return { valid: true, detectedType: contentType, sanitizedName };
}

export async function validateFileWithMagicBytes(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): Promise<FileValidationResult> {
  // Run basic validation first
  const basicResult = validateFile(file, maxSize);
  if (!basicResult.valid) return basicResult;

  // Read first 8 bytes for magic byte validation
  try {
    const buffer = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const detectedType = matchesMagicBytes(buffer);

    if (!detectedType) {
      return { valid: false, error: "File content does not match expected format. Possible disguised file." };
    }

    // For DOCX (PK/ZIP), allow it since DOCX uses ZIP container
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "docx" && detectedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // DOCX is ZIP-based, magic bytes match
    } else if (ext === "doc" && detectedType === "application/msword") {
      // DOC OLE2 match
    } else if (ext === "pdf" && detectedType === "application/pdf") {
      // PDF match
    } else if (detectedType) {
      // Magic bytes match some allowed type, accept
    } else {
      return { valid: false, error: "File content does not match its extension." };
    }

    return { ...basicResult, detectedType };
  } catch (e) {
    // SECURITY: fail CLOSED. If we cannot read the file bytes to verify the magic
    // signature, we must NOT trust the extension/MIME alone — an unreadable or
    // truncated upload could be a disguised payload. Reject rather than fall back
    // to the (passed) basic validation.
    console.error("validateFileWithMagicBytes: read error, failing closed:", e);
    return { valid: false, error: "Could not verify file contents. Please re-upload the file." };
  }
}

export { MAX_FILE_SIZE, ALLOWED_TYPES };
