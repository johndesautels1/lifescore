/**
 * LIFE SCORE - Field Knowledge: Speech & Lifestyle
 * 10 metrics (sl_01 through sl_10)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_SPEECH_LIFESTYLE: Record<string, FieldKnowledge> = {
  'sl_01_free_speech': {
    talkingPoints: [
      'First Amendment provides strong baseline',
      'State constitutions may add protections',
      'Campus free speech policies vary',
      'Anti-SLAPP laws protect against harassment lawsuits',
      'Public forum access rules differ',
    ],
    keySourceTypes: ['FIRE', 'ACLU', 'State constitution'],
    commonQuestions: [
      'What are the free speech protections?',
      'Are there anti-SLAPP laws?',
      'What about campus speech?',
    ],
    dailyLifeImpact: 'Affects ability to speak freely without legal risk.',
  },

  'sl_02_press_freedom': {
    talkingPoints: [
      'Shield laws protect journalist sources in most states',
      'Public records access varies significantly',
      'Press access to government meetings differs',
      'Journalist safety and harassment concerns',
      'Local news deserts affecting coverage',
    ],
    keySourceTypes: ['Reporters Committee', 'SPJ', 'State press association'],
    commonQuestions: [
      'Are journalist sources protected?',
      'How good is public records access?',
      'Can I attend government meetings?',
    ],
    dailyLifeImpact: 'Affects quality of local journalism and government transparency.',
  },

  'sl_03_internet_freedom': {
    talkingPoints: [
      'Net neutrality rules vary after federal repeal',
      'Some states enacted their own net neutrality',
      'Municipal broadband bans in some states',
      'Rural broadband access issues',
      'Privacy in ISP data collection',
    ],
    keySourceTypes: ['State broadband office', 'EFF', 'FCC'],
    commonQuestions: [
      'Is there net neutrality?',
      'Can I get municipal broadband?',
      'How is rural internet access?',
    ],
    dailyLifeImpact: 'Affects internet access and online privacy.',
  },

  'sl_04_hate_speech_laws': {
    talkingPoints: [
      'US has minimal hate speech restrictions',
      'True threats and incitement not protected',
      'Hate crime enhancements for bias-motivated crimes',
      'Campus speech codes vary',
      'Social media moderation is private action',
    ],
    keySourceTypes: ['ACLU', 'State hate crime laws', 'ADL'],
    commonQuestions: [
      'Is hate speech illegal?',
      'What are hate crime laws?',
      'How is bias-motivated crime prosecuted?',
    ],
    dailyLifeImpact: 'Affects consequences for discriminatory speech and actions.',
  },

  'sl_05_protest_rights': {
    talkingPoints: [
      'Permit requirements for protests vary',
      'Anti-protest laws enacted in some states',
      'Police response to protests differs',
      'Civil disobedience consequences vary',
      'Counter-protest management',
    ],
    keySourceTypes: ['ACLU', 'State protest laws', 'ICNL'],
    commonQuestions: [
      'Do I need a permit to protest?',
      'What are the rules for demonstrations?',
      'Are there anti-protest laws?',
    ],
    dailyLifeImpact: 'Affects ability to participate in civic demonstrations.',
  },

  'sl_06_religious_freedom': {
    talkingPoints: [
      'First Amendment protects free exercise',
      'State RFRAs provide additional protections',
      'Religious exemptions from general laws vary',
      'Workplace religious accommodation',
      'School prayer and religious clubs rules',
    ],
    keySourceTypes: ['State RFRA', 'Becket Fund', 'ACLU'],
    commonQuestions: [
      'What religious freedom protections exist?',
      'Are there religious exemptions from laws?',
      'What about workplace accommodation?',
    ],
    dailyLifeImpact: 'Affects religious practice and exemptions.',
  },

  'sl_07_data_privacy': {
    talkingPoints: [
      'California CCPA/CPRA leads nation',
      'Growing number of states with privacy laws',
      'No comprehensive federal privacy law yet',
      'Data broker regulations emerging',
      'Biometric privacy laws in some states',
    ],
    keySourceTypes: ['State privacy law', 'IAPP', 'EFF'],
    commonQuestions: [
      'What data privacy rights do I have?',
      'Can I opt out of data collection?',
      'Are there biometric protections?',
    ],
    dailyLifeImpact: 'Affects control over personal data.',
  },

  'sl_08_dress_code': {
    talkingPoints: [
      'Public nudity laws vary by locality',
      'Beach and pool dress standards differ',
      'Religious dress protections',
      'School dress codes vary',
      'Workplace dress code limitations',
    ],
    keySourceTypes: ['Local ordinances', 'State civil rights law', 'ACLU'],
    commonQuestions: [
      'What are public dress requirements?',
      'Are there nude beaches?',
      'What about religious dress protections?',
    ],
    dailyLifeImpact: 'Affects personal expression through dress.',
  },

  'sl_09_cultural_tolerance': {
    talkingPoints: [
      'Diversity varies significantly by region',
      'Immigration and international population presence',
      'Hate crime rates and reporting',
      'LGBTQ+ acceptance indicators',
      'Religious diversity and acceptance',
    ],
    keySourceTypes: ['Census data', 'Pew Research', 'HRC', 'ADL'],
    commonQuestions: [
      'How diverse is this area?',
      'How accepting is the community?',
      'What is the hate crime rate?',
    ],
    dailyLifeImpact: 'Affects sense of belonging and safety.',
  },

  'sl_10_defamation_laws': {
    talkingPoints: [
      'Defamation requires false statement of fact',
      'Public figures face higher standards',
      'Anti-SLAPP laws deter frivolous suits',
      'Online defamation increasingly common',
      'Truth is absolute defense',
    ],
    keySourceTypes: ['State defamation law', 'Anti-SLAPP statutes', 'Media law resources'],
    commonQuestions: [
      'What are the defamation standards?',
      'Are there anti-SLAPP protections?',
      'Can I be sued for online reviews?',
    ],
    dailyLifeImpact: 'Affects risk when speaking about others.',
  },
};
