/**
 * LIFE SCORE - the company line the server's emails end with.
 *
 * The browser prints the company's contacts from src/shared/companyContact.ts
 * (filled from src/legal/legalFacts.ts). Server routes keep their own copy here;
 * tests/companyContact.test.ts holds every value equal to those two files.
 * John, 4 Oct 2026 ("Switch all four"): the emails said cluesnomad.com.
 */

export const COMPANY_NAME = 'Clues Intelligence LTD';
export const COMPANY_EMAIL = 'info@cluesintelligence.com';
export const COMPANY_WEBSITE = 'cluesintelligence.com';

/** "Clues Intelligence LTD • cluesintelligence.com • info@cluesintelligence.com", for an HTML email. */
export const COMPANY_EMAIL_FOOTER_HTML = `${COMPANY_NAME} &bull; ${COMPANY_WEBSITE} &bull; ${COMPANY_EMAIL}`;
