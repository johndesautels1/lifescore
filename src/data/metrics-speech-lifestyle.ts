/**
 * LIFE SCORE™ - Speech, Lifestyle & Culture Metrics (10 Metrics)
 * Category: speech_lifestyle
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { MetricDefinition } from '../types/metrics';

export const SPEECH_LIFESTYLE_METRICS: MetricDefinition[] = [
  {
    id: 'sl_01_free_speech',
    categoryId: 'speech_lifestyle',
    name: 'Free Speech Protections',
    shortName: 'Free Speech',
    description: 'Constitutional/legal protections for free speech',
    weight: 10,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} free speech laws protections',
      '{city} freedom of expression first amendment'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'Very strong protections', score: 100 },
      { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
      { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
      { level: 2, label: 'Limited', description: 'Some restrictions', score: 40 },
      { level: 1, label: 'Weak', description: 'Significant limits', score: 20 }
    ] }
  },
  {
    id: 'sl_02_press_freedom',
    categoryId: 'speech_lifestyle',
    name: 'Press Freedom',
    shortName: 'Press Freedom',
    description: 'Freedom of the press and media',
    weight: 9,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} press freedom index ranking',
      '{city} journalism freedom media independence'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'Top press freedom', score: 100 },
      { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some issues', score: 60 },
      { level: 2, label: 'Limited', description: 'Notable restrictions', score: 40 },
      { level: 1, label: 'Poor', description: 'Severe restrictions', score: 20 }
    ] }
  },
  {
    id: 'sl_03_internet_freedom',
    categoryId: 'speech_lifestyle',
    name: 'Internet Freedom',
    shortName: 'Internet Freedom',
    description: 'Freedom from internet censorship and surveillance',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} internet freedom censorship',
      '{city} VPN legal website blocking'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Free', description: 'No censorship', score: 100 },
      { level: 4, label: 'Mostly Free', description: 'Minimal blocking', score: 80 },
      { level: 3, label: 'Partly Free', description: 'Some restrictions', score: 60 },
      { level: 2, label: 'Not Free', description: 'Significant censorship', score: 40 },
      { level: 1, label: 'Very Restricted', description: 'Heavy censorship', score: 20 }
    ] }
  },
  {
    id: 'sl_04_hate_speech_laws',
    categoryId: 'speech_lifestyle',
    name: 'Hate Speech Law Scope',
    shortName: 'Hate Speech Laws',
    description: 'Breadth and enforcement of hate speech restrictions',
    weight: 7,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} hate speech laws restrictions',
      '{city} speech crimes offensive speech penalties'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'No Laws', description: 'Speech fully protected', score: 100 },
      { level: 4, label: 'Narrow', description: 'Only threats/incitement', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some hate speech laws', score: 60 },
      { level: 2, label: 'Broad', description: 'Extensive restrictions', score: 40 },
      { level: 1, label: 'Very Broad', description: 'Heavy speech limits', score: 20 }
    ] }
  },
  {
    id: 'sl_05_protest_rights',
    categoryId: 'speech_lifestyle',
    name: 'Right to Protest',
    shortName: 'Protest Rights',
    description: 'Legal protections for peaceful assembly and protest',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} protest rights assembly freedom',
      '{city} demonstration permit requirements restrictions'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Strong', description: 'Minimal restrictions', score: 100 },
      { level: 4, label: 'Strong', description: 'Good protections', score: 80 },
      { level: 3, label: 'Moderate', description: 'Permit required', score: 60 },
      { level: 2, label: 'Limited', description: 'Significant hurdles', score: 40 },
      { level: 1, label: 'Restricted', description: 'Protests suppressed', score: 20 }
    ] }
  },
  {
    id: 'sl_06_religious_freedom',
    categoryId: 'speech_lifestyle',
    name: 'Religious Freedom',
    shortName: 'Religious Freedom',
    description: 'Freedom of religion and from religion',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} religious freedom separation church state',
      '{city} freedom of religion restrictions'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'Full religious freedom', score: 100 },
      { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some issues', score: 60 },
      { level: 2, label: 'Limited', description: 'State religion influence', score: 40 },
      { level: 1, label: 'Restricted', description: 'Religious restrictions', score: 20 }
    ] }
  },
  {
    id: 'sl_07_data_privacy',
    categoryId: 'speech_lifestyle',
    name: 'Data Privacy Laws',
    shortName: 'Data Privacy',
    description: 'Legal protections for personal data privacy',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {country} data privacy laws GDPR regulations',
      '{city} personal data protection rights'
    ],
    scoringCriteria: { type: 'categorical', options: [
      { value: 'gdpr_level', label: 'GDPR-Level Protection', score: 100 },
      { value: 'strong', label: 'Strong Protection', score: 80 },
      { value: 'moderate', label: 'Moderate Protection', score: 60 },
      { value: 'weak', label: 'Weak Protection', score: 40 },
      { value: 'minimal', label: 'Minimal/None', score: 20 }
    ] }
  },
  {
    id: 'sl_08_dress_code',
    categoryId: 'speech_lifestyle',
    name: 'Dress Code Freedom',
    shortName: 'Dress Freedom',
    description: 'Freedom from dress code or modesty requirements',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} dress code laws nudity restrictions',
      '{city} clothing requirements public decency'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Permissive', description: 'Few restrictions', score: 100 },
      { level: 4, label: 'Permissive', description: 'Minimal requirements', score: 80 },
      { level: 3, label: 'Standard', description: 'Basic standards', score: 60 },
      { level: 2, label: 'Restrictive', description: 'Modesty requirements', score: 40 },
      { level: 1, label: 'Very Restrictive', description: 'Strict dress codes', score: 20 }
    ] }
  },
  {
    id: 'sl_09_cultural_tolerance',
    categoryId: 'speech_lifestyle',
    name: 'Cultural Tolerance',
    shortName: 'Tolerance',
    description: 'Social tolerance for diverse lifestyles',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} cultural tolerance diversity acceptance',
      '{city} expat friendly multicultural inclusive'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Tolerant', description: 'Highly diverse/inclusive', score: 100 },
      { level: 4, label: 'Tolerant', description: 'Generally accepting', score: 80 },
      { level: 3, label: 'Moderate', description: 'Mixed attitudes', score: 60 },
      { level: 2, label: 'Intolerant', description: 'Conservative culture', score: 40 },
      { level: 1, label: 'Very Intolerant', description: 'Hostile to differences', score: 20 }
    ] }
  },
  {
    id: 'sl_10_defamation_laws',
    categoryId: 'speech_lifestyle',
    name: 'Defamation Law Balance',
    shortName: 'Defamation Laws',
    description: 'Balance between reputation and free speech in defamation',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} defamation libel laws',
      '{city} defamation lawsuit burden of proof'
    ],
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Speech-Friendly', description: 'High burden for plaintiffs', score: 100 },
      { level: 4, label: 'Balanced', description: 'Fair standards', score: 80 },
      { level: 3, label: 'Moderate', description: 'Standard laws', score: 60 },
      { level: 2, label: 'Plaintiff-Friendly', description: 'Easy to sue', score: 40 },
      { level: 1, label: 'Chilling', description: 'Suppresses speech', score: 20 }
    ] }
  }
];
