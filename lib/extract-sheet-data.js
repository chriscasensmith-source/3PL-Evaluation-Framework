'use strict';

const { analyzeImages } = require('./ai-provider');

const EXTRACTION_PROMPT = `You are analyzing uploaded photos of paper format sheets. \
Extract all visible text and layout information. \
Preserve uploaded image order and preserve order from top to bottom and left to right. \
Identify document title, headings, sections, field labels, field values, blank fields, tables, \
table columns, table rows, checkboxes, selected options, option lists, handwritten notes, \
repeated patterns, formatting notes, unclear areas, warnings, and assumptions. \
Do not invent missing information. \
Mark unreadable content as [unclear]. \
Return structured JSON only — no markdown, no explanation, no code fences.

The JSON must conform exactly to this shape:
{
  "title": "string or [unclear]",
  "pages": [
    {
      "pageNumber": 1,
      "sections": [
        {
          "heading": "string or null",
          "fields": [
            {
              "label": "string",
              "value": "string | blank | [unclear]",
              "type": "text | number | date | checkbox | dropdown | table | signature | unknown"
            }
          ],
          "tables": [
            {
              "title": "string or null",
              "columns": ["string"],
              "rows": [["cell value"]]
            }
          ],
          "checkboxes": [
            {
              "label": "string",
              "checked": true | false | null
            }
          ],
          "handwrittenNotes": ["string"],
          "formattingNotes": ["string"]
        }
      ]
    }
  ],
  "warnings": ["string"],
  "assumptions": ["string"]
}`;

/**
 * Sends uploaded images to the AI provider and returns structured extraction data.
 *
 * @param {import('multer').File[]} files  Multer files in upload order.
 * @param {string} context                 Optional user-supplied context notes.
 * @returns {Promise<import('../types').ExtractedSheetData>}
 */
async function extractSheetDataFromImages(files, context) {
  const imageBuffers = files.map((f) => ({
    data: f.buffer,
    mimetype: f.mimetype,
  }));

  const promptWithContext = context
    ? `${EXTRACTION_PROMPT}\n\nAdditional context from the user: ${context}`
    : EXTRACTION_PROMPT;

  const raw = await analyzeImages(imageBuffers, promptWithContext);

  return parseExtractionResponse(raw, files.length);
}

/**
 * Parses the AI text response into ExtractedSheetData.
 * Gracefully handles responses that wrap JSON in markdown code fences.
 *
 * @param {string} raw
 * @param {number} fileCount
 * @returns {import('../types').ExtractedSheetData}
 */
function parseExtractionResponse(raw, fileCount) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Non-JSON response — wrap whatever text came back so generation can still proceed.
    return {
      title: '[unclear]',
      pages: [
        {
          pageNumber: 1,
          sections: [
            {
              heading: null,
              fields: [],
              tables: [],
              checkboxes: [],
              handwrittenNotes: [cleaned.slice(0, 2000)],
              formattingNotes: [],
            },
          ],
        },
      ],
      warnings: [
        'The AI provider did not return valid JSON. The raw response has been preserved as a note.',
        `Analysed ${fileCount} image(s).`,
      ],
      assumptions: [],
    };
  }

  // Normalise — fill in any missing top-level keys defensively.
  return {
    title: parsed.title ?? '[unclear]',
    pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
  };
}

module.exports = { extractSheetDataFromImages, EXTRACTION_PROMPT };
