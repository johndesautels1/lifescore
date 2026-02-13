/**
 * EMILIA KNOWLEDGE BASE SYNC API
 *
 * POST /api/admin/sync-emilia-knowledge
 *
 * Uploads all 6 manuals to the Emilia OpenAI Assistant's vector store.
 * Protected by admin email check.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { promises as fs } from 'fs';
import path from 'path';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'cluesnomads@gmail.com,brokerpinellas@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// The 6 manuals Emilia needs
const MANUAL_FILES = [
  'USER_MANUAL.md',
  'CUSTOMER_SERVICE_MANUAL.md',
  'TECHNICAL_SUPPORT_MANUAL.md',
  'LEGAL_COMPLIANCE_MANUAL.md',
  'APP_SCHEMA_MANUAL.md',
  'JUDGE_EQUATIONS_MANUAL.md',
];

interface UploadedFile {
  id: string;
  filename: string;
  bytes: number;
}

async function uploadFileToOpenAI(apiKey: string, content: string, filename: string): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', new Blob([content], { type: 'text/markdown' }), filename);
  formData.append('purpose', 'assistants');

  const response = await fetch(`${OPENAI_API_BASE}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload ${filename}: ${error}`);
  }

  return response.json();
}

async function createVectorStore(apiKey: string, fileIds: string[]): Promise<string> {
  const response = await fetch(`${OPENAI_API_BASE}/vector_stores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: `Emilia Help Knowledge Base (${new Date().toISOString().split('T')[0]})`,
      file_ids: fileIds,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create vector store: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

async function updateAssistant(apiKey: string, assistantId: string, vectorStoreId: string): Promise<void> {
  const response = await fetch(`${OPENAI_API_BASE}/assistants/${assistantId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${error}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Auth + admin check
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!ADMIN_EMAILS.includes(auth.email.toLowerCase())) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.EMILIA_ASSISTANT_ID;

  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    return;
  }
  if (!assistantId) {
    res.status(500).json({ error: 'EMILIA_ASSISTANT_ID not configured' });
    return;
  }

  try {
    console.log(`[EMILIA-SYNC] Admin ${auth.email} triggered knowledge base sync`);

    // Read and upload each manual
    const uploaded: UploadedFile[] = [];
    const manualsDir = path.join(process.cwd(), 'docs', 'manuals');

    for (const filename of MANUAL_FILES) {
      let content: string;
      try {
        content = await fs.readFile(path.join(manualsDir, filename), 'utf-8');
      } catch {
        // Try alternative path for Vercel
        const altPath = path.join(__dirname, '..', '..', 'docs', 'manuals', filename);
        try {
          content = await fs.readFile(altPath, 'utf-8');
        } catch {
          console.warn(`[EMILIA-SYNC] Skipping ${filename} — file not found`);
          continue;
        }
      }

      const file = await uploadFileToOpenAI(apiKey, content, filename);
      console.log(`[EMILIA-SYNC] Uploaded ${filename}: ${file.id} (${(file.bytes / 1024).toFixed(1)} KB)`);
      uploaded.push(file);
    }

    if (uploaded.length === 0) {
      res.status(500).json({ error: 'No manual files could be uploaded' });
      return;
    }

    // Create vector store with all files
    const fileIds = uploaded.map(f => f.id);
    const vectorStoreId = await createVectorStore(apiKey, fileIds);
    console.log(`[EMILIA-SYNC] Vector store created: ${vectorStoreId}`);

    // Update Emilia assistant
    await updateAssistant(apiKey, assistantId, vectorStoreId);
    console.log(`[EMILIA-SYNC] Assistant ${assistantId} updated with vector store ${vectorStoreId}`);

    res.status(200).json({
      success: true,
      message: `Emilia knowledge base synced: ${uploaded.length} manuals uploaded`,
      filesUploaded: uploaded.map(f => ({ name: f.filename, id: f.id, size: `${(f.bytes / 1024).toFixed(1)} KB` })),
      vectorStoreId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[EMILIA-SYNC] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}
