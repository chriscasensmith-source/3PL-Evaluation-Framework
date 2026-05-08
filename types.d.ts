// Shared TypeScript type definitions for the Photo-to-Parable feature.
// These are documentation-only — the runtime code is plain JavaScript.

// ── Upload / validation ───────────────────────────────────────────────────────

export interface UploadedImageMetadata {
  /** Original filename as provided by the browser. */
  name: string;
  /** File size in bytes. */
  size: number;
  /** Human-readable size, e.g. "2.4 MB". */
  sizeStr: string;
  /** MIME type — one of image/jpeg, image/png, image/webp. */
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Object URL created by URL.createObjectURL() for preview rendering. */
  previewUrl: string;
  /** Unique client-side identifier. */
  id: string;
}

// ── Extraction data shapes ────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'dropdown'
  | 'table'
  | 'signature'
  | 'unknown';

export interface ExtractedField {
  label: string;
  /** Observed value, "blank" if empty, or "[unclear]" if unreadable. */
  value: string;
  type: FieldType;
}

export interface ExtractedTable {
  title: string | null;
  columns: string[];
  /** Each element is an ordered array of cell values for one row. */
  rows: string[][];
}

export interface ExtractedCheckbox {
  label: string;
  /** true = checked, false = unchecked, null = [unclear]. */
  checked: boolean | null;
}

export interface ExtractedSection {
  heading: string | null;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  checkboxes: ExtractedCheckbox[];
  handwrittenNotes: string[];
  formattingNotes: string[];
}

export interface ExtractedPage {
  pageNumber: number;
  sections: ExtractedSection[];
}

export type ExtractionWarning = string;
export type ExtractionAssumption = string;

export interface ExtractedSheetData {
  title: string;
  pages: ExtractedPage[];
  warnings: ExtractionWarning[];
  assumptions: ExtractionAssumption[];
}

// ── API response ──────────────────────────────────────────────────────────────

export interface GenerateParableInstructionsResponse {
  success: boolean;
  extractedData: ExtractedSheetData | null;
  /** Parable-ready plain-text instructions. Empty string on failure. */
  instructions: string;
  warnings: string[];
  error: string | null;
}
