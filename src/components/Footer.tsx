/**
 * LIFE SCORE Footer Component
 * Clues Intelligence LTD
 *
 * Laid out after cluesintelligence.com's footer, not copied from it (John,
 * 4 Oct 2026: "use it as a guide"): company on the left, contact and social in
 * the middle, legal and pricing on the right. The 3D look is the tab bar's: a
 * planet's lit rim across the top, the three technologies as 3D tiles, a 3D
 * object on every contact line, glass social tiles that tilt under the pointer.
 * Contact details: src/shared/companyContact.ts (John: "yes swap").
 */

import React from 'react';
import type { LegalPage } from './LegalModal';
import Icon3D from './icons3d/Icon3D';
import type { Icon3DName } from './icons3d/icons3d';
import { useSpringTilt } from '../hooks/useSpringTilt';
import { COMPANY_CONTACT, type SocialProfile } from '../shared/companyContact';
import './Footer.css';

interface FooterProps {
  onOpenLegal?: (page: LegalPage) => void;
  /** Opens the About tab. The Company column's About link shows only when given. */
  onOpenAbout?: () => void;
  /** Opens the plans and prices. The Pricing column shows only when given. */
  onOpenPricing?: () => void;
}

/** The three proprietary technologies, each a 3D tile. */
const TECHNOLOGIES: ReadonlyArray<{ name: string; expansion: string; icon: Icon3DName }> = [
  { name: 'CLUES', expansion: 'Comprehensive Location Utility & Evaluation System', icon: 'compass' },
  { name: 'SMART', expansion: 'Strategic Market Assessment & Rating Technology', icon: 'target' },
  { name: 'LIFE SCORE', expansion: 'Legal Independence & Freedom Evaluation', icon: 'medal' },
];

/** The legal doors, in their order on the page (src/components/LegalModal.tsx). */
const LEGAL_DOORS: ReadonlyArray<{ page: LegalPage; label: string }> = [
  { page: 'privacy', label: 'Privacy' },
  { page: 'terms', label: 'Terms' },
  { page: 'cookies', label: 'Cookies' },
  { page: 'acceptable-use', label: 'Acceptable Use' },
  { page: 'refunds', label: 'Refunds' },
  { page: 'do-not-sell', label: 'Do Not Sell or Share My Personal Information' },
  { page: 'state-privacy', label: 'US State Privacy Rights' },
];

/** A technology as a tile that turns with the pointer; icon and words sit at different depths. */
const TechTile: React.FC<{ name: string; expansion: string; icon: Icon3DName }> = ({ name, expansion, icon }) => {
  const tiltRef = useSpringTilt<HTMLDivElement>(10);
  return (
    <div className="ls-foot-tech" ref={tiltRef}>
      <div className="ls-foot-tech-in">
        <span className="ls-foot-spot" aria-hidden="true" />
        <Icon3D name={icon} size={64} className="ls-foot-tech-icon" />
        <p className="ls-foot-tech-name">{name}</p>
        <p className="ls-foot-tech-expansion">{expansion}</p>
      </div>
    </div>
  );
};

/** Each network's mark, drawn for these tiles (white on the network's colour). */
const SocialGlyph: React.FC<{ slug: SocialProfile['slug'] }> = ({ slug }) => {
  switch (slug) {
    case 'linkedin':
      return (
        <text x="12" y="16.8" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor" fontFamily="Montserrat, Arial, sans-serif">
          in
        </text>
      );
    case 'facebook':
      return <path fill="currentColor" d="M13.6 20.5v-7h2.3l.4-2.8h-2.7V9c0-.8.3-1.3 1.4-1.3h1.4V5.2c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.1H8.7v2.8H11v7z" />;
    case 'instagram':
      return (
        <>
          <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16.4" cy="7.7" r="1.1" fill="currentColor" />
        </>
      );
    case 'tiktok':
      return <path fill="currentColor" d="M14.9 4.2c.4 2 1.8 3.4 3.8 3.6v2.6c-1.4 0-2.7-.4-3.8-1.2v5.4a4.5 4.5 0 1 1-4.5-4.5c.3 0 .5 0 .8.1v2.7a1.9 1.9 0 1 0 1.1 1.7V4.2z" />;
    case 'bluesky':
      return <path fill="currentColor" d="M12 11.3C10.7 8.6 7.8 5.9 5.8 5.6c-1.5-.2-1.9.9-1.7 2.3.4 2.1 2.4 4.1 5.3 4.6-2.5.6-3.5 2.1-2.2 3.8 1.3 1.7 3.4.6 4.8-1.9 1.4 2.5 3.5 3.6 4.8 1.9 1.3-1.7.3-3.2-2.2-3.8 2.9-.5 4.9-2.5 5.3-4.6.2-1.4-.2-2.5-1.7-2.3-2 .3-4.9 3-6.2 5.7z" />;
    case 'youtube':
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="3.6" fill="currentColor" />
          <path d="M10.3 9.3v5.4l4.7-2.7z" className="ls-foot-yt-play" />
        </>
      );
  }
};

/** A social profile as a glass tile in the network's colour, tilting under the pointer. */
const SocialTile: React.FC<{ profile: SocialProfile }> = ({ profile }) => {
  const tiltRef = useSpringTilt<HTMLAnchorElement>(22);
  return (
    <a
      ref={tiltRef}
      className={`ls-foot-soc ls-foot-soc-${profile.slug}`}
      href={profile.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Clues on ${profile.network} (opens in new window)`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <SocialGlyph slug={profile.slug} />
      </svg>
    </a>
  );
};

/** A contact line led by its 3D object. */
const ContactRow: React.FC<{ icon: Icon3DName; href: string; external?: boolean; label?: string; children: React.ReactNode }> = ({
  icon,
  href,
  external,
  label,
  children,
}) => (
  <a
    className="ls-foot-crow"
    href={href}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    aria-label={label}
  >
    <Icon3D name={icon} size={34} className="ls-foot-crow-icon" />
    <span>{children}</span>
  </a>
);

const Footer: React.FC<FooterProps> = ({ onOpenLegal, onOpenAbout, onOpenPricing }) => {
  const handleLegalClick = (page: LegalPage) => (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenLegal?.(page);
  };

  return (
    <footer className="ls-foot" aria-label="Site footer">
      <span className="ls-foot-limb" aria-hidden="true" />

      <div className="ls-foot-inner">
        <div className="ls-foot-top">
          <div className="ls-foot-brand">
            <span className="ls-foot-by">{COMPANY_CONTACT.company}</span>
            <span className="ls-foot-wordmark">LIFE SCORE</span>
            <p className="ls-foot-tagline">AI-Powered Global Relocation Intelligence</p>
            <p className="ls-foot-founder">Founded by John E. Desautels II · 35+ Years Real Estate Experience</p>
          </div>
          <div className="ls-foot-techs" role="list" aria-label="Proprietary Technology">
            {TECHNOLOGIES.map((t) => (
              <div role="listitem" key={t.name}>
                <TechTile {...t} />
              </div>
            ))}
          </div>
        </div>

        <div className="ls-foot-cols">
          <nav className="ls-foot-col" aria-label="Company">
            <h3 className="ls-foot-col-h">Company</h3>
            {onOpenAbout && (
              <button type="button" className="ls-foot-link" onClick={onOpenAbout}>
                About Clues Intelligence
              </button>
            )}
            <a className="ls-foot-link" href={`mailto:${COMPANY_CONTACT.email}`}>
              Contact
            </a>
          </nav>

          <div className="ls-foot-col">
            <h3 className="ls-foot-col-h">Contact</h3>
            {COMPANY_CONTACT.offices.map((office) => (
              <ContactRow
                key={office.name}
                icon="map-pin"
                href={office.mapsUrl}
                external
                label={`Open the ${office.name} office on Google Maps (opens in new window)`}
              >
                {office.lines.map((line, i) => (
                  <React.Fragment key={line}>
                    {i > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </ContactRow>
            ))}
            <ContactRow icon="phone" href={COMPANY_CONTACT.phoneHref}>
              {COMPANY_CONTACT.phoneDisplay}
            </ContactRow>
            <ContactRow icon="mail" href={`mailto:${COMPANY_CONTACT.email}`}>
              {COMPANY_CONTACT.email}
            </ContactRow>
            <ContactRow
              icon="link"
              href={COMPANY_CONTACT.website.href}
              external
              label={`${COMPANY_CONTACT.website.label} (opens in new window)`}
            >
              {COMPANY_CONTACT.website.label}
            </ContactRow>
            <div className="ls-foot-socials" role="list" aria-label="Clues on social media">
              {COMPANY_CONTACT.social.map((profile) => (
                <div role="listitem" key={profile.slug}>
                  <SocialTile profile={profile} />
                </div>
              ))}
            </div>
          </div>

          <div className="ls-foot-legal-pair">
            <nav className="ls-foot-col" aria-label="Legal">
              <h3 className="ls-foot-col-h">Legal</h3>
              {LEGAL_DOORS.map((door) => (
                <button
                  key={door.page}
                  type="button"
                  className={`ls-foot-link${door.page === 'do-not-sell' ? ' ccpa-dns-link' : ''}`}
                  onClick={handleLegalClick(door.page)}
                >
                  {door.label}
                </button>
              ))}
              <button
                type="button"
                className="ls-foot-link cookie-settings-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openCookieSettings'));
                }}
              >
                Cookie Settings
              </button>
            </nav>
            {onOpenPricing && (
              <nav className="ls-foot-col" aria-label="Pricing">
                <h3 className="ls-foot-col-h">
                  <Icon3D name="dollar" size={34} className="ls-foot-col-icon" />
                  Pricing
                </h3>
                <button type="button" className="ls-foot-link" onClick={onOpenPricing}>
                  Plans and prices
                </button>
              </nav>
            )}
          </div>
        </div>

        <div className="ls-foot-base">
          <p>
            CLUES™ (Comprehensive Location Utility &amp; Evaluation System), SMART™ (Strategic Market Assessment &amp; Rating
            Technology) and LIFE SCORE™ (Legal Independence &amp; Freedom Evaluation) are trademarks of {COMPANY_CONTACT.company}, a
            company registered in England and Wales (Company No. {COMPANY_CONTACT.companyNumber}). All other trademarks are the
            property of their respective owners.
          </p>
          <p>© {new Date().getFullYear()} {COMPANY_CONTACT.company}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
