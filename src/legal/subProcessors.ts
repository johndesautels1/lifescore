/**
 * LIFE SCORE - the supplier (sub-processor) register (GDPR Art. 28 transparency).
 *
 * DATA, not UI: the Privacy Policy draws it, and tests/legalContent.test.ts
 * fails the build when the code calls a supplier this list does not name.
 * Each "data" line says what that supplier actually receives, read from the
 * code on 2026-10-03; jurisdictions for suppliers the questionnaire engine also
 * uses are the engine's checked wording (its src/core/compliance/subProcessors.ts).
 *
 * Editing this list: bump LAST_UPDATED. A new supplier, a new kind of data or a
 * changed jurisdiction is a material change to the Privacy Policy.
 */

export const LAST_UPDATED = '2026-10-03';

export interface SubProcessor {
  name: string;
  role: string;
  data: string;
  jurisdiction: string;
}

export const SUB_PROCESSORS: readonly SubProcessor[] = [
  {
    name: 'Supabase',
    role: 'Sign-in, database and file storage',
    data: 'Your account, comparisons, reports, Olivia conversations, preferences, plan and usage records, consent records, files you save',
    jurisdiction: 'Supabase Inc. — data stored in the EU (AWS Frankfurt)',
  },
  {
    name: 'Vercel',
    role: 'Hosting — every page and every server function runs here',
    data: 'Server logs (IP address, browser, address requested); your data passes through in memory while a request is handled',
    jurisdiction: 'Vercel Inc. (United States); our functions run in Frankfurt',
  },
  {
    name: 'Stripe',
    role: 'Payments and subscriptions',
    data: 'Your email address, the plan you buy, and the card details you type on Stripe’s own page (never sent to us)',
    jurisdiction: 'Stripe, Inc. (United States); Stripe Payments Europe, Ltd. (Ireland) for European customers',
  },
  {
    name: 'Anthropic (Claude)',
    role: 'Evaluating cities, the judge’s verdicts, Olivia and Emilia, films’ storyboards and screenplays',
    data: 'City names and comparison data; your messages to Olivia or Emilia with the conversation and comparison they need — never your name, email or account number',
    jurisdiction: 'Anthropic PBC (United States)',
  },
  {
    name: 'OpenAI (GPT)',
    role: 'Evaluating cities; back-up voice when ElevenLabs is unavailable',
    data: 'City names and comparison data; the words a voice is to speak',
    jurisdiction: 'OpenAI (United States)',
  },
  {
    name: 'Google (Gemini)',
    role: 'Evaluating cities',
    data: 'City names and comparison data',
    jurisdiction: 'Google (United States)',
  },
  {
    name: 'xAI (Grok)',
    role: 'Evaluating cities; short city videos',
    data: 'City names, comparison data and video descriptions of cities',
    jurisdiction: 'xAI Corp. (United States)',
  },
  {
    name: 'Perplexity',
    role: 'Evaluating cities with web research',
    data: 'City names and comparison data',
    jurisdiction: 'Perplexity AI, Inc. (United States)',
  },
  {
    name: 'Tavily',
    role: 'Web search for the evaluators',
    data: 'Search queries built from city names and metrics',
    jurisdiction: 'Tavily (United States)',
  },
  {
    name: 'Gamma',
    role: 'Visual reports',
    data: 'The report’s words and scores about the two cities',
    jurisdiction: 'Gamma Tech, Inc. (United States)',
  },
  {
    name: 'HeyGen (including LiveAvatar)',
    role: 'Olivia’s live face and recorded videos; Cristiano’s judge videos and city films',
    data: 'The words to be spoken, and the audio of Olivia’s voice for her live face',
    jurisdiction: 'HeyGen (Movio Ltd. group, United States)',
  },
  {
    name: 'ElevenLabs',
    role: 'Voices for Olivia, Emilia and Cristiano',
    data: 'The words to be spoken',
    jurisdiction: 'ElevenLabs Inc. (United States)',
  },
  {
    name: 'Simli',
    role: 'Back-up live face for Olivia',
    data: 'The audio of Olivia’s spoken replies',
    jurisdiction: 'Simli AS (Norway)',
  },
  {
    name: 'D-ID',
    role: 'Back-up live face for Olivia',
    data: 'The words or audio of Olivia’s spoken replies',
    jurisdiction: 'D-ID Ltd. (Israel)',
  },
  {
    name: 'Replicate',
    role: 'Back-up judge videos, city video clips and city pictures',
    data: 'The judge’s script audio and descriptions of cities',
    jurisdiction: 'Replicate, Inc. (United States)',
  },
  {
    name: 'Kling AI',
    role: 'City video clips',
    data: 'Descriptions of cities (no personal data)',
    jurisdiction: 'Kuaishou Technology (China); international service from Singapore',
  },
  {
    name: 'InVideo',
    role: 'Moving Movies films',
    data: 'The film’s screenplay about the two cities (no personal data)',
    jurisdiction: 'InVideo (United States)',
  },
  {
    name: 'Resend',
    role: 'Email',
    data: 'Your email address and the notice you asked for (for example, that a long job finished)',
    jurisdiction: 'Resend Inc. (United States)',
  },
  {
    name: 'Flagpedia (flagcdn.com)',
    role: 'Country flag images shown beside cities',
    data: 'Your browser fetches the flag pictures directly, so the host sees your IP address',
    jurisdiction: 'Flagpedia.net (Czech Republic)',
  },
];
