/**
 * LIFE SCORE - who we are, for every legal page.
 *
 * Code-locked facts the pages fill into their {company}, {address}, {contact}…
 * holes (src/legal/legalContent.ts). One home, so no page can disagree with
 * another. Rulings: John, 2026-10-03 — contact info@cluesintelligence.com,
 * minimum age 18. Company number and Privacy Officer as the questionnaire
 * engine states them for the same company (its src/core/legalContent.ts).
 */

/** The date the current wording took effect. Bump it when the words change materially. */
export const LEGAL_EFFECTIVE = '3 October 2026';

export const LEGAL_FACTS = {
  company: 'Clues Intelligence LTD',
  companyNumber: '16966151',
  address: '167–169 Great Portland Street, 5th Floor, London W1W 5PF, United Kingdom',
  contact: 'info@cluesintelligence.com',
  privacyOfficer: 'Meldrid Desautels',
  product: 'LIFE SCORE',
  minimumAge: '18',
} as const;

export type LegalFactKey = keyof typeof LEGAL_FACTS;
