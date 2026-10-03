/**
 * LIFE SCORE - the legal pages' words, in ONE place.
 *
 * John, 2026-10-03: bring LifeScore's compliance up to the questionnaire
 * engine's (its src/core/legalContent.ts, effective 24 September 2026). The
 * engine's structure and wording are followed wherever they are true for
 * LifeScore; every claim about what LifeScore does was read from LifeScore's
 * own code and database on 2026-10-03 (what is stored, what each supplier
 * receives, what the browser keeps). Nothing is claimed that the app does not
 * do.
 *
 * The pop-up (src/components/LegalModal.tsx) renders these pages, and
 * docs/legal/*.md are generated from them (tests/legalContent.test.ts fails
 * when they differ), so the text people read and the documents can never drift
 * apart again.
 *
 * Body markup: a blank line starts a paragraph; a line starting "- " is a
 * bullet; **bold** is bold. {company}, {contact}… are filled from
 * src/legal/legalFacts.ts.
 */

import { LEGAL_EFFECTIVE, LEGAL_FACTS, type LegalFactKey } from './legalFacts';

/** The seven pages, by the keys the footer and the pop-up already use. */
export type LegalSlug = 'privacy' | 'terms' | 'cookies' | 'acceptable-use' | 'refunds' | 'do-not-sell' | 'state-privacy';

export const LEGAL_SLUGS: readonly LegalSlug[] = [
  'privacy',
  'terms',
  'cookies',
  'acceptable-use',
  'refunds',
  'do-not-sell',
  'state-privacy',
];

/** Something a section draws from code beneath its words. */
export type LegalWidget = 'processors' | 'dns-optout';

export interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly body: string;
  readonly widget?: LegalWidget;
}

export interface LegalPage {
  readonly slug: LegalSlug;
  readonly title: string;
  readonly effective: string;
  readonly sections: readonly LegalSection[];
}

/** Fill {company}, {contact}… from the facts. An unknown hole is left visible so a test catches it. */
export function fillFacts(text: string): string {
  return text.replace(/\{(\w+)\}/g, (hole, key: string) =>
    key in LEGAL_FACTS ? LEGAL_FACTS[key as LegalFactKey] : hole
  );
}

const lines = (...parts: string[]): string => parts.join('\n');

const PAGES: Record<LegalSlug, Omit<LegalPage, 'slug' | 'effective'>> = {
  // ==========================================================================
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        id: 'who',
        heading: 'Who we are',
        body: '{company}, a company registered in England and Wales (Company No. {companyNumber}) at {address}, is the data controller for {product}. Contact us at {contact}. Our Privacy Officer — the person in charge of protecting personal information — is {privacyOfficer}, at the same address. This policy applies wherever you use {product}.',
      },
      {
        id: 'collect',
        heading: 'What we hold about you',
        body: lines(
          '- **Your account:** the email address you sign in with, the name you give us (optional), and your password, which our sign-in provider stores only in scrambled (hashed) form. If you sign in with Google or GitHub, we receive your name, email address and profile picture from them.',
          '- **Your comparisons:** the cities you compare, the scores and reports produced, and any notes, nicknames and favourites you add.',
          '- **Your preferences:** category weights, dealbreakers, favourite cities and display settings.',
          '- **Conversations with Olivia:** your messages and her replies, saved to your account so you can return to them. Conversations with Emilia, our help assistant, are kept only in your open browser tab.',
          '- **What you create:** judge reports, visual reports, court-order videos (including any video you upload) and films.',
          '- **Plan and billing records:** your plan, your Stripe customer and subscription references, and how many of each feature you used this month. Your card details are typed on Stripe’s own page and never reach us.',
          '- **Notices:** messages we show you in the app and, if you ask for them, emails when a long job finishes.',
          '- **Consent records:** your cookie and “Do Not Sell or Share” choices, with the time, your IP address and browser, so we can show what you chose.',
          '- **Shared reports:** if you share a report link, when it was opened, with the viewer’s IP address and browser.',
          '- **Service records:** our hosting provider’s server logs (IP address, browser, the address requested).',
          '',
          'If you use the microphone, your browser’s own speech recognition turns your speech into text before anything reaches us (in Chrome this is a Google service); we receive only the text. We set no advertising or analytics cookies, run no third-party analytics, and do not track your location.'
        ),
      },
      {
        id: 'use',
        heading: 'How we use it',
        body: 'We use your information to provide {product} — comparisons, reports, Olivia, videos and your account (performance of a contract); to take payment through Stripe; to send the notices you ask for; to keep the service secure and prevent abuse (legitimate interests); and to meet legal obligations. We do not sell your personal information, and we do not use it for advertising.',
      },
      {
        id: 'ai',
        heading: 'How the AI works with your information',
        body: lines(
          'A comparison sends the two city names and the metric definitions to several AI models (Claude, GPT, Gemini, Grok and Perplexity) and a web-search service (Tavily); nothing about you is sent. When you talk to Olivia, your message, the conversation so far and the comparison you are viewing go to Anthropic (Claude) so she can answer; messages to Emilia go to Anthropic the same way. When Olivia or Cristiano speaks, the words go to the voice and video suppliers in the register below.',
          '',
          'We never send your name, email address or account number to an AI model. We use each supplier through its business service, give it only what its job needs, and contractually restrict its use. Please do not type sensitive personal details into a conversation — anything you write is sent as written.'
        ),
      },
      {
        id: 'automated',
        heading: 'Automated scoring',
        body: '{product} scores cities against published laws and current evidence. The scores describe places, not you, and decide nothing about your eligibility for housing, credit, insurance, employment, immigration or any other service. You can ask us to explain a score, report an inaccurate source, or have a report regenerated.',
      },
      {
        id: 'processors',
        heading: 'Who processes it for us',
        body: 'These suppliers process information on our behalf, each only for the job named. Signing in with Google or GitHub is a service of those companies under their own privacy policies.',
        widget: 'processors',
      },
      {
        id: 'transfers',
        heading: 'International transfers',
        body: 'Your stored data lives in the European Union (Supabase, AWS Frankfurt), and our server functions run in Frankfurt (Vercel). Several suppliers above operate from the United States and other countries. Depending on the supplier, we rely on an applicable adequacy decision, the EU Standard Contractual Clauses and, for UK transfers, the UK International Data Transfer Agreement or UK Addendum, and we assess the legal and security risks involved. Write to {contact} for the safeguard used for a particular transfer.',
      },
      {
        id: 'retention',
        heading: 'How long we keep it',
        body: lines(
          '- Your account, comparisons, reports, videos, Olivia conversations and preferences: while your account exists. When you delete your account (Settings → Data → Delete My Account) or ask us to, they are removed from our active systems at once and any subscription is cancelled first; backup copies held by our database provider expire on its backup schedule.',
          '- Payment and invoice records: kept by Stripe for as long as tax and accounting law requires.',
          '- Consent records: kept as proof of your choice; after you delete your account they are kept without any link to it.',
          '- Shared-report view records: deleted with the report.',
          '- Server logs: kept by our hosting provider for its standard log period.',
          '- Shared caches of city comparisons and city films contain no personal information.',
          '- We may keep limited information where the law requires it or to establish, exercise or defend legal claims, prevent fraud or process refunds.'
        ),
      },
      {
        id: 'rights',
        heading: 'Your rights — wherever you live',
        body: lines(
          'We honour the same core rights for everyone. Much of it you can do yourself: **Settings → Data → Download My Data** gives you a copy of everything your account holds; **Settings → Profile** corrects your name; **Settings → Data → Delete My Account** deletes everything. For anything else — a correction, a restriction of or objection to processing, or the withdrawal of a consent — write to {contact}. We respond within one month.',
          '',
          '- **UK & Europe (UK GDPR / EU GDPR):** access, correction, deletion, portability, restriction and objection, and the right to complain to the UK Information Commissioner’s Office (ico.org.uk) or your local supervisory authority.',
          '- **United States:** where state privacy laws apply (including California’s CCPA/CPRA), you have the rights to know, correct and delete. We do not sell or share personal information for cross-context behavioural advertising, we never discriminate against you for exercising a right, and we treat Global Privacy Control signals as a request not to sell or share. See “Do Not Sell or Share My Personal Information” and “US State Privacy Rights” in the footer.',
          '- **Canada (PIPEDA):** access and correction, and the right to complain to the Office of the Privacy Commissioner.',
          '- **Latin America** (including Brazil’s LGPD): access, correction, deletion, portability and information about sharing, via the contact above.',
          '- **Asia & Asia-Pacific** (including Japan’s APPI, Singapore’s PDPA and the Australian Privacy Act): access and correction, and complaint to your local privacy regulator.'
        ),
      },
      {
        id: 'security',
        heading: 'Security',
        body: 'Every row of your stored data is protected by database row-level security so that only your account can read it; connections are encrypted in transit; API keys stay on our servers; and passwords are handled by our sign-in provider, never by us in plain text.',
      },
      {
        id: 'age',
        heading: 'Age',
        body: '{product} is for adults. You must be {minimumAge} or older to create an account.',
      },
      {
        id: 'changes',
        heading: 'Changes',
        body: 'If this policy changes materially, we tell you before the change applies. The date at the top is the version you are reading.',
      },
    ],
  },

  // ==========================================================================
  terms: {
    title: 'Terms of Service',
    sections: [
      {
        id: 'agreement',
        heading: 'The agreement',
        body: 'These terms are between you and {company}, {address} ({contact}). By creating an account or using {product} you agree to them. If you do not agree, do not use the service.',
      },
      {
        id: 'what',
        heading: 'What LIFE SCORE is — and is not',
        body: '{product} compares the written laws and the lived reality of personal freedom between cities across 100 metrics, using several independent AI models and an AI judge. Its scores and reports are information to help you decide. They are **not** legal, immigration, tax, financial, real-estate or other professional advice, and a report is not a recommendation to move anywhere. Laws change; verify anything you intend to act on with the relevant authority or a qualified professional.',
      },
      {
        id: 'ai',
        heading: 'AI-generated content',
        body: 'Reports are produced by independent AI models working from live web research, reconciled by an AI judge. AI output can contain errors or out-of-date information — that is why sources are shown where we have them. Pictures, voices and films are AI-generated illustrations of the kind of place described.',
      },
      {
        id: 'account',
        heading: 'Your account',
        body: 'You must be {minimumAge} or older, give accurate information and keep your sign-in details to yourself. You are responsible for activity on your account.',
      },
      {
        id: 'plans',
        heading: 'Plans and payment',
        body: 'The Pricing page shows each plan, what it includes and its price before you buy. Payment is taken on Stripe’s own checkout page, so your card details never reach us. Paid plans renew automatically each month or year until you cancel; you can cancel or change plan at any time from **Settings → Subscription → Manage Subscription** (Stripe’s billing page), and a cancelled plan stays active until the end of the period you paid for. The Refund Policy applies to every purchase.',
      },
      {
        id: 'availability',
        heading: 'Availability',
        body: 'We do not guarantee uninterrupted access. Maintenance, outages at the suppliers we depend on, and events outside our control can interrupt the service; we restore it as soon as we reasonably can. Features may change as the service develops.',
      },
      {
        id: 'use',
        heading: 'Acceptable use',
        body: 'You agree to the Acceptable Use Policy. In short: no unlawful use; no scraping, bulk extraction, reverse engineering or probing of the service or its models; no reselling reports or presenting them as professional advice; and no attempt to reach another person’s data.',
      },
      {
        id: 'content',
        heading: 'Your content and ours',
        body: 'You keep ownership of what you enter — your notes, messages and uploads. You grant {company} a limited licence to host, process and transmit it only as needed to provide, secure and support the service; the licence ends when the content is deleted, apart from copies lawfully kept in backups or compliance records. You may share your reports with your household and advisers; you may not resell them, publish them as a commercial product or remove proprietary notices. LIFE SCORE™, CLUES™ and SMART™ are trademarks of {company}; the software, design, methods and content of the service are ours or our licensors’, and all rights are reserved.',
      },
      {
        id: 'liability',
        heading: 'Liability',
        body: 'Nothing in these terms excludes or limits liability where that is not allowed — including for fraud, death or personal injury caused by negligence, your statutory consumer rights in the UK and EU, and consumer guarantees under the Australian Consumer Law. We provide the service with reasonable care and skill. To the fullest extent the law permits, we are not responsible for losses that were not reasonably foreseeable when you started using the service, for business losses if you are a consumer, or for decisions made on information we marked as uncertain; otherwise our total liability is limited to the amount you paid us in the 12 months before the claim, or £100, whichever is greater.',
      },
      {
        id: 'ending',
        heading: 'Ending the agreement',
        body: 'You can delete your account at any time (Settings → Data → Delete My Account); any subscription is cancelled first and your data is deleted as the Privacy Policy describes. Download your data first if you want a copy. We may suspend or end an account that breaks these terms — with notice and a chance to put things right for ordinary breaches, and immediately where security, fraud or unlawful use is involved.',
      },
      {
        id: 'complaints',
        heading: 'Complaints and corrections',
        body: 'If a report relies on a source that is wrong, or you believe content on {product} infringes your rights, write to {contact} with the report date and the cities concerned. We investigate and correct or remove what we should.',
      },
      {
        id: 'law',
        heading: 'Law and disputes',
        body: 'These terms are governed by the law of England and Wales, and disputes belong to its courts — except that if you are a consumer, you keep the protection of the mandatory consumer laws of the country where you live and the right to bring proceedings there.',
      },
      {
        id: 'general',
        heading: 'General',
        body: 'If any part of these terms is found unenforceable, the rest stands. Our not enforcing a term is not a waiver of it. You may not transfer this agreement; we may transfer it to a successor of the business. These terms, the Privacy Policy, the Cookie Policy, the Acceptable Use Policy and the Refund Policy are the whole agreement between us; where they conflict, these terms prevail. Notices to us go to {contact}; notices to you go to your account email.',
      },
      {
        id: 'changes',
        heading: 'Changes',
        body: 'If we make a material change to these terms, we email you at least 30 days before it applies and update the date at the top. If you do not accept the change, you can cancel and delete your account before it applies, and we refund anything you have paid for and not yet received. If you keep using {product} once the change applies, the new terms apply to you.',
      },
    ],
  },

  // ==========================================================================
  cookies: {
    title: 'Cookie Policy',
    sections: [
      {
        id: 'short',
        heading: 'The short version',
        body: '{product} uses only what is needed to sign you in, remember your work and honour your choices. No advertising cookies, no third-party analytics, no tracking pixels, no social-media beacons.',
      },
      {
        id: 'stored',
        heading: 'What we keep in your browser',
        body: lines(
          '- **Sign-in session** — our sign-in provider (Supabase) keeps your session in your browser’s local storage so you stay signed in. Strictly necessary; removed when you sign out.',
          '- **Your work** — local copies of your saved comparisons, reports, judge reports and court orders, and short-lived copies of results, so the app is fast and a dropped connection loses nothing. You can clear them in Settings → Data → Clear Local Data.',
          '- **Usage permissions** — a signed note that a comparison you started is paid for, so its later steps are not counted twice.',
          '- **Your choices** — your cookie choices (with a random identifier, so the record of your consent can be matched to the browser that gave it) and your “Do Not Sell or Share” choice.',
          '- **Your preferences** — light or dark theme, category weights, dealbreakers, whether to remember your email at sign-in, how you like to be notified, and notes that you have dismissed a message.',
          '- **Cached status** — your plan and access status, so the app does not ask the server on every screen.',
          '- **Tab-only notes** — your conversation with Emilia and a few flags that last only while the tab is open.'
        ),
      },
      {
        id: 'not',
        heading: 'What we do not do',
        body: 'We run no third-party analytics scripts and set no advertising or cross-site tracking cookies. Our fonts are served from our own site. Your browser does fetch a few things from other servers: country flag images from Flagpedia (flagcdn.com); Olivia’s live face, streamed from HeyGen, Simli or D-ID when you open her; videos and reports you open from the suppliers that host them; and Stripe’s pages when you pay. Each sees your IP address the way any web server does. The Privacy Policy’s register names every supplier.',
      },
      {
        id: 'choices',
        heading: 'Your choices',
        body: 'Use **Cookie Settings** in the footer to change your choices at any time. You can also clear your browser’s storage for this site; you will be signed out and local copies are removed (your account data on our servers is unaffected). Questions: {contact}.',
      },
    ],
  },

  // ==========================================================================
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    sections: [
      {
        id: 'may',
        heading: 'You may',
        body: lines(
          '- Compare cities for your own relocation decisions or for business planning.',
          '- Share your reports with your household, colleagues and advisers.',
          '- Quote a report with attribution to “LIFE SCORE by Clues Intelligence”.'
        ),
      },
      {
        id: 'may-not',
        heading: 'You may not',
        body: lines(
          '- Use {product} for anything unlawful, including immigration or visa fraud.',
          '- Resell or redistribute reports, or build products from them for sale.',
          '- Scrape, crawl or bulk-download content, or reach the service with bots or automated tools.',
          '- Reverse-engineer, probe or attempt to extract the AI systems, prompts or methods.',
          '- Get around usage limits, plan checks or access controls, or exploit a security weakness.',
          '- Interfere with other people’s use of the service, or try to reach another person’s data.',
          '- Present AI-generated content as official government data or as legal or financial advice, or impersonate anyone.',
          '- Upload content you have no right to use, or content that is unlawful, harmful or abusive.'
        ),
      },
      {
        id: 'enforcement',
        heading: 'Enforcement',
        body: 'Depending on how serious a breach is, we may warn you, suspend your account or end it. For ordinary breaches we give notice and a chance to put things right; where security, fraud or unlawful use is involved we act immediately.',
      },
      {
        id: 'report',
        heading: 'Reporting misuse',
        body: 'Write to {contact}.',
      },
    ],
  },

  // ==========================================================================
  refunds: {
    title: 'Refund Policy',
    sections: [
      {
        id: 'subscriptions',
        heading: 'Subscriptions',
        body: lines(
          '- **Monthly plans:** cancel any time from Settings → Subscription → Manage Subscription. You keep access until the end of the month you paid for; the current month is not refunded.',
          '- **Annual plans:** cancel within 14 days of purchase for a full refund, less the value of reports and videos already generated; after 14 days you keep access until the end of the year you paid for, without a refund.',
          '- **Billing errors** — a charge you did not authorise, or a duplicate — are refunded in full.'
        ),
      },
      {
        id: 'failures',
        heading: 'When something fails',
        body: 'If a report, video or other generation fails because of a fault on our side, we credit it back to your allowance or refund it. If a delivered report has significant errors, tell us within 7 days and we will investigate and repair, replace or refund it.',
      },
      {
        id: 'not-refundable',
        heading: 'Not refundable (subject to your statutory rights)',
        body: lines(
          '- Reports and videos already generated — the AI work has been done and delivered.',
          '- Subscriptions cancelled after the refund window.',
          '- Accounts ended for breaking our terms.',
          '- Promotional or discounted purchases.'
        ),
      },
      {
        id: 'results',
        heading: 'A note on results',
        body: 'A comparison that favours a city you did not expect is the service working — the scores and reasoning are shown so you can check them. Refunds are for failures to deliver, not for conclusions. That does not limit your rights where the service was not supplied with reasonable care and skill or was not as described.',
      },
      {
        id: 'statutory',
        heading: 'Your statutory rights',
        body: 'Nothing in this policy limits your mandatory consumer rights, including under the UK Consumer Rights Act 2015, EU consumer law and the Australian Consumer Law. Where the law gives you a cancellation period, you can cancel within it; if you ask us to start providing the service during that period, you may be charged for what you used before cancelling, as the law allows.',
      },
      {
        id: 'ask',
        heading: 'How to ask',
        body: 'Write to {contact} from your account email with the date of the charge or the item concerned. We reply within 2 business days. Approved refunds go back to the original payment method and usually reach you within 5–10 business days.',
      },
    ],
  },

  // ==========================================================================
  'do-not-sell': {
    title: 'Do Not Sell or Share My Personal Information',
    sections: [
      {
        id: 'rights',
        heading: 'Your rights under California law',
        body: 'Under the California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA), California residents have the right to opt out of the sale or sharing of their personal information.',
      },
      {
        id: 'practice',
        heading: 'What we do',
        body: '{company} does not sell your personal information and does not share it for cross-context behavioural advertising. Suppliers process information only to provide the service (see the Privacy Policy’s register). We run no advertising and no third-party analytics. We treat Global Privacy Control signals as a request not to sell or share — which is already how {product} works for everyone.',
      },
      {
        id: 'categories',
        heading: 'Categories of personal information',
        body: lines(
          '- **Identifiers** (email, name, account number): collected; not sold; shared only with suppliers that run the service.',
          '- **Internet activity** (server logs, shared-report views, consent records): collected; not sold; not shared for advertising.',
          '- **Commercial information** (your plan and payments): collected through Stripe; not sold.',
          '- **Your content** (comparisons, notes, Olivia conversations, uploads): collected; not sold; shared only with suppliers that run the service.',
          '- **Precise geolocation and sensitive personal information:** not collected.'
        ),
      },
      {
        id: 'opt-out',
        heading: 'Opt out',
        body: 'Even though we do not sell or share your information, you can record an opt-out below. If our practices ever changed, your choice would already be in place and honoured.',
        widget: 'dns-optout',
      },
      {
        id: 'more',
        heading: 'Your other rights',
        body: lines(
          '- **Know and access:** Settings → Data → Download My Data, or write to {contact}.',
          '- **Delete:** Settings → Data → Delete My Account, or write to {contact}.',
          '- **Correct:** Settings → Profile, or write to {contact}.',
          '- **Limit use of sensitive information:** we do not collect any.',
          '- **Non-discrimination:** we never treat you differently for using these rights.',
          '- **Authorised agent:** someone you authorise in writing may make a request for you.',
          '',
          'We verify your identity before acting on a request and respond within 45 days.'
        ),
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: '{company}, {address} — {contact}',
      },
    ],
  },

  // ==========================================================================
  'state-privacy': {
    title: 'US State Privacy Rights',
    sections: [
      {
        id: 'intro',
        heading: 'Your rights by state',
        body: 'Residents of US states with consumer privacy laws — including California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon and others — have rights over their personal data. {company} honours them for every US resident. We do not sell personal data, do not use it for targeted advertising, and do not profile people in ways that produce legal or similarly significant effects.',
      },
      {
        id: 'rights',
        heading: 'Your rights',
        body: lines(
          '- **Access:** confirm whether we process your data and get a copy — Settings → Data → Download My Data.',
          '- **Correct:** fix inaccurate data — Settings → Profile, or write to us.',
          '- **Delete:** Settings → Data → Delete My Account.',
          '- **Portability:** the download is a single file in a common format (JSON).',
          '- **Opt out** of sale, targeted advertising or profiling: none takes place; you can still record an opt-out on the “Do Not Sell or Share” page, and we honour Global Privacy Control signals.',
          '- **Non-discrimination:** we never treat you differently for using these rights.'
        ),
      },
      {
        id: 'appeal',
        heading: 'Appeals',
        body: 'If we decline a request, we tell you why. You can appeal by writing to {contact} with “Privacy Appeal” in the subject; we answer appeals in writing within 60 days. If you are not satisfied, you can contact your state’s Attorney General.',
      },
      {
        id: 'timing',
        heading: 'Timing and contact',
        body: 'We verify your identity and respond to requests within 45 days. {company}, {address} — {contact}.',
      },
    ],
  },
};

/** One page with its facts filled. */
export function legalPage(slug: LegalSlug): LegalPage {
  const page = PAGES[slug];
  return {
    slug,
    title: page.title,
    effective: LEGAL_EFFECTIVE,
    sections: page.sections.map((s) => ({ ...s, heading: fillFacts(s.heading), body: fillFacts(s.body) })),
  };
}

// ============================================================================
// BODY PARSING (shared by the pop-up and the generated documents)
// ============================================================================

export interface TextRun {
  readonly text: string;
  readonly bold: boolean;
}

export type LegalBlock =
  | { readonly kind: 'paragraph'; readonly runs: readonly TextRun[] }
  | { readonly kind: 'bullets'; readonly items: ReadonlyArray<readonly TextRun[]> };

/** Split "**bold**" spans out of a line. */
export function parseRuns(line: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = line.split('**');
  parts.forEach((text, i) => {
    if (text) runs.push({ text, bold: i % 2 === 1 });
  });
  return runs;
}

/** Paragraphs (blank-line separated) and bullet lists ("- " lines). */
export function parseBody(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', runs: parseRuns(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) blocks.push({ kind: 'bullets', items: bullets.map(parseRuns) });
    bullets = [];
  };
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      flushBullets();
    } else if (line.startsWith('- ')) {
      flushParagraph();
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushBullets();
  return blocks;
}
