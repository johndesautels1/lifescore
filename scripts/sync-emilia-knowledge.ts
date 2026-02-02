/**
 * EMILIA KNOWLEDGE BASE SYNC SCRIPT
 *
 * This script uploads all 4 manuals to the Emilia OpenAI Assistant.
 * Run after any manual updates or as part of deployment.
 *
 * Usage: npx ts-node scripts/sync-emilia-knowledge.ts
 *
 * Requirements:
 * - OPENAI_API_KEY environment variable set
 * - EMILIA_ASSISTANT_ID environment variable (required)
 *
 * Files uploaded:
 * 1. USER_MANUAL.md
 * 2. CUSTOMER_SERVICE_MANUAL.md
 * 3. TECHNICAL_SUPPORT_MANUAL.md
 * 4. LEGAL_COMPLIANCE_MANUAL.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const ASSISTANT_ID = process.env.EMILIA_ASSISTANT_ID;

// All 4 manuals that Emilia needs to know
const MANUAL_FILES = [
  { name: 'USER_MANUAL.md', path: path.join(__dirname, '..', 'docs', 'manuals', 'USER_MANUAL.md') },
  { name: 'CUSTOMER_SERVICE_MANUAL.md', path: path.join(__dirname, '..', 'docs', 'manuals', 'CUSTOMER_SERVICE_MANUAL.md') },
  { name: 'TECHNICAL_SUPPORT_MANUAL.md', path: path.join(__dirname, '..', 'docs', 'manuals', 'TECHNICAL_SUPPORT_MANUAL.md') },
  { name: 'LEGAL_COMPLIANCE_MANUAL.md', path: path.join(__dirname, '..', 'docs', 'manuals', 'LEGAL_COMPLIANCE_MANUAL.md') },
];

interface FileObject {
  id: string;
  filename: string;
  created_at: number;
}

async function getApiKey(): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return key;
}

async function uploadFile(apiKey: string, filePath: string, fileName: string): Promise<FileObject> {
  console.log(`  📤 Uploading ${fileName}...`);

  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileContent]), fileName);
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
    throw new Error(`Failed to upload ${fileName}: ${error}`);
  }

  const data = await response.json();
  console.log(`  ✅ Uploaded: ${data.id}`);
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

async function createVectorStore(apiKey: string, fileIds: string[]): Promise<string> {
  console.log('\n📦 Creating vector store for Emilia...');

  const response = await fetch(`${OPENAI_API_BASE}/vector_stores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: 'Emilia Help Knowledge Base',
      file_ids: fileIds,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create vector store: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Vector store created: ${data.id}`);
  return data.id;
}

async function updateAssistantWithVectorStore(apiKey: string, vectorStoreId: string): Promise<void> {
  console.log('\n🔄 Updating Emilia assistant with new knowledge base...');

  const response = await fetch(`${OPENAI_API_BASE}/assistants/${ASSISTANT_ID}`, {
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

  console.log('✅ Assistant updated with new knowledge base');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  EMILIA KNOWLEDGE BASE SYNC');
  console.log('═══════════════════════════════════════════════════════');

  if (!ASSISTANT_ID) {
    throw new Error('EMILIA_ASSISTANT_ID environment variable is required');
  }

  console.log(`  Assistant ID: ${ASSISTANT_ID}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Check all files exist
  console.log('📁 Checking manual files...');
  for (const file of MANUAL_FILES) {
    if (!fs.existsSync(file.path)) {
      throw new Error(`Manual file not found: ${file.path}`);
    }
    const stats = fs.statSync(file.path);
    console.log(`  ✓ ${file.name} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  const apiKey = await getApiKey();

  // Upload all files
  console.log('\n📤 Uploading manuals to OpenAI...');
  const uploadedFiles: FileObject[] = [];

  for (const file of MANUAL_FILES) {
    const uploaded = await uploadFile(apiKey, file.path, file.name);
    uploadedFiles.push(uploaded);
  }

  // Create vector store with all files
  const fileIds = uploadedFiles.map(f => f.id);
  const vectorStoreId = await createVectorStore(apiKey, fileIds);

  // Update assistant
  await updateAssistantWithVectorStore(apiKey, vectorStoreId);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ SYNC COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Files uploaded:');
  uploadedFiles.forEach(f => console.log(`    - ${f.filename}: ${f.id}`));
  console.log(`  Vector Store ID: ${vectorStoreId}`);
  console.log('\n  Emilia now has knowledge of all 4 manuals!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n❌ SYNC FAILED:', error.message);
  process.exit(1);
});
