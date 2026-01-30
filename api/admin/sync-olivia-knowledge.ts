/**
 * OLIVIA KNOWLEDGE BASE SYNC API
 *
 * POST /api/admin/sync-olivia-knowledge
 *
 * Uploads the knowledge base file to OpenAI Assistant.
 * Protected by admin email check.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_3wbVjyY629u7fDylaK0s5gsM';
const ADMIN_EMAILS = ['brokerpinellas@gmail.com', 'cluesnomads@gmail.com'];

interface FileObject {
  id: string;
  filename: string;
  bytes: number;
  created_at: number;
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return key;
}

async function uploadFile(apiKey: string, content: string, filename: string): Promise<FileObject> {
  const formData = new FormData();
  formData.append('file', new Blob([content], { type: 'text/markdown' }), filename);
  formData.append('purpose', 'assistants');

  const response = await fetch(`${OPENAI_API_BASE}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  return response.json();
}

async function getAssistant(apiKey: string): Promise<any> {
  const response = await fetch(`${OPENAI_API_BASE}/assistants/${ASSISTANT_ID}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get assistant: ${error}`);
  }

  return response.json();
}

async function updateAssistant(apiKey: string, fileIds: string[]): Promise<any> {
  const response = await fetch(`${OPENAI_API_BASE}/assistants/${ASSISTANT_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      file_ids: fileIds,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${error}`);
  }

  return response.json();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Simple admin check - in production you'd verify a JWT
    const { adminEmail } = req.body || {};
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const apiKey = getOpenAIKey();

    // Read knowledge base from the deployed files
    // In Vercel, we need to read from the build output
    const knowledgeBasePath = path.join(process.cwd(), 'docs', 'OLIVIA_KNOWLEDGE_BASE.md');

    let content: string;
    try {
      content = fs.readFileSync(knowledgeBasePath, 'utf-8');
    } catch (e) {
      // Try alternative path for Vercel
      const altPath = path.join(__dirname, '..', '..', 'docs', 'OLIVIA_KNOWLEDGE_BASE.md');
      content = fs.readFileSync(altPath, 'utf-8');
    }

    const fileSize = Buffer.byteLength(content, 'utf-8');
    console.log(`[SYNC] Knowledge base size: ${(fileSize / 1024).toFixed(1)} KB`);

    // Upload new file
    const newFile = await uploadFile(apiKey, content, 'OLIVIA_KNOWLEDGE_BASE.md');
    console.log(`[SYNC] Uploaded file: ${newFile.id}`);

    // Get current assistant
    const assistant = await getAssistant(apiKey);
    const existingFileIds = assistant.file_ids || [];

    // Add new file (keeping old ones for now - OpenAI will use latest)
    const updatedAssistant = await updateAssistant(apiKey, [...existingFileIds, newFile.id]);
    console.log(`[SYNC] Assistant updated with ${updatedAssistant.file_ids?.length} files`);

    res.status(200).json({
      success: true,
      message: 'Olivia knowledge base synced successfully',
      fileId: newFile.id,
      fileSize: `${(fileSize / 1024).toFixed(1)} KB`,
      totalFiles: updatedAssistant.file_ids?.length || 1,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[SYNC] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
}
