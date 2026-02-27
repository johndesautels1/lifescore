/**
 * LIFE SCORE™ - Personal Freedom & Morality Metrics (15 Metrics)
 * Category: personal_freedom
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { MetricDefinition } from '../types/metrics';

export const PERSONAL_FREEDOM_METRICS: MetricDefinition[] = [
  {
    id: 'pf_01_cannabis_legal',
    categoryId: 'personal_freedom',
    name: 'Cannabis Legality',
    shortName: 'Cannabis',
    description: 'Legal status of recreational cannabis use and possession',
    weight: 7,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} cannabis marijuana legal status 2024 2025 2026',
      '{city} recreational marijuana laws current'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'fully_legal', label: 'Fully Legal (recreational)', score: 100 },
        { value: 'medical_only', label: 'Medical Only', score: 60 },
        { value: 'decriminalized', label: 'Decriminalized', score: 40 },
        { value: 'illegal_minor', label: 'Illegal (minor penalty)', score: 20 },
        { value: 'illegal_severe', label: 'Illegal (severe penalty)', score: 0 }
      ]
    }
  },
  {
    id: 'pf_02_alcohol_restrictions',
    categoryId: 'personal_freedom',
    name: 'Alcohol Purchase Restrictions',
    shortName: 'Alcohol Laws',
    description: 'Restrictions on alcohol sales (hours, locations, types)',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} alcohol sales restrictions hours Sunday laws',
      '{city} liquor store hours regulations blue laws'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Minimal Restrictions', description: '24/7 sales, all venues', score: 100 },
        { level: 4, label: 'Light Restrictions', description: 'Limited hours only', score: 80 },
        { level: 3, label: 'Moderate Restrictions', description: 'Some day/location limits', score: 60 },
        { level: 2, label: 'Heavy Restrictions', description: 'State stores, limited hours', score: 40 },
        { level: 1, label: 'Severe Restrictions', description: 'Dry areas, major limits', score: 20 }
      ]
    }
  },
  {
    id: 'pf_03_gambling_legal',
    categoryId: 'personal_freedom',
    name: 'Gambling Legality',
    shortName: 'Gambling',
    description: 'Legal status of gambling (casinos, sports betting, online)',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} gambling casino sports betting legal status',
      '{city} online gambling laws regulations 2024'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'fully_legal', label: 'Fully Legal (all forms)', score: 100 },
        { value: 'mostly_legal', label: 'Mostly Legal (some restrictions)', score: 75 },
        { value: 'limited', label: 'Limited (lottery, some betting)', score: 50 },
        { value: 'heavily_restricted', label: 'Heavily Restricted', score: 25 },
        { value: 'illegal', label: 'Illegal', score: 0 }
      ]
    }
  },
  {
    id: 'pf_04_prostitution_status',
    categoryId: 'personal_freedom',
    name: 'Sex Work Legal Status',
    shortName: 'Sex Work Laws',
    description: 'Legal status of adult consensual sex work',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {country} prostitution sex work legal status',
      '{city} sex work laws decriminalized'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'legal_regulated', label: 'Legal & Regulated', score: 100 },
        { value: 'decriminalized', label: 'Decriminalized', score: 80 },
        { value: 'selling_legal', label: 'Selling Legal, Buying Illegal', score: 50 },
        { value: 'illegal_light', label: 'Illegal (light enforcement)', score: 30 },
        { value: 'illegal_severe', label: 'Illegal (severe penalties)', score: 0 }
      ]
    }
  },
  {
    id: 'pf_05_drug_possession',
    categoryId: 'personal_freedom',
    name: 'Drug Possession Penalties',
    shortName: 'Drug Penalties',
    description: 'Severity of penalties for personal drug possession (non-cannabis)',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} drug possession penalties personal use laws',
      '{city} {country} drug decriminalization policy'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'decriminalized', label: 'Decriminalized (all drugs)', score: 100 },
        { value: 'treatment_focus', label: 'Treatment-Focused (minimal penalties)', score: 80 },
        { value: 'moderate', label: 'Moderate Penalties (fines, probation)', score: 50 },
        { value: 'harsh', label: 'Harsh Penalties (jail time)', score: 25 },
        { value: 'extreme', label: 'Extreme Penalties (long prison)', score: 0 }
      ]
    }
  },
  {
    id: 'pf_06_abortion_access',
    categoryId: 'personal_freedom',
    name: 'Abortion Access',
    shortName: 'Abortion Access',
    description: 'Legal access to abortion services',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} abortion laws access legal status 2024',
      '{city} abortion restrictions weeks limit'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'unrestricted', label: 'Unrestricted (on request)', score: 100 },
        { value: 'broad_access', label: 'Broad Access (20+ weeks)', score: 85 },
        { value: 'moderate_access', label: 'Moderate Access (15-20 weeks)', score: 65 },
        { value: 'restricted', label: 'Restricted (6-15 weeks)', score: 35 },
        { value: 'banned', label: 'Banned/Near-Total Ban', score: 0 }
      ]
    }
  },
  {
    id: 'pf_07_lgbtq_rights',
    categoryId: 'personal_freedom',
    name: 'LGBTQ+ Legal Rights',
    shortName: 'LGBTQ+ Rights',
    description: 'Legal protections and rights for LGBTQ+ individuals',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} LGBTQ rights same-sex marriage legal',
      '{city} anti-discrimination laws sexual orientation gender identity'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Full Rights', description: 'Marriage, adoption, full protections', score: 100 },
        { level: 4, label: 'Strong Rights', description: 'Marriage, most protections', score: 80 },
        { level: 3, label: 'Moderate Rights', description: 'Civil unions, some protections', score: 60 },
        { level: 2, label: 'Limited Rights', description: 'No marriage, limited protections', score: 30 },
        { level: 1, label: 'No Rights/Criminalized', description: 'Criminalized or no protections', score: 0 }
      ]
    }
  },
  {
    id: 'pf_08_euthanasia_status',
    categoryId: 'personal_freedom',
    name: 'Assisted Dying/Euthanasia',
    shortName: 'Assisted Dying',
    description: 'Legal status of assisted dying or euthanasia',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {country} euthanasia assisted dying legal status',
      '{city} {state} death with dignity law'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'legal_broad', label: 'Legal (broad criteria)', score: 100 },
        { value: 'legal_terminal', label: 'Legal (terminal illness only)', score: 70 },
        { value: 'passive_only', label: 'Passive Euthanasia Only', score: 40 },
        { value: 'illegal', label: 'Illegal', score: 0 }
      ]
    }
  },
  {
    id: 'pf_09_smoking_regulations',
    categoryId: 'personal_freedom',
    name: 'Smoking Regulations',
    shortName: 'Smoking Laws',
    description: 'Restrictions on tobacco smoking in public and private spaces',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} smoking ban laws public places restrictions',
      '{city} tobacco regulations outdoor smoking'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Minimal Restrictions', description: 'Indoor/outdoor mostly allowed', score: 100 },
        { level: 4, label: 'Light Restrictions', description: 'Some indoor bans', score: 75 },
        { level: 3, label: 'Moderate Restrictions', description: 'Most indoor banned, outdoor ok', score: 50 },
        { level: 2, label: 'Heavy Restrictions', description: 'Extensive bans', score: 25 },
        { level: 1, label: 'Severe Restrictions', description: 'Near-total public ban', score: 10 }
      ]
    }
  },
  {
    id: 'pf_10_public_drinking',
    categoryId: 'personal_freedom',
    name: 'Public Drinking Laws',
    shortName: 'Public Drinking',
    description: 'Legality of consuming alcohol in public spaces',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} public drinking alcohol laws open container',
      '{city} drinking in public parks streets legal'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'legal', label: 'Legal (no restrictions)', score: 100 },
        { value: 'mostly_legal', label: 'Mostly Legal (some zones)', score: 75 },
        { value: 'restricted', label: 'Restricted (designated areas only)', score: 50 },
        { value: 'mostly_illegal', label: 'Mostly Illegal (few exceptions)', score: 25 },
        { value: 'illegal', label: 'Illegal (enforced)', score: 0 }
      ]
    }
  },
  {
    id: 'pf_11_helmet_laws',
    categoryId: 'personal_freedom',
    name: 'Motorcycle Helmet Laws',
    shortName: 'Helmet Laws',
    description: 'Mandatory helmet requirements for motorcyclists',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} motorcycle helmet law requirements',
      '{city} helmet mandatory motorcycle bicycle'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'no_law', label: 'No Requirement', score: 100 },
        { value: 'partial', label: 'Partial (age-based)', score: 60 },
        { value: 'mandatory', label: 'Mandatory', score: 30 }
      ]
    }
  },
  {
    id: 'pf_12_seatbelt_enforcement',
    categoryId: 'personal_freedom',
    name: 'Seatbelt Enforcement Level',
    shortName: 'Seatbelt Laws',
    description: 'Strictness of seatbelt law enforcement',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} seatbelt law enforcement primary secondary',
      '{city} seatbelt fine penalty'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'no_law', label: 'No Law', score: 100 },
        { value: 'secondary', label: 'Secondary Enforcement', score: 70 },
        { value: 'primary', label: 'Primary Enforcement', score: 40 }
      ]
    }
  },
  {
    id: 'pf_13_jaywalking',
    categoryId: 'personal_freedom',
    name: 'Jaywalking Enforcement',
    shortName: 'Jaywalking',
    description: 'Enforcement of pedestrian crossing laws',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} jaywalking laws enforcement fines',
      '{city} pedestrian crossing laws penalties'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'not_enforced', label: 'Not Enforced/No Law', score: 100 },
        { value: 'rarely_enforced', label: 'Rarely Enforced', score: 70 },
        { value: 'sometimes_enforced', label: 'Sometimes Enforced', score: 40 },
        { value: 'actively_enforced', label: 'Actively Enforced', score: 10 }
      ]
    }
  },
  {
    id: 'pf_14_curfew_laws',
    categoryId: 'personal_freedom',
    name: 'Adult Curfew Laws',
    shortName: 'Curfews',
    description: 'Existence of curfew restrictions for adults',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'boolean',
    searchQueries: [
      '{city} adult curfew laws restrictions',
      '{city} nighttime curfew regulations'
    ],
    scoringCriteria: {
      type: 'boolean'
    }
  },
  {
    id: 'pf_15_noise_ordinances',
    categoryId: 'personal_freedom',
    name: 'Noise Ordinance Strictness',
    shortName: 'Noise Laws',
    description: 'Strictness of noise regulations and quiet hours',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} noise ordinance quiet hours regulations',
      '{city} noise complaints enforcement hours'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Relaxed', description: 'Minimal enforcement', score: 100 },
        { level: 4, label: 'Relaxed', description: 'Late quiet hours', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard quiet hours', score: 60 },
        { level: 2, label: 'Strict', description: 'Early quiet hours', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Extensive restrictions', score: 20 }
      ]
    }
  }
];
