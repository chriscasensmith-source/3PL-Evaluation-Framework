'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const multer = require('multer');

const { validateUploadedFiles } = require('./lib/validate-uploads');
const { extractSheetDataFromImages } = require('./lib/extract-sheet-data');
const { generateParableInstructions } = require('./lib/generate-instructions');

const PORT = process.env.PORT || 3000;

const app = express();

// ── Static file serving ──────────────────────────────────────────────────────
// Serves index.html, photo-converter.html, and any other static assets from
// the project root.
app.use(express.static(path.join(__dirname)));

// ── Multer — memory storage, per-file size limit enforced by middleware ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB — validated again in validateUploadedFiles
    files: 5,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** @returns {import('./types').GenerateParableInstructionsResponse} */
function failureResponse(error, warnings = []) {
  return { success: false, extractedData: null, instructions: '', warnings, error };
}

/** @returns {import('./types').GenerateParableInstructionsResponse} */
function successResponse(extractedData, instructions, warnings = []) {
  return { success: true, extractedData, instructions, warnings, error: null };
}

// ── POST /api/generate-parable-instructions ───────────────────────────────────
app.post(
  '/api/generate-parable-instructions',
  (req, res, next) => {
    // Run multer first so we can catch its own errors cleanly.
    upload.array('files', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_COUNT'
            ? 'Too many files. Maximum 5 files are allowed per request.'
            : err.code === 'LIMIT_FILE_SIZE'
            ? 'One or more files exceed the 10 MB size limit.'
            : `Upload error: ${err.message}`;
        return res.status(400).json(failureResponse(msg));
      }
      if (err) return next(err);
      next();
    });
  },
  async (req, res) => {
    const files = /** @type {import('multer').File[]} */ (req.files || []);
    const context = typeof req.body.context === 'string' ? req.body.context.trim() : '';

    // ── Client-side re-validation (type + count + size) ──────────────────────
    const validation = validateUploadedFiles(files);
    if (!validation.valid) {
      return res.status(400).json(failureResponse(validation.error));
    }

    // ── Extraction ───────────────────────────────────────────────────────────
    let extractedData;
    try {
      extractedData = await extractSheetDataFromImages(files, context);
    } catch (err) {
      const msg = classifyProviderError(err);
      return res.status(502).json(failureResponse(msg));
    }

    // ── Generation ───────────────────────────────────────────────────────────
    let instructions;
    try {
      instructions = await generateParableInstructions(extractedData, context);
    } catch (err) {
      const msg = classifyProviderError(err);
      return res.status(502).json(failureResponse(msg));
    }

    const allWarnings = [
      ...(extractedData.warnings || []),
      // Bubble up any [unclear] notice so it's visible even if warnings array is empty.
      ...(instructions.includes('[unclear]')
        ? ['Some items were marked [unclear]. Review before pasting into Parable.']
        : []),
    ];

    return res.json(successResponse(extractedData, instructions, allWarnings));
  }
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json(failureResponse('An unexpected server error occurred. Please try again.'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  3PL Evaluation Framework`);
  console.log(`  http://localhost:${PORT}                  — Main app`);
  console.log(`  http://localhost:${PORT}/photo-converter.html — Photo to Parable\n`);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps raw provider errors to user-friendly messages.
 * @param {Error} err
 * @returns {string}
 */
function classifyProviderError(err) {
  const msg = err.message || '';

  if (msg.includes('ANTHROPIC_API_KEY')) return msg; // already formatted

  if (
    err.constructor?.name === 'AuthenticationError' ||
    msg.toLowerCase().includes('authentication') ||
    msg.toLowerCase().includes('invalid x-api-key')
  ) {
    return 'Invalid Anthropic API key. Check the ANTHROPIC_API_KEY value in your .env file.';
  }

  if (
    err.constructor?.name === 'RateLimitError' ||
    msg.toLowerCase().includes('rate limit')
  ) {
    return 'Anthropic API rate limit reached. Please wait a moment and try again.';
  }

  if (
    err.constructor?.name === 'APITimeoutError' ||
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('timed out')
  ) {
    return 'The AI provider timed out. The images may be too complex or the service is under load. Please try again.';
  }

  if (
    msg.toLowerCase().includes('could not process image') ||
    msg.toLowerCase().includes('invalid image')
  ) {
    return 'One or more images could not be processed. Ensure they are valid JPEG, PNG, or WebP files and try again.';
  }

  console.error('Provider error:', err);
  return `AI provider error: ${msg || 'Unknown error. Check server logs for details.'}`;
}
