/**
 * LIFE SCORE - Quota Check & Alert API
 * Checks all provider quotas and sends email alerts if thresholds exceeded
 *
 * GET /api/usage/check-quotas - Get all quota statuses
 * POST /api/usage/check-quotas - Update usage and check for alerts
 *
 * Created: 2026-01-30
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALERT_EMAILS = ['brokerpinellas@gmail.com', 'cluesnomads@gmail.com'];

// Resend API for sending emails
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'cluesnomads@gmail.com';

// ============================================================================
// TYPES
// ============================================================================

interface QuotaStatus {
  provider_key: string;
  display_name: string;
  icon: string;
  quota_type: string;
  monthly_limit: number;
  current_usage: number;
  usage_percentage: number;
  status: 'green' | 'yellow' | 'orange' | 'red' | 'exceeded';
  fallback_provider: string | null;
  alerts_enabled: boolean;
  last_alert_level: string | null;
}

interface UpdateUsageRequest {
  provider_key: string;
  usage_delta: number;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Supabase not configured');
  }

  return createClient(url, key);
}

// ============================================================================
// EMAIL ALERT FUNCTION
// ============================================================================

async function sendAlertEmail(
  provider: QuotaStatus,
  alertLevel: 'yellow' | 'orange' | 'red' | 'exceeded'
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[QUOTA-ALERT] Resend not configured, logging alert instead');
    console.warn(`[QUOTA-ALERT] ${provider.display_name} at ${provider.usage_percentage}% (${alertLevel})`);
    return false;
  }

  const levelEmoji = {
    yellow: '⚡',
    orange: '⚠️',
    red: '🚨',
    exceeded: '🔴',
  };

  const levelText = {
    yellow: 'Approaching Limit (50%)',
    orange: 'Warning (70%)',
    red: 'Critical (85%)',
    exceeded: 'EXCEEDED (100%+)',
  };

  const subject = `${levelEmoji[alertLevel]} LIFE SCORE API Alert: ${provider.display_name} ${levelText[alertLevel]}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #00d4ff; margin: 0; font-size: 24px; }
    .alert-box { background: ${alertLevel === 'exceeded' ? '#7f1d1d' : alertLevel === 'red' ? '#991b1b' : alertLevel === 'orange' ? '#92400e' : '#1e40af'}; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .alert-box h2 { margin: 0 0 8px 0; color: white; }
    .stats { display: flex; justify-content: space-between; margin: 16px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #00d4ff; }
    .stat-label { font-size: 12px; color: #888; }
    .progress-bar { height: 12px; background: #333; border-radius: 6px; overflow: hidden; }
    .progress-fill { height: 100%; background: ${alertLevel === 'exceeded' || alertLevel === 'red' ? '#ef4444' : alertLevel === 'orange' ? '#f59e0b' : '#3b82f6'}; }
    .fallback { background: #064e3b; padding: 12px; border-radius: 6px; margin-top: 16px; }
    .fallback-title { color: #34d399; font-weight: bold; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛️ LIFE SCORE API Alert</h1>
    </div>

    <div class="alert-box">
      <h2>${levelEmoji[alertLevel]} ${provider.display_name} - ${levelText[alertLevel]}</h2>
      <p>Your ${provider.display_name} API usage has reached <strong>${provider.usage_percentage.toFixed(1)}%</strong> of the monthly limit.</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${formatUsageValue(provider.current_usage, provider.quota_type)}</div>
        <div class="stat-label">Current Usage</div>
      </div>
      <div class="stat">
        <div class="stat-value">${formatUsageValue(provider.monthly_limit, provider.quota_type)}</div>
        <div class="stat-label">Monthly Limit</div>
      </div>
      <div class="stat">
        <div class="stat-value">${provider.usage_percentage.toFixed(1)}%</div>
        <div class="stat-label">Used</div>
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${Math.min(provider.usage_percentage, 100)}%"></div>
    </div>

    ${provider.fallback_provider ? `
    <div class="fallback">
      <div class="fallback-title">✓ Automatic Fallback Available</div>
      <p>If quota is exceeded, the system will automatically use: <strong>${provider.fallback_provider}</strong></p>
    </div>
    ` : ''}

    <div class="footer">
      <p>This is an automated alert from LIFE SCORE API Monitoring.</p>
      <p>Manage your quotas in the Cost Dashboard (💰 icon).</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: ALERT_EMAILS,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[QUOTA-ALERT] Failed to send email:', error);
      return false;
    }

    console.log(`[QUOTA-ALERT] Alert email sent for ${provider.display_name} (${alertLevel})`);
    return true;
  } catch (error) {
    console.error('[QUOTA-ALERT] Email send error:', error);
    return false;
  }
}

function formatUsageValue(value: number, quotaType: string): string {
  switch (quotaType) {
    case 'dollars':
      return `$${value.toFixed(2)}`;
    case 'characters':
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
    case 'tokens':
      return value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : `${(value / 1000).toFixed(1)}K`;
    case 'seconds':
      return value >= 60 ? `${(value / 60).toFixed(1)} min` : `${value} sec`;
    default:
      return value.toLocaleString();
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;

  try {
    const supabase = getSupabaseAdmin();

    // GET - Return all quota statuses
    if (req.method === 'GET') {
      const { data, error } = await supabase.rpc('get_quota_status');

      if (error) {
        console.error('[QUOTA-CHECK] Database error:', error);
        throw new Error('Failed to fetch quota status');
      }

      // Also fetch real ElevenLabs usage if available
      let elevenLabsActual = null;
      try {
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        if (elevenLabsKey) {
          const elResponse = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': elevenLabsKey },
          });
          if (elResponse.ok) {
            const elData = await elResponse.json();
            elevenLabsActual = {
              character_count: elData.character_count,
              character_limit: elData.character_limit,
            };
          }
        }
      } catch (e) {
        console.warn('[QUOTA-CHECK] Could not fetch ElevenLabs usage');
      }

      res.status(200).json({
        quotas: data || [],
        elevenLabsActual,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // POST - Update usage and check alerts
    if (req.method === 'POST') {
      const { provider_key, usage_delta } = req.body as UpdateUsageRequest;

      if (!provider_key || usage_delta === undefined) {
        res.status(400).json({ error: 'provider_key and usage_delta required' });
        return;
      }

      // Update usage
      const { data: updated, error: updateError } = await supabase.rpc('update_provider_usage', {
        p_provider_key: provider_key,
        p_usage_delta: usage_delta,
      });

      if (updateError) {
        console.error('[QUOTA-CHECK] Update error:', updateError);
        throw new Error('Failed to update usage');
      }

      // Get updated status
      const { data: statuses } = await supabase.rpc('get_quota_status');
      const providerStatus = (statuses || []).find((s: QuotaStatus) => s.provider_key === provider_key);

      if (providerStatus && providerStatus.alerts_enabled) {
        const currentLevel = providerStatus.status as 'green' | 'yellow' | 'orange' | 'red' | 'exceeded';
        const lastLevel = providerStatus.last_alert_level;

        // Send alert if we've crossed a new threshold
        const levelOrder = ['green', 'yellow', 'orange', 'red', 'exceeded'];
        const currentIdx = levelOrder.indexOf(currentLevel);
        const lastIdx = lastLevel ? levelOrder.indexOf(lastLevel) : -1;

        if (currentLevel !== 'green' && currentIdx > lastIdx) {
          // New threshold crossed, send alert
          const emailSent = await sendAlertEmail(providerStatus, currentLevel as 'yellow' | 'orange' | 'red' | 'exceeded');

          // Log the alert
          await supabase.from('api_quota_alert_log').insert({
            provider_key,
            alert_level: currentLevel,
            usage_percentage: providerStatus.usage_percentage,
            current_usage: providerStatus.current_usage,
            monthly_limit: providerStatus.monthly_limit,
            email_recipients: ALERT_EMAILS,
            email_status: emailSent ? 'sent' : 'failed',
          });

          // Update last alert level
          await supabase
            .from('api_quota_settings')
            .update({
              last_alert_level: currentLevel,
              last_alert_sent_at: new Date().toISOString(),
            })
            .eq('provider_key', provider_key);
        }
      }

      res.status(200).json({
        success: true,
        provider: providerStatus,
        usage_delta,
      });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[QUOTA-CHECK] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check quotas',
    });
  }
}
