/**
 * LIFE SCORE - About CLUES Component
 *
 * Full "About Clues" section with 6 sub-tabs organizing
 * the complete CLUES ecosystem presentation.
 *
 * Sub-tabs:
 *   1. Our Story     — Hero + Origin + Leadership
 *   2. Services      — Six Service Lines
 *   3. How It Works  — Steps 1-3 (Paragraphical, Core Assessment, Modules)
 *   4. Intelligence  — SMART Score + Multi-LLM + Life Score
 *   5. Deliverables  — Results + AI Personas
 *   6. Why CLUES     — Differentiators + CTA
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useEffect, useRef } from 'react';
import './AboutClues.css';

// ============================================================================
// TYPES
// ============================================================================

type CluesSubTab = 'story' | 'services' | 'how-it-works' | 'intelligence' | 'deliverables' | 'why-clues';

interface SubTabConfig {
  id: CluesSubTab;
  label: string;
  icon: string;
}

const SUB_TABS: SubTabConfig[] = [
  { id: 'story', label: 'Our Story', icon: '📖' },
  { id: 'services', label: 'Services', icon: '🏢' },
  { id: 'how-it-works', label: 'How It Works', icon: '⚙️' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { id: 'deliverables', label: 'Deliverables', icon: '📋' },
  { id: 'why-clues', label: 'Why CLUES', icon: '✦' },
];

// ============================================================================
// SPECIALTY MODULES DATA
// ============================================================================

const SPECIALTY_MODULES = [
  'Transportation & Mobility',
  'Food, Dining & Culinary Culture',
  'Outdoor Activities & Recreation',
  'Neighborhood Character & Design',
  'Housing Style & Home Features',
  'Social Values & Personal Rights',
  'Health & Medical Care',
  'Arts, Culture & Entertainment',
  'Legal Status & Immigration',
  'Climate & Weather Preferences',
  'Cultural Traditions & Heritage',
  'Financial & Economics',
  'Safety & Security',
  'Senior Care & Accessibility',
  'Political & Social Climate',
  'Religion & Spirituality',
  'Education & Learning',
  'Family & Children',
  'Social Life & Relationships',
  'Geographic Environment',
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AboutClues: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<CluesSubTab>('story');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top of content when switching sub-tabs
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSubTab]);

  return (
    <div className="about-clues" ref={contentRef}>
      {/* Atmospheric orbs */}
      <div className="ac-atmosphere">
        <div className="ac-orb ac-orb-1"></div>
        <div className="ac-orb ac-orb-2"></div>
        <div className="ac-orb ac-orb-3"></div>
      </div>

      {/* Sub-tab navigation */}
      <div className="ac-subtabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`ac-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            <span className="ac-subtab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ================================================================
          SUB-TAB 1: OUR STORY
          ================================================================ */}
      {activeSubTab === 'story' && (
        <>
          {/* Hero */}
          <div className="ac-glass-card ac-hero-card">
            <div className="ac-hero-eyebrow">About the Ecosystem</div>
            <h1 className="ac-hero-title"><span>CLUES</span></h1>
            <p className="ac-hero-subtitle">Comprehensive Location Utility &amp; Evaluation System</p>
            <p className="ac-hero-tagline">
              More than an application. More than a suite of applications. CLUES is the world&#39;s first comprehensive{' '}
              <strong>Relocation Intelligence Ecosystem</strong> — a living, evolving platform that understands who you
              are before it ever analyzes where you should live.
            </p>
            <div className="ac-ecosystem-badge">
              <span className="ac-dot"></span>
              London HQ &nbsp;&middot;&nbsp; Tampa &nbsp;&middot;&nbsp; Denver &nbsp;&middot;&nbsp; Los Angeles &nbsp;&middot;&nbsp; Manila
            </div>
          </div>

          {/* Our Story */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Origin</div>
            <h2 className="ac-section-title">Our Story</h2>
            <div className="ac-section-divider"></div>
            <p className="ac-lead-text">
              In 2020, the world changed. A global pandemic forced millions to reconsider where they live, work, and
              raise their families. Remote work untethered professionals from their offices. Retirees began reassessing
              their forever homes. And families everywhere started asking a question that had no good answer:
            </p>
            <div className="ac-callout">&ldquo;Where in the world should I live?&rdquo;</div>
            <p className="ac-body-text">
              We know that question intimately — because we asked it ourselves. John and Mel Desautels II found themselves
              at that very crossroads. After decades in real estate, appraisal, and mortgage lending, John understood
              property markets better than most. But when he and Mel began exploring where they might relocate — from
              Florida to Colorado, from California to Europe — they discovered something astonishing:{' '}
              <strong>no comprehensive system existed</strong> to help people make one of the most important decisions of
              their lives.
            </p>
            <p className="ac-body-text">
              There were tools that compared cities by cost of living or climate. A handful of websites ranked &ldquo;best
              places to live.&rdquo; But nothing understood the <em>person</em> first and then analyzed the world through
              their unique lens. Nothing asked about your values, your deal-breakers, your medical needs, your cultural
              preferences, your political comfort zone, or the thousand small things that determine whether a place feels
              like home.
            </p>
            <p className="ac-body-text"><strong>So we built it.</strong></p>
            <div className="ac-callout">
              Before launching CLUES to the public, we tested the system on ourselves — without telling it which cities
              we already loved. The result? CLUES correctly identified three of our five favorite cities in the world.
              The system didn&#39;t know our history. It simply analyzed who we are and matched us to where we belong.
              That was our proof of concept. That was the moment we knew CLUES was something that could genuinely change
              people&#39;s lives.
            </div>
          </div>

          {/* Who We Are */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Leadership</div>
            <h2 className="ac-section-title">Who We Are</h2>
            <div className="ac-section-divider"></div>
            <p className="ac-body-text">
              CLUES originated as a product of <strong>John E. Desautels II &amp; Mel P. Desautels</strong>, founders of
              John E. Desautels II &amp; Associates, a licensed real estate brokerage headquartered in Tampa, Florida.
              Today we serve individual clients, corporate relocation departments, and enterprise organizations
              worldwide.
            </p>
            <div className="ac-person-grid">
              <div className="ac-person-card">
                <div className="ac-person-name">John E. Desautels II</div>
                <div className="ac-person-role">Founder &amp; CEO</div>
                <div className="ac-person-desc">
                  Over 35 years in real estate brokerage, property appraisal, and executive leadership in mortgage
                  lending — including serving as president of MortgageLoans.com. Licensed in Florida and Colorado. John
                  isn&#39;t just a real estate professional who adopted AI — he&#39;s a technologist who understands real
                  estate at its deepest level.
                </div>
              </div>
              <div className="ac-person-card">
                <div className="ac-person-name">Mel Desautels</div>
                <div className="ac-person-role">Co-Founder &amp; Partner</div>
                <div className="ac-person-desc">
                  Born in the Philippines, having lived across multiple countries before settling in the United States,
                  Mel understands the emotional, logistical, and cultural complexities of international relocation on a
                  deeply personal level. Her lived experience as an expat and global citizen informs every dimension of
                  the CLUES ecosystem.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          SUB-TAB 2: SERVICES
          ================================================================ */}
      {activeSubTab === 'services' && (
        <div className="ac-glass-card">
          <div className="ac-section-label">Services</div>
          <h2 className="ac-section-title">Six Service Lines, One Ecosystem</h2>
          <div className="ac-section-divider"></div>
          <p className="ac-body-text">
            CLUES serves every relocation scenario — whether you&#39;re buying your first home in Florida, renting a
            flat in Barcelona, or searching for the perfect retirement community anywhere on Earth. Each service line is
            powered by the same sophisticated intelligence engine, tailored to the specific requirements of your
            situation.
          </p>
          <table className="ac-services-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Ideal For</th>
                <th>From</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="ac-service-name">Florida Buyers Intelligence</span></td>
                <td>Homebuyers relocating to or within Florida</td>
                <td className="ac-service-price">$197</td>
              </tr>
              <tr>
                <td>
                  <span className="ac-service-name">Florida Sellers Advantage</span>{' '}
                  <span className="ac-service-flag">Beta</span>
                </td>
                <td>Florida homeowners preparing to sell with SMART Score™ analysis</td>
                <td className="ac-service-price">—</td>
              </tr>
              <tr>
                <td><span className="ac-service-name">U.S. Buyers Nationwide</span></td>
                <td>Homebuyers searching anywhere in the United States</td>
                <td className="ac-service-price">$297</td>
              </tr>
              <tr>
                <td><span className="ac-service-name">U.S. Renters Intelligence</span></td>
                <td>Renters seeking the right city and neighborhood across the U.S.</td>
                <td className="ac-service-price">$197</td>
              </tr>
              <tr>
                <td>
                  <span className="ac-service-name">International Buyers Global</span>{' '}
                  <span className="ac-service-flag">Flagship</span>
                </td>
                <td>Buyers exploring property ownership abroad</td>
                <td className="ac-service-price">$997</td>
              </tr>
              <tr>
                <td><span className="ac-service-name">International Renters Worldwide</span></td>
                <td>Expats, digital nomads, and retirees renting internationally</td>
                <td className="ac-service-price">$597</td>
              </tr>
            </tbody>
          </table>
          <p className="ac-body-text" style={{ fontSize: '14px', marginTop: '16px' }}>
            <strong>Who uses CLUES?</strong> First-time homebuyers, luxury seekers, retirees, digital nomads, expats,
            climate migrants, remote workers, families with children, individuals with specialized medical needs,
            corporate relocation teams, and enterprise organizations — anyone who has ever wondered whether there&#39;s a
            better place in the world for them.
          </p>
        </div>
      )}

      {/* ================================================================
          SUB-TAB 3: HOW IT WORKS
          ================================================================ */}
      {activeSubTab === 'how-it-works' && (
        <div className="ac-glass-card">
          <div className="ac-section-label">The System</div>
          <h2 className="ac-section-title">How CLUES Works</h2>
          <div className="ac-section-divider"></div>
          <p className="ac-lead-text">
            CLUES doesn&#39;t start by analyzing cities. It starts by understanding <strong>you</strong>. The right
            place to live is entirely dependent on the person looking for it — a city that&#39;s perfect for one person
            may be completely wrong for another. That&#39;s why we invest extraordinary effort in building your unique
            profile before analyzing a single destination.
          </p>
          <p className="ac-body-text">
            Our question library contains <strong>2,000+ meticulously crafted questions</strong> — the largest
            relocation assessment framework ever built. Your Main Questionnaire and 20+ specialty modules draw from this
            living library, which expands and evolves as we refine our intelligence capabilities. Across the ecosystem,
            we analyze <strong>thousands of weighted variables</strong> to build the most complete picture of who you are
            and where you belong.
          </p>

          {/* Step 1 */}
          <h3 className="ac-step-title">Step 1 — Your Story: The Paragraphical Module</h3>
          <p className="ac-body-text">
            Your CLUES journey begins with something no other platform offers: an open-ended narrative space where you
            tell us your story in your own words — your life experiences, your values, what excites you, what concerns
            you, and what &ldquo;home&rdquo; means to you.
          </p>
          <p className="ac-body-text">
            This isn&#39;t a formality. Through natural language processing, our AI uses your narrative as the{' '}
            <strong>interpretive lens</strong> for every answer you give. It identifies your core values, detects
            constraints you might not think to mention in a checkbox — an aging parent, a medical condition, a custody
            arrangement — and analyzes your communication style to deliver results in a way that resonates with you
            personally.
          </p>

          {/* Step 2 */}
          <h3 className="ac-step-title">Step 2 — Your Profile: The Core Assessment</h3>
          <p className="ac-body-text">
            The Core Assessment is divided into four critical sections: <strong>25 demographic questions</strong>{' '}
            establishing the factual framework of your life, <strong>25 psychographic questions</strong> revealing the
            person behind the demographics, and then the most powerful feature in the entire ecosystem:
          </p>
          <p className="ac-body-text">
            <strong>25 DO NOT WANTS</strong> — your absolute dealbreakers. Each acts as an elimination filter. Before our
            AI analyzes a single city&#39;s merits, your DO NOT WANTS can remove 80% or more of global destinations from
            consideration. <strong>25 MUST HAVES</strong> — your non-negotiable requirements every recommended
            destination must meet.
          </p>
          <div className="ac-callout">
            You&#39;ll rank your Top 5 DO NOT WANTS and Top 5 MUST HAVES in priority order — telling our AI not just
            what matters, but how much each factor matters relative to the others. This enables mathematically weighted
            analysis that reflects your true priorities with extraordinary precision.
          </div>

          {/* Step 3 */}
          <h3 className="ac-step-title">Step 3 — Deep Dives: 20+ Specialty Modules</h3>
          <p className="ac-body-text">
            Based on your story and Core Assessment, our AI recommends which specialty modules are most relevant.
            You&#39;re never required to complete modules that don&#39;t apply — each one contains 50 to 100 questions
            drawn from our 2,000+ question library, diving deep into a specific dimension of your lifestyle.
          </p>
          <div className="ac-module-grid">
            {SPECIALTY_MODULES.map((name, index) => (
              <div className="ac-module-chip" key={index}>
                <div className="ac-module-num">{String(index + 1).padStart(2, '0')}</div>
                <div className="ac-module-name">{name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          SUB-TAB 4: INTELLIGENCE
          ================================================================ */}
      {activeSubTab === 'intelligence' && (
        <>
          {/* SMART Score + Multi-LLM */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Intelligence</div>
            <h2 className="ac-section-title">Where Mathematics Meets Meaning</h2>
            <div className="ac-section-divider"></div>

            <h3 className="ac-subsection-title">S.M.A.R.T. Score™ Technology</h3>
            <p className="ac-body-text">
              At the heart of CLUES is our proprietary <strong>S.M.A.R.T. Score™</strong> — the{' '}
              <em>Strategic Market Assessment &amp; Rating Technology</em>. This is not a simple ranking system. It is a
              sophisticated mathematical framework built on advanced weighted algorithms, multi-variable optimization
              functions, normalization engines, and priority-vector analysis that evaluates hundreds of global
              metropolitan areas across thousands of individually weighted variables.
            </p>
            <p className="ac-body-text">
              Every client receives a <strong>unique mathematical model</strong>. Our algorithms dynamically weight
              variables based on your priorities, apply Borda-weighted priority vectors derived from your ranked
              preferences, normalize data across disparate scales and sources, and produce precision scoring that
              reflects the true complexity of human preference. No two clients ever receive the same weighting formula —
              because no two people are the same.
            </p>
            <p className="ac-body-text">
              Cities are scored on a percentage scale — 90–100% excellent, 80–89% very good, 70–79% good, 50–69% fair,
              below 50% poor — with every score backed by transparent methodology. We don&#39;t hide behind a black box.
              Every data source is cited. Every limitation is disclosed.
            </p>

            <h3 className="ac-subsection-title">Multi-LLM Consensus Architecture</h3>
            <p className="ac-body-text">
              Most AI platforms rely on a single language model. CLUES deploys{' '}
              <strong>five independently operating AI evaluators</strong> — each analyzing your data and destination data
              separately. Their findings are synthesized by a senior AI judge that identifies consensus, flags
              disagreements, and produces the final analysis.
            </p>
            <p className="ac-body-text">
              This multi-model architecture dramatically reduces the risk of AI hallucination. No single AI&#39;s
              unverified claim makes it into your report. If a data point cannot be confirmed across multiple sources, it
              is flagged with an explicit uncertainty notice or reported as &ldquo;DATA NOT FOUND&rdquo; rather than
              guessed at.
            </p>
            <div className="ac-callout">
              Our zero-tolerance policy on AI hallucination is absolute. We would rather tell you we don&#39;t know
              something than risk giving you false information. People&#39;s lives depend on getting this right.
            </div>
          </div>

          {/* CLUES Life Score */}
          <div className="ac-glass-card">
            <div className="ac-feature-card">
              <div className="ac-feature-badge">&#9878;&#65039; Sister Application</div>
              <div className="ac-feature-title">CLUES Life Score™ — clueslifescore.com</div>
              <div className="ac-feature-desc">
                Our sister application lets you compare <strong>any two cities in the world</strong> against{' '}
                <strong>100 law and lived legal metrics</strong> to determine which city truly is the most free. Using
                our proprietary <strong>LIFE Score™</strong> — the{' '}
                <em>Legal Independence &amp; Freedom Evaluation</em> — CLUES Life Score evaluates personal freedoms,
                civil liberties, legal protections, regulatory environments, and the gap between what the law says and
                how people actually experience it — the &ldquo;lived legal reality.&rdquo; Whether you&#39;re comparing
                Amsterdam to Austin or Lisbon to Lagos, CLUES Life Score delivers the definitive freedom comparison.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          SUB-TAB 5: DELIVERABLES
          ================================================================ */}
      {activeSubTab === 'deliverables' && (
        <>
          {/* Your Results */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Deliverables</div>
            <h2 className="ac-section-title">Your Results</h2>
            <div className="ac-section-divider"></div>
            <p className="ac-body-text">
              Your personal CLUES dashboard features <strong>22 interactive glassmorphic tabs</strong> that illuminate as
              you progress. Each completed module lights up, giving you a visual sense of how deep your analysis goes.
            </p>
            <p className="ac-body-text">
              CLUES generates an initial shortlist of 3 to 15 cities, then <strong>progressively narrows</strong> as you
              complete additional modules. Each recommended city includes detailed scoring breakdowns, narrative
              explanations, specific neighborhood recommendations, trade-off analysis, cost of living data, and practical
              relocation considerations.
            </p>
            <p className="ac-body-text">
              The culmination is the <strong>Judge&#39;s Verdict</strong> — a definitive recommendation identifying your
              #1 city, top communities, best neighborhoods, a comprehensive implementation plan, and comparison of
              alternatives. The complete intelligence report spans 75 to 100 professionally formatted pages with data
              visualizations, risk assessments, and full source citations — delivered via our interactive narrative{' '}
              <strong>Olivia</strong> assistant, <strong>Cristiano&#39;s</strong> Judge video presentations, and{' '}
              <strong>Gamma-polished</strong> executive report documents.
            </p>
          </div>

          {/* AI Team */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Digital Team</div>
            <h2 className="ac-section-title">Meet Our AI Personas</h2>
            <div className="ac-section-divider"></div>
            <p className="ac-body-text">
              Three purpose-built digital professionals guide, inform, and support you throughout your journey.
            </p>
            <div className="ac-persona-stack">
              <div className="ac-persona-row">
                <div className="ac-persona-avatar olivia">&#10022;</div>
                <div className="ac-persona-info">
                  <div className="ac-persona-name-title">Olivia</div>
                  <div className="ac-persona-subtitle">Your Personal Guide — Present Everywhere</div>
                  <div className="ac-persona-desc">
                    The face of CLUES. A sophisticated, multilingual AI assistant available from our website through to
                    your final report. After your analysis, Olivia is preloaded with your complete results for detailed,
                    personalized conversations about your recommended cities and neighborhoods. She can even generate
                    visual imagery of potential new homes.
                  </div>
                </div>
              </div>
              <div className="ac-persona-row">
                <div className="ac-persona-avatar cristiano">&#9884;</div>
                <div className="ac-persona-info">
                  <div className="ac-persona-name-title">Cristiano</div>
                  <div className="ac-persona-subtitle">The Judge — Delivers the Verdict</div>
                  <div className="ac-persona-desc">
                    The authoritative voice behind the Judge&#39;s Verdict. Cristiano delivers your final results with
                    gravitas through professionally produced video presentations — judgment summaries, court-style
                    recommendations, and definitive analyses. He delivers the verdict; he doesn&#39;t debate it.
                  </div>
                </div>
              </div>
              <div className="ac-persona-row">
                <div className="ac-persona-avatar emilia">&#9672;</div>
                <div className="ac-persona-info">
                  <div className="ac-persona-name-title">Emilia</div>
                  <div className="ac-persona-subtitle">Technical Support Specialist</div>
                  <div className="ac-persona-desc">
                    Your behind-the-scenes technical expert. Available within your dashboard and module applications via
                    voice and text, Emilia ensures you never feel lost as you work through the system — brilliant,
                    personable, and always ready to help.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================================================================
          SUB-TAB 6: WHY CLUES
          ================================================================ */}
      {activeSubTab === 'why-clues' && (
        <>
          {/* Differentiators */}
          <div className="ac-glass-card">
            <div className="ac-section-label">Differentiators</div>
            <h2 className="ac-section-title">Why CLUES Is Different</h2>
            <div className="ac-section-divider"></div>
            <div className="ac-diff-list">
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#127963;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">Real Expertise, Not Just Algorithms</div>
                  <div className="ac-diff-desc">
                    Built by a licensed real estate professional with 35+ years of experience. Every algorithm, every
                    question, and every recommendation is informed by decades of understanding how people actually find
                    and choose homes.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#129516;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">People First, Then Places</div>
                  <div className="ac-diff-desc">
                    Other tools start with cities and ask you to compare. CLUES starts with you — your story, your
                    values, your deal-breakers — and finds the places that match who you are. The difference is
                    fundamental.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#8734;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">Unmatched Analytical Depth</div>
                  <div className="ac-diff-desc">
                    A 2,000+ question library, thousands of weighted variables, and advanced mathematical algorithms
                    analyzing hundreds of global metros — personalized to your unique priority profile. Nothing else
                    comes close.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#8856;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">The Power of Elimination</div>
                  <div className="ac-diff-desc">
                    Our DO NOT WANTS system eliminates 80%+ of destinations before analysis begins. You never waste time
                    evaluating places that were never right for you.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#9678;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">Radical Transparency &amp; Zero Fabrication</div>
                  <div className="ac-diff-desc">
                    Every data source cited. Every limitation disclosed. Our multi-model AI architecture ensures you
                    never receive fabricated information. If we can&#39;t verify it, we tell you. Period.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#10227;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">We Evolve as You Evolve</div>
                  <div className="ac-diff-desc">
                    CLUES is a living ecosystem — continuously learning, expanding, and refining. As our clients&#39;
                    needs evolve, so does our platform. And as we evolve, our clients evolve with us. This is not a
                    static product. It&#39;s an ongoing intelligence partnership.
                  </div>
                </div>
              </div>
              <div className="ac-diff-item">
                <div className="ac-diff-icon">&#127970;</div>
                <div className="ac-diff-content">
                  <div className="ac-diff-title">Enterprise-Grade Solutions</div>
                  <div className="ac-diff-desc">
                    From individual clients to corporate relocation departments and enterprise organizations, CLUES
                    offers scalable solutions built for the complexity of global talent mobility and organizational
                    relocation programs.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA / Closing */}
          <div className="ac-glass-card ac-cta-section">
            <div className="ac-section-label" style={{ marginBottom: '20px' }}>The Ecosystem</div>
            <h2 className="ac-cta-title">
              Your Home Is Out There.<br />
              CLUES Will Help You Find It.
            </h2>
            <p className="ac-cta-subtitle">
              The world&#39;s first comprehensive Relocation Intelligence Ecosystem — where 35 years of expertise meets
              the frontier of AI.
            </p>
            <div className="ac-cta-links">
              <a href="https://cluesnomad.com" className="ac-cta-link primary" target="_blank" rel="noopener noreferrer">
                Explore CLUES &rarr;
              </a>
              <a href="https://clueslifescore.com" className="ac-cta-link secondary" target="_blank" rel="noopener noreferrer">
                CLUES Life Score &#9878;&#65039;
              </a>
            </div>
            <div className="ac-offices-strip">
              <div className="ac-office-tag hq"><span className="ac-pin">&#9670;</span> London HQ</div>
              <div className="ac-office-tag"><span className="ac-pin">&#9679;</span> Tampa</div>
              <div className="ac-office-tag"><span className="ac-pin">&#9679;</span> Denver</div>
              <div className="ac-office-tag"><span className="ac-pin">&#9679;</span> Los Angeles</div>
              <div className="ac-office-tag"><span className="ac-pin">&#9679;</span> Manila</div>
            </div>
            <div style={{ marginTop: '28px' }}>
              <p className="ac-legal">&copy; 2026 John E. Desautels II &amp; Associates. All rights reserved.</p>
              <p className="ac-legal">
                CLUES™, SMART Score™, LIFE Score™, and all associated marks are trademarks of CLUES Intelligence LTD.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AboutClues;
