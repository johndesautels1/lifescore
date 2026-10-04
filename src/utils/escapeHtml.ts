/**
 * LIFE SCORE - text made safe to place inside HTML the app writes itself.
 *
 * Used where the browser builds a page from text it did not write: the manual
 * viewer (ManualViewer.tsx escapes a manual before converting its markdown) and
 * the PDF export (exportUtils.ts places the judge's AI-written explanations in
 * a page opened from the app).
 */

/** & < > " become entities, so the text can never become a tag or an attribute. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
