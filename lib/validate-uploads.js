'use strict';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

/**
 * Validates an array of multer file objects.
 *
 * @param {import('multer').File[]} files
 * @returns {{ valid: boolean; error: string | null }}
 */
function validateUploadedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { valid: false, error: 'No files uploaded. Please upload at least one image.' };
  }

  if (files.length > MAX_FILES) {
    return {
      valid: false,
      error: `Too many files (${files.length}). Maximum ${MAX_FILES} files allowed per request.`,
    };
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Unsupported file type "${file.mimetype}" in "${file.originalname}". Supported types: JPEG, PNG, WebP.`,
      };
    }

    if (file.size > MAX_SIZE_BYTES) {
      const mb = (file.size / 1048576).toFixed(1);
      return {
        valid: false,
        error: `"${file.originalname}" is ${mb} MB which exceeds the 10 MB per-file limit.`,
      };
    }
  }

  return { valid: true, error: null };
}

module.exports = { validateUploadedFiles, ALLOWED_TYPES, MAX_SIZE_BYTES, MAX_FILES };
