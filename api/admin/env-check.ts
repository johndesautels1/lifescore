/**
 * LIFE SCORE - Admin Environment Variable Status API
 *
 * Returns the configuration status of all environment variables used by the app.
 * Admin-only endpoint — requires JWT auth + admin email check.
 *
 * For each variable, returns:
 * - name: The env var name
 * - configured: Whether it has a value set
 * - preview: Masked preview (first 4 + last 2 chars) for non-empty vars
 *
 * GET /api/admin/env-check
 * Returns: { variables: EnvVarStatus[] }
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

// ============================================================================
// ADMIN CHECK
// ============================================================================

function getAdminEmails(): string[] {
  const envEmails = (process.env.DEV_BYPASS_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const fallbackEmails = ['brokerpinellas@gmail.com', 'cluesnomads@gmail.com', 'jdes7@aol.com'];
  return [...new Set([...envEmails, ...fallbackEmails])];
}

// ============================================================================
// ENV VARIABLE REGISTRY — Every env var the app uses, grouped by category
// ============================================================================

interface EnvVarDef {
  name: string;
  description: string;
  category: string;
  side: 'server' | 'client';
}

const ENV_VARS: EnvVarDef[] = [
  // --- Database & Auth ---
  { name: 'SUPABASE_URL', description: 'Supabase project URL (server)', category: 'Database & Auth', side: 'server' },
  { name: 'SUPABASE_ANON_KEY', description: 'Supabase anonymous key (server)', category: 'Database & Auth', side: 'server' },
  { name: 'SUPABASE_SERVICE_KEY', description: 'Supabase service role key (full privileges)', category: 'Database & Auth', side: 'server' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Alias for SUPABASE_SERVICE_KEY', category: 'Database & Auth', side: 'server' },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Next.js compat alias for SUPABASE_URL', category: 'Database & Auth', side: 'server' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Next.js compat alias for SUPABASE_ANON_KEY', category: 'Database & Auth', side: 'server' },
  { name: 'NEXT_PUBLIC_BASE_URL', description: 'Base URL for webhooks', category: 'Database & Auth', side: 'server' },

  // --- LLM Provider Keys ---
  { name: 'ANTHROPIC_API_KEY', description: 'Anthropic — Claude Opus (Judge) + Sonnet', category: 'LLM Providers', side: 'server' },
  { name: 'OPENAI_API_KEY', description: 'OpenAI — GPT-4o evaluator, Olivia assistant, TTS', category: 'LLM Providers', side: 'server' },
  { name: 'GEMINI_API_KEY', description: 'Google — Gemini 3 Pro evaluator', category: 'LLM Providers', side: 'server' },
  { name: 'XAI_API_KEY', description: 'xAI — Grok 4 evaluator', category: 'LLM Providers', side: 'server' },
  { name: 'GROK_API_KEY', description: 'Alias for XAI_API_KEY', category: 'LLM Providers', side: 'server' },
  { name: 'GROK_API_URL', description: 'Grok API base URL', category: 'LLM Providers', side: 'server' },
  { name: 'PERPLEXITY_API_KEY', description: 'Perplexity — Sonar Reasoning Pro (web search)', category: 'LLM Providers', side: 'server' },
  { name: 'TAVILY_API_KEY', description: 'Tavily — Web research for Claude', category: 'LLM Providers', side: 'server' },

  // --- Avatar & Video ---
  { name: 'SIMLI_API_KEY', description: 'Simli AI — Primary avatar video', category: 'Avatar & Video', side: 'server' },
  { name: 'SIMLI_FACE_ID', description: 'Simli face/avatar ID', category: 'Avatar & Video', side: 'server' },
  { name: 'DID_API_KEY', description: 'D-ID — Fallback avatar provider', category: 'Avatar & Video', side: 'server' },
  { name: 'DID_PRESENTER_URL', description: 'D-ID Olivia avatar image URL', category: 'Avatar & Video', side: 'server' },
  { name: 'DID_JUDGE_PRESENTER_URL', description: 'D-ID Judge Cristiano avatar image URL', category: 'Avatar & Video', side: 'server' },
  { name: 'DID_AGENT_ID', description: 'D-ID agent ID', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_API_KEY', description: 'HeyGen API key — Gamma report video presenter + streaming avatar', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_OLIVIA_AVATAR_ID', description: 'HeyGen Olivia avatar ID — Gamma video presenter ONLY (not chat TTS)', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_OLIVIA_VOICE_ID', description: 'HeyGen Olivia voice ID — Gamma video presenter ONLY (not ElevenLabs/OpenAI)', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_CRISTIANO_AVATAR_ID', description: 'HeyGen Judge Cristiano avatar ID — 7a0ee88ad6814ed9af896f9164407c41', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_CRISTIANO_VOICE_ID', description: 'HeyGen Judge Cristiano voice ID — ElevenLabs default (DzUwifXFzrD4THQLxNun)', category: 'Avatar & Video', side: 'server' },
  { name: 'HEYGEN_AVATAR_LOOK_ID', description: 'HeyGen avatar look/appearance ID — physical appearance variant for avatar rendering', category: 'Avatar & Video', side: 'server' },
  { name: 'CRISTIANO_IMAGE_URL', description: 'Judge Cristiano source image URL', category: 'Avatar & Video', side: 'server' },

  // --- Text-to-Speech (ElevenLabs) ---
  { name: 'ELEVENLABS_API_KEY', description: 'ElevenLabs TTS API key', category: 'Text-to-Speech', side: 'server' },
  { name: 'ELEVENLABS_VOICE_ID', description: 'Default voice ID', category: 'Text-to-Speech', side: 'server' },
  { name: 'ELEVENLABS_OLIVIA_VOICE_ID', description: 'Olivia\'s voice ID', category: 'Text-to-Speech', side: 'server' },
  { name: 'ELEVENLABS_CRISTIANO_VOICE_ID', description: 'Judge Cristiano\'s voice ID', category: 'Text-to-Speech', side: 'server' },
  { name: 'ELEVENLABS_EMILIA_VOICE_ID', description: 'Emilia help widget voice ID', category: 'Text-to-Speech', side: 'server' },

  // --- Video Generation ---
  { name: 'REPLICATE_API_TOKEN', description: 'Replicate — Stable Video Diffusion fallback', category: 'Video Generation', side: 'server' },
  { name: 'KLING_VIDEO_API_KEY', description: 'Kling AI — High-quality video generation', category: 'Video Generation', side: 'server' },
  { name: 'KLING_VIDEO_SECRET', description: 'Kling AI secret key', category: 'Video Generation', side: 'server' },

  // --- Report Generation (Gamma) ---
  { name: 'GAMMA_API_KEY', description: 'Gamma — Visual report generation', category: 'Reports (Gamma)', side: 'server' },
  { name: 'GAMMA_TEMPLATE_ID', description: 'Gamma custom template ID', category: 'Reports (Gamma)', side: 'server' },
  { name: 'GAMMA_THEME_ID', description: 'Gamma custom theme ID', category: 'Reports (Gamma)', side: 'server' },
  { name: 'GAMMA_FOLDER_ID', description: 'Gamma folder ID for saving reports', category: 'Reports (Gamma)', side: 'server' },

  // --- Payments (Stripe) ---
  { name: 'STRIPE_SECRET_KEY', description: 'Stripe secret API key (sk_...)', category: 'Payments (Stripe)', side: 'server' },
  { name: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signature verification (whsec_)', category: 'Payments (Stripe)', side: 'server' },
  { name: 'STRIPE_PRICE_NAVIGATOR_MONTHLY', description: 'Navigator monthly plan price ID ($29/mo)', category: 'Payments (Stripe)', side: 'server' },
  { name: 'STRIPE_PRICE_NAVIGATOR_ANNUAL', description: 'Navigator annual plan price ID ($249/yr)', category: 'Payments (Stripe)', side: 'server' },
  { name: 'STRIPE_PRICE_SOVEREIGN_MONTHLY', description: 'Sovereign monthly plan price ID ($99/mo)', category: 'Payments (Stripe)', side: 'server' },
  { name: 'STRIPE_PRICE_SOVEREIGN_ANNUAL', description: 'Sovereign annual plan price ID ($899/yr)', category: 'Payments (Stripe)', side: 'server' },

  // --- Email (Resend) ---
  { name: 'RESEND_API_KEY', description: 'Resend email API key', category: 'Email (Resend)', side: 'server' },
  { name: 'RESEND_FROM_EMAIL', description: 'Default from email address', category: 'Email (Resend)', side: 'server' },

  // --- AI Assistants ---
  { name: 'OPENAI_ASSISTANT_ID', description: 'OpenAI assistant ID for Olivia', category: 'AI Assistants', side: 'server' },
  { name: 'EMILIA_ASSISTANT_ID', description: 'OpenAI assistant ID for Emilia', category: 'AI Assistants', side: 'server' },

  // --- Caching (Vercel KV) ---
  { name: 'KV_REST_API_URL', description: 'Vercel KV REST API URL', category: 'Caching (KV)', side: 'server' },
  { name: 'KV_REST_API_TOKEN', description: 'Vercel KV REST API token', category: 'Caching (KV)', side: 'server' },

  // --- Feature Flags & Config ---
  { name: 'USE_CATEGORY_SCORING', description: 'Enable category-based scoring', category: 'Config & Flags', side: 'server' },
  { name: 'DEV_BYPASS_EMAILS', description: 'Admin emails (comma-separated)', category: 'Config & Flags', side: 'server' },
  { name: 'ADMIN_EMAILS', description: 'Admin emails for sync scripts', category: 'Config & Flags', side: 'server' },

  // --- Deployment ---
  { name: 'VERCEL_URL', description: 'Current Vercel deployment URL (auto-set)', category: 'Deployment', side: 'server' },
  { name: 'WEBHOOK_BASE_URL', description: 'Base URL for video webhooks', category: 'Deployment', side: 'server' },

  // --- Client-Side (VITE_*) ---
  { name: 'VITE_SUPABASE_URL', description: 'Supabase project URL (client bundle)', category: 'Client-Side (VITE)', side: 'client' },
  { name: 'VITE_SUPABASE_ANON_KEY', description: 'Supabase anonymous key (client bundle)', category: 'Client-Side (VITE)', side: 'client' },
  { name: 'VITE_DEMO_ENABLED', description: 'Enable demo mode (true/false)', category: 'Client-Side (VITE)', side: 'client' },
  { name: 'VITE_APP_URL', description: 'Base app URL for reports', category: 'Client-Side (VITE)', side: 'client' },
  { name: 'VITE_ERROR_REPORTING_URL', description: 'Error reporting endpoint', category: 'Client-Side (VITE)', side: 'client' },
  { name: 'VITE_AVATAR_PROVIDER', description: 'Avatar provider (simli/did/heygen)', category: 'Client-Side (VITE)', side: 'client' },
];

// ============================================================================
// MASK HELPER
// ============================================================================

// FIX S4: Tighter masking — show only first 3 chars, hide the rest
function maskValue(val: string): string {
  if (!val) return '';
  if (val.length <= 4) return '***';
  return val.substring(0, 3) + '***';
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Require auth
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Admin check
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(auth.email.toLowerCase())) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  // Build response with status for each env var
  const variables = ENV_VARS.map(v => {
    const value = process.env[v.name] || '';
    return {
      name: v.name,
      description: v.description,
      category: v.category,
      side: v.side,
      configured: value.length > 0,
      preview: value ? maskValue(value) : '',
    };
  });

  res.setHeader('Cache-Control', 'private, no-cache');
  res.status(200).json({ variables });
}
