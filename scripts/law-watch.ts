/**
 * LIFE SCORE - the quarterly law watch.
 *
 * John, 4 Oct 2026: scheduled checks for "dependency changes …, key core code,
 * LAWS". Laws cannot be checked by a test, so once a quarter this asks Claude,
 * with web search, which changes to privacy, consumer, AI and online-safety law
 * reach an app like this one — given what the code says the app holds and who
 * processes it — and writes a Markdown report with a source for every item.
 * .github/workflows/law-watch.yml opens it as a GitHub issue together with the
 * fixed compliance checklist (Legal Compliance Manual, section 12). It informs a
 * review by the founders; it decides nothing and changes no page.
 *
 *   ANTHROPIC_API_KEY=… npx tsx scripts/law-watch.ts > law-watch.md
 */

import { callClaude, type ClaudeMessage, type ClaudeResponseBlock } from '../api/shared/anthropic.js';
import { AI_MODELS } from '../api/shared/models.js';
import { LEGAL_EFFECTIVE, LEGAL_FACTS } from '../src/legal/legalFacts.js';
import { LAST_UPDATED, SUB_PROCESSORS } from '../src/legal/subProcessors.js';

const today = new Date().toISOString().slice(0, 10);

const system = `You research changes in law for the owners of one consumer web app and report only what is relevant to it.

The app: ${LEGAL_FACTS.product}, run by ${LEGAL_FACTS.company} (a company registered in England and Wales, ${LEGAL_FACTS.address}). Users anywhere in the world, aged ${LEGAL_FACTS.minimumAge}+, compare two cities' legal and lived freedom. Paid plans through Stripe.
What it holds about users: account (email, name, hashed password; Google/GitHub sign-in), comparisons and reports, preferences, chats with an AI assistant, plan and usage records, consent records, uploaded videos.
How it uses AI: several large language models score cities; an AI "judge" writes verdicts; AI voices and video avatars present results; AI-generated city videos and images. Automated scoring of cities, not of people.
It runs no advertising and no third-party analytics, and does not sell or share personal information. Its legal pages took effect ${LEGAL_EFFECTIVE}.
Suppliers that receive data (register updated ${LAST_UPDATED}): ${SUB_PROCESSORS.map((p) => `${p.name} (${p.jurisdiction})`).join('; ')}.

Rules:
- Search before you answer, and give a working source link (official text, regulator, or a reputable law-firm or news report) for every item. Never state a law, date or requirement you did not find a source for.
- Cover: the UK (UK GDPR, the Data (Use and Access) Act 2025 and its commencement, PECR/cookies, ICO guidance), the EU (GDPR, the AI Act's obligations and their dates — transparency for AI-generated content and synthetic video/voice especially — ePrivacy, the Digital Services Act where it could apply), the United States (state comprehensive privacy laws and their effective dates, California regulations including automated decision-making and risk assessments, state AI and synthetic-media disclosure laws, CAN-SPAM for emails), and Canada.
- Report what changed recently or takes effect within the next 12 months from ${today}. Skip laws that plainly do not reach this app (say why in one line in the last section).
- Plain English. No legal advice: say what the owners should check, and with whom.`;

const instruction = `Write the report in Markdown with exactly these sections:

## Changes that may need action
For each: **the law** — what changes, from what date, what in ${LEGAL_FACTS.product} it touches (a legal page, a consent, a supplier, an AI disclosure, an email), what to check. Then "Source:" with the link(s).

## Coming later — watch
The same, for changes further out or not yet final.

## Checked, not relevant
One line each.

If you find nothing for a section, write "Nothing found." under it.`;

async function main(): Promise<void> {
  const messages: ClaudeMessage[] = [{ role: 'user', content: instruction }];
  let report = '';

  // A long search may pause; send the turn back to let it continue (at most 4 times).
  for (let round = 0; round < 5; round++) {
    const reply = await callClaude({
      model: AI_MODELS.writer.id,
      maxTokens: 16000,
      effort: 'medium',
      system,
      messages,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 12 }],
      timeoutMs: 600_000,
      label: 'law-watch',
    });
    if (!reply.ok) throw new Error(`Claude did not answer: ${reply.kind} — ${reply.message}`);
    report += reply.text;
    if (reply.stopReason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: reply.content as ClaudeResponseBlock[] });
  }

  if (!report.trim()) throw new Error('The law watch came back empty.');
  process.stdout.write(`${report.trim()}\n`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
