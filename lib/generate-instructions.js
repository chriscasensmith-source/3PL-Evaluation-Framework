'use strict';

const { generateText } = require('./ai-provider');

const GENERATION_PROMPT = `Convert the extracted sheet data into copy-and-paste instructions for Parable. \
Use direct, clear instructions. \
Preserve the original sheet structure and order. \
Include title, sections, fields, values, blank fields, tables, columns, selected checkboxes, \
formatting notes, unclear items, warnings, and assumptions. \
Do not invent missing information. \
Use user context only when it clarifies the intended output. \
Output plain text only — no JSON, no markdown formatting, no code fences.

Use the following output format exactly:

Create a Parable format using the following structure:

Title:
[Detected title]

Source notes:
- Generated from [N] uploaded image(s).
- Items marked [unclear] were unreadable or uncertain.

Sections:
[For each section and field, use:]
N. [Section name]
   - Add field: [field name]
     - Field type: [text / number / date / checkbox / dropdown / table / signature / unknown]
     - Visible value or default: [value / blank / [unclear]]
     - Notes: [placement or formatting notes, if any]

Tables:
[For each table:]
- Add table: [table title or "Untitled table"]
  - Columns:
    - [Column 1]
    - [Column 2]
    ...
  - Example rows:
    - [Row 1 values]
    ...

Checkboxes:
[For each checkbox:]
- [Checkbox label]: checked / unchecked / [unclear]

Handwritten notes:
[List each note, or omit this section if none]

Formatting instructions:
- Preserve section order.
- Use the same field labels where readable.
- Keep blank fields available for user entry.
- Review all [unclear] items before finalising.

Warnings:
[List each warning, or omit this section if none]

Assumptions:
[List each assumption, or omit this section if none]`;

/**
 * Generates Parable-ready plain-text instructions from extracted sheet data.
 * Calls the AI a second time so the generation prompt can reason over the full
 * structured JSON rather than relying on a single multi-task prompt.
 *
 * @param {import('../types').ExtractedSheetData} extractedData
 * @param {string} context  User-supplied context notes (may be empty string).
 * @returns {Promise<string>}
 */
async function generateParableInstructions(extractedData, context) {
  const pageCount = Array.isArray(extractedData.pages) ? extractedData.pages.length : 0;

  const payload = JSON.stringify(extractedData, null, 2);

  const contextSection = context
    ? `\n\nUser context: ${context}`
    : '';

  const prompt =
    `${GENERATION_PROMPT}${contextSection}\n\n` +
    `Extracted data (${pageCount} page(s)):\n${payload}`;

  const text = await generateText(prompt);

  return text.trim();
}

module.exports = { generateParableInstructions, GENERATION_PROMPT };
