/**
 * OLIVIA KNOWLEDGE BASE SYNC API
 *
 * POST /api/admin/sync-olivia-knowledge
 *
 * Uploads the knowledge base file to OpenAI Assistant.
 * Protected by admin email check.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_3wbVjyY629u7fDylaK0s5gsM';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

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

async function updateAssistantWithFile(apiKey: string, fileId: string): Promise<any> {
  // OpenAI Assistants v2 uses tool_resources for file attachments
  // We need to create/update a vector store for file_search

  // First, create a vector store with the file
  const vectorStoreResponse = await fetch(`${OPENAI_API_BASE}/vector_stores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: 'Olivia Knowledge Base',
      file_ids: [fileId],
    }),
  });

  if (!vectorStoreResponse.ok) {
    const error = await vectorStoreResponse.text();
    throw new Error(`Failed to create vector store: ${error}`);
  }

  const vectorStore = await vectorStoreResponse.json();
  console.log(`[SYNC] Created vector store: ${vectorStore.id}`);

  // Update assistant to use this vector store
  const response = await fetch(`${OPENAI_API_BASE}/assistants/${ASSISTANT_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${error}`);
  }

  const result = await response.json();
  return { ...result, vectorStoreId: vectorStore.id };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - restricted to deployment origin only
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://lifescore.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', origin);
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
    // Verify JWT Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Verify user has admin role via profile tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, email')
      .eq('id', user.id)
      .maybeSingle();

    const userEmail = user.email || profile?.email || '';
    const isAdmin = profile?.tier === 'enterprise' && ADMIN_EMAILS.length > 0
      ? ADMIN_EMAILS.includes(userEmail)
      : profile?.tier === 'enterprise';

    if (!isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    console.log(`[SYNC] Admin request from verified user: ${user.id}`);

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

    // Update assistant with the new file via vector store (v2 API)
    const updatedAssistant = await updateAssistantWithFile(apiKey, newFile.id);
    console.log(`[SYNC] Assistant updated with vector store: ${updatedAssistant.vectorStoreId}`);

    res.status(200).json({
      success: true,
      message: 'Olivia knowledge base synced successfully',
      fileId: newFile.id,
      vectorStoreId: updatedAssistant.vectorStoreId,
      fileSize: `${(fileSize / 1024).toFixed(1)} KB`,
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
