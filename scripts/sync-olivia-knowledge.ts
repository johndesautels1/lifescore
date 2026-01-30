/**
 * OLIVIA KNOWLEDGE BASE SYNC SCRIPT
 *
 * This script uploads the OLIVIA_KNOWLEDGE_BASE.md file to the OpenAI Assistant.
 * Run after any manual updates or as part of deployment.
 *
 * Usage: npx ts-node scripts/sync-olivia-knowledge.ts
 *
 * Requirements:
 * - OPENAI_API_KEY environment variable set
 * - OPENAI_ASSISTANT_ID environment variable (or uses default)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_3wbVjyY629u7fDylaK0s5gsM';
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'docs', 'OLIVIA_KNOWLEDGE_BASE.md');

interface FileObject {
  id: string;
  filename: string;
  created_at: number;
}

interface AssistantFile {
  id: string;
  object: string;
}

async function getApiKey(): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return key;
}

async function uploadFile(apiKey: string, filePath: string): Promise<FileObject> {
  console.log('📤 Uploading knowledge base file...');

  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileContent]), 'OLIVIA_KNOWLEDGE_BASE.md');
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

  const data = await response.json();
  console.log(`✅ File uploaded: ${data.id}`);
  return data;
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

async function updateAssistantFiles(apiKey: string, fileId: string): Promise<void> {
  console.log('🔄 Updating assistant with new knowledge base...');

  // Get current assistant to preserve other settings
  const assistant = await getAssistant(apiKey);

  // Get existing file_ids from tool_resources
  const existingFileIds = assistant.tool_resources?.file_search?.vector_store_ids || [];

  // Update assistant with new file
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
          vector_store_ids: existingFileIds,
        },
      },
      // Add the file to file_search
      file_ids: [fileId],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${error}`);
  }

  console.log('✅ Assistant updated with new knowledge base');
}

async function listAssistantFiles(apiKey: string): Promise<string[]> {
  const assistant = await getAssistant(apiKey);
  return assistant.file_ids || [];
}

async function deleteOldFiles(apiKey: string, keepFileId: string): Promise<void> {
  console.log('🗑️ Cleaning up old knowledge base files...');

  const fileIds = await listAssistantFiles(apiKey);

  for (const fileId of fileIds) {
    if (fileId !== keepFileId) {
      try {
        await fetch(`${OPENAI_API_BASE}/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        console.log(`  Deleted old file: ${fileId}`);
      } catch (e) {
        console.warn(`  Could not delete file ${fileId}:`, e);
      }
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  OLIVIA KNOWLEDGE BASE SYNC');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Assistant ID: ${ASSISTANT_ID}`);
  console.log(`  Knowledge Base: ${KNOWLEDGE_BASE_PATH}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Check file exists
  if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
    throw new Error(`Knowledge base file not found: ${KNOWLEDGE_BASE_PATH}`);
  }

  const stats = fs.statSync(KNOWLEDGE_BASE_PATH);
  console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`📅 Last modified: ${stats.mtime.toISOString()}\n`);

  const apiKey = await getApiKey();

  // Upload new file
  const newFile = await uploadFile(apiKey, KNOWLEDGE_BASE_PATH);

  // Update assistant
  await updateAssistantFiles(apiKey, newFile.id);

  // Clean up old files (optional - comment out if you want to keep history)
  // await deleteOldFiles(apiKey, newFile.id);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SYNC COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  New file ID: ${newFile.id}`);
  console.log('  Olivia now has updated knowledge!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ SYNC FAILED:', error.message);
  process.exit(1);
});
