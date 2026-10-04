/**
 * LIFE SCORE - Olivia's and Emilia's instructions and knowledge, read from docs/.
 *
 * Until 2026-08-26 these files were uploaded to OpenAI Assistants with a "sync"
 * button; OpenAI switched that service off. Claude now reads the files straight
 * from the deployment, so editing a doc and pushing is all it takes — there is
 * nothing to sync.
 *
 * Each path is a literal `new URL(..., import.meta.url)` so Vercel's file tracer
 * bundles the document with the functions that import this module. The admin
 * panel's "Check knowledge" button (/api/admin/knowledge-status) proves they arrived.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillManualFacts } from './manualFacts.js';

interface KnowledgeFile {
  /** Path from the repository root, for logs and the admin check. */
  name: string;
  url: URL;
}

const OLIVIA_FILES: readonly KnowledgeFile[] = [
  { name: 'docs/OLIVIA_GPT_INSTRUCTIONS.md', url: new URL('../../docs/OLIVIA_GPT_INSTRUCTIONS.md', import.meta.url) },
  { name: 'docs/OLIVIA_KNOWLEDGE_BASE.md', url: new URL('../../docs/OLIVIA_KNOWLEDGE_BASE.md', import.meta.url) },
];

const EMILIA_FILES: readonly KnowledgeFile[] = [
  { name: 'docs/EMILIA_INSTRUCTIONS.md', url: new URL('../../docs/EMILIA_INSTRUCTIONS.md', import.meta.url) },
  { name: 'docs/manuals/USER_MANUAL.md', url: new URL('../../docs/manuals/USER_MANUAL.md', import.meta.url) },
  { name: 'docs/manuals/CUSTOMER_SERVICE_MANUAL.md', url: new URL('../../docs/manuals/CUSTOMER_SERVICE_MANUAL.md', import.meta.url) },
  { name: 'docs/manuals/TECHNICAL_SUPPORT_MANUAL.md', url: new URL('../../docs/manuals/TECHNICAL_SUPPORT_MANUAL.md', import.meta.url) },
  { name: 'docs/manuals/LEGAL_COMPLIANCE_MANUAL.md', url: new URL('../../docs/manuals/LEGAL_COMPLIANCE_MANUAL.md', import.meta.url) },
  { name: 'docs/manuals/APP_SCHEMA_MANUAL.md', url: new URL('../../docs/manuals/APP_SCHEMA_MANUAL.md', import.meta.url) },
];

const cache = new Map<string, string>();

/** Read one file: next to this module first, then from the working directory. Null when missing. */
function readKnowledgeFile(file: KnowledgeFile): string | null {
  const cached = cache.get(file.name);
  if (cached !== undefined) return cached;
  for (const path of [fileURLToPath(file.url), join(process.cwd(), file.name)]) {
    try {
      // Facts the code defines (routes, settings, plans…) are written in from this deployment.
      const text = fillManualFacts(readFileSync(path, 'utf8'));
      cache.set(file.name, text);
      return text;
    } catch {
      /* try the next location */
    }
  }
  console.error(`[knowledge] missing from this deployment: ${file.name}`);
  return null;
}

export type Assistant = 'olivia' | 'emilia';

export type KnowledgeResult =
  | { ok: true; text: string; files: Array<{ name: string; chars: number }> }
  | { ok: false; missing: string[] };

/**
 * One assistant's instructions followed by its knowledge, as a single text
 * block (cached by Claude, so the large documents are billed in full only
 * when they change).
 */
export function loadKnowledge(assistant: Assistant): KnowledgeResult {
  const files = assistant === 'olivia' ? OLIVIA_FILES : EMILIA_FILES;
  const parts: string[] = [];
  const found: Array<{ name: string; chars: number }> = [];
  const missing: string[] = [];
  files.forEach((file, index) => {
    const text = readKnowledgeFile(file);
    if (text === null) {
      missing.push(file.name);
      return;
    }
    found.push({ name: file.name, chars: text.length });
    // The first file is the instructions; the rest are reference documents.
    parts.push(index === 0 ? text : `<document name="${file.name}">\n${text}\n</document>`);
  });
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, text: parts.join('\n\n'), files: found };
}
