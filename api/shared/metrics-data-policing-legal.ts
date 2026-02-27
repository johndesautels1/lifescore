/**
 * LIFE SCORE™ - POLICING LEGAL Metrics
 * Clues Intelligence LTD © 2025
 */

import type { MetricDefinition } from './types.js';

export const POLICING_LEGAL_METRICS: MetricDefinition[] = [
  {
    id: 'pl_01_incarceration_rate',
    categoryId: 'policing_legal',
    name: 'Incarceration Rate',
    shortName: 'Incarceration',
    description: 'Prison population per 100,000 residents',
    weight: 8,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'per_100k',
    searchQueries: [
      '{city} {state} incarceration rate prison population',
      '{city} {country} imprisonment rate per capita'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 50,
      maxValue: 800
    }
  },
  {
    id: 'pl_02_police_per_capita',
    categoryId: 'policing_legal',
    name: 'Police Officers Per Capita',
    shortName: 'Police Density',
    description: 'Number of police officers per 1,000 residents',
    weight: 5,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'per_1k',
    searchQueries: [
      '{city} police officers per capita ratio',
      '{city} police department size staffing'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 1,
      maxValue: 5
    }
  },
  {
    id: 'pl_03_civil_forfeiture',
    categoryId: 'policing_legal',
    name: 'Civil Asset Forfeiture Laws',
    shortName: 'Asset Forfeiture',
    description: 'Protections against civil asset forfeiture',
    weight: 7,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} civil asset forfeiture laws protections',
      '{city} police property seizure without conviction'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'abolished', label: 'Abolished/Very Strong Protections', score: 100 },
        { value: 'strong', label: 'Strong Protections', score: 80 },
        { value: 'moderate', label: 'Moderate Protections', score: 60 },
        { value: 'weak', label: 'Weak Protections', score: 40 },
        { value: 'none', label: 'No Protections', score: 20 }
      ]
    }
  },
  {
    id: 'pl_04_mandatory_minimum',
    categoryId: 'policing_legal',
    name: 'Mandatory Minimum Sentences',
    shortName: 'Mandatory Mins',
    description: 'Extent of mandatory minimum sentencing laws',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} mandatory minimum sentencing laws',
      '{city} {country} sentencing guidelines discretion'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'none', label: 'No Mandatory Minimums', score: 100 },
        { value: 'limited', label: 'Limited Use', score: 80 },
        { value: 'moderate', label: 'Moderate Use', score: 60 },
        { value: 'extensive', label: 'Extensive Use', score: 40 },
        { value: 'pervasive', label: 'Pervasive', score: 20 }
      ]
    }
  },
  {
    id: 'pl_05_bail_system',
    categoryId: 'policing_legal',
    name: 'Bail/Pretrial System',
    shortName: 'Bail System',
    description: 'Fairness of bail and pretrial detention',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} bail reform cash bail system',
      '{city} pretrial detention release policies'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'no_cash_bail', label: 'No Cash Bail', score: 100 },
        { value: 'reformed', label: 'Reformed System', score: 80 },
        { value: 'moderate', label: 'Standard System', score: 60 },
        { value: 'cash_based', label: 'Cash-Based', score: 40 },
        { value: 'harsh', label: 'Harsh Detention', score: 20 }
      ]
    }
  },
  {
    id: 'pl_06_police_accountability',
    categoryId: 'policing_legal',
    name: 'Police Accountability',
    shortName: 'Police Oversight',
    description: 'Mechanisms for police oversight and accountability',
    weight: 7,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} police accountability oversight board',
      '{city} police misconduct complaint process'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Strong civilian oversight', score: 100 },
        { level: 4, label: 'Good', description: 'Solid mechanisms', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some oversight', score: 60 },
        { level: 2, label: 'Weak', description: 'Limited accountability', score: 40 },
        { level: 1, label: 'Very Weak', description: 'No effective oversight', score: 20 }
      ]
    }
  },
  {
    id: 'pl_07_qualified_immunity',
    categoryId: 'policing_legal',
    name: 'Qualified Immunity Status',
    shortName: 'Qualified Immunity',
    description: 'Legal protections for suing police officers',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} qualified immunity police lawsuits',
      '{city} {country} sue police officer rights'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'abolished', label: 'Abolished/Not Applicable', score: 100 },
        { value: 'limited', label: 'Limited Immunity', score: 70 },
        { value: 'standard', label: 'Standard Qualified Immunity', score: 40 },
        { value: 'broad', label: 'Broad Protections', score: 20 }
      ]
    }
  },
  {
    id: 'pl_08_legal_costs',
    categoryId: 'policing_legal',
    name: 'Legal System Costs',
    shortName: 'Legal Costs',
    description: 'Cost of accessing the legal system',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} lawyer attorney costs fees',
      '{city} {country} legal aid access justice affordable'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Affordable', description: 'Free/subsidized legal aid', score: 100 },
        { level: 4, label: 'Affordable', description: 'Reasonable costs', score: 80 },
        { level: 3, label: 'Moderate', description: 'Average costs', score: 60 },
        { level: 2, label: 'Expensive', description: 'High legal costs', score: 40 },
        { level: 1, label: 'Very Expensive', description: 'Prohibitive costs', score: 20 }
      ]
    }
  },
  {
    id: 'pl_09_court_efficiency',
    categoryId: 'policing_legal',
    name: 'Court System Efficiency',
    shortName: 'Court Efficiency',
    description: 'Speed and efficiency of court proceedings',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} court case backlog wait times',
      '{city} {country} judicial efficiency court delays'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Efficient', description: 'Fast resolution', score: 100 },
        { level: 4, label: 'Efficient', description: 'Reasonable timelines', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some delays', score: 60 },
        { level: 2, label: 'Slow', description: 'Significant backlogs', score: 40 },
        { level: 1, label: 'Very Slow', description: 'Severe delays', score: 20 }
      ]
    }
  },
  {
    id: 'pl_10_jury_trial',
    categoryId: 'policing_legal',
    name: 'Right to Jury Trial',
    shortName: 'Jury Rights',
    description: 'Access to trial by jury',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {country} right to jury trial access',
      '{city} jury trial availability criminal civil'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'full_right', label: 'Full Jury Rights', score: 100 },
        { value: 'broad', label: 'Broad Access', score: 80 },
        { value: 'limited', label: 'Limited Access', score: 60 },
        { value: 'rare', label: 'Rare/Restricted', score: 40 },
        { value: 'none', label: 'No Jury System', score: 30 }
      ]
    }
  },
  {
    id: 'pl_11_surveillance',
    categoryId: 'policing_legal',
    name: 'Government Surveillance Level',
    shortName: 'Surveillance',
    description: 'Extent of government surveillance and CCTV',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} CCTV surveillance cameras per capita',
      '{city} government surveillance privacy'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Minimal', description: 'Strong privacy protections', score: 100 },
        { level: 4, label: 'Low', description: 'Limited surveillance', score: 80 },
        { level: 3, label: 'Moderate', description: 'Average monitoring', score: 60 },
        { level: 2, label: 'High', description: 'Extensive surveillance', score: 40 },
        { level: 1, label: 'Very High', description: 'Pervasive monitoring', score: 20 }
      ]
    }
  },
  {
    id: 'pl_12_search_seizure',
    categoryId: 'policing_legal',
    name: 'Search & Seizure Protections',
    shortName: 'Search Protections',
    description: 'Legal protections against unreasonable searches',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} search and seizure laws warrant requirements',
      '{city} {country} privacy rights police search'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Strong', description: 'Strict warrant requirements', score: 100 },
        { level: 4, label: 'Strong', description: 'Good protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
        { level: 2, label: 'Weak', description: 'Easy to search', score: 40 },
        { level: 1, label: 'Very Weak', description: 'Minimal protections', score: 20 }
      ]
    }
  },
  {
    id: 'pl_13_death_penalty',
    categoryId: 'policing_legal',
    name: 'Death Penalty Status',
    shortName: 'Death Penalty',
    description: 'Legal status of capital punishment',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} death penalty capital punishment status',
      '{city} {country} death penalty abolished executions'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'abolished', label: 'Abolished', score: 100 },
        { value: 'moratorium', label: 'Moratorium', score: 80 },
        { value: 'rare', label: 'Legal but Rarely Used', score: 50 },
        { value: 'active', label: 'Actively Used', score: 20 }
      ]
    }
  },
  {
    id: 'pl_14_prison_conditions',
    categoryId: 'policing_legal',
    name: 'Prison Conditions',
    shortName: 'Prison Standards',
    description: 'Quality and humaneness of prison conditions',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} prison conditions quality',
      '{city} {country} prison standards rehabilitation'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Rehabilitation-focused', score: 100 },
        { level: 4, label: 'Good', description: 'Humane conditions', score: 80 },
        { level: 3, label: 'Adequate', description: 'Standard conditions', score: 60 },
        { level: 2, label: 'Poor', description: 'Below standard', score: 40 },
        { level: 1, label: 'Very Poor', description: 'Inhumane conditions', score: 20 }
      ]
    }
  },
  {
    id: 'pl_15_record_expungement',
    categoryId: 'policing_legal',
    name: 'Criminal Record Expungement',
    shortName: 'Expungement',
    description: 'Ability to expunge or seal criminal records',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} criminal record expungement sealing',
      '{city} {country} criminal record clearing rehabilitation'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Accessible', description: 'Easy expungement', score: 100 },
        { level: 4, label: 'Accessible', description: 'Good options', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some options', score: 60 },
        { level: 2, label: 'Limited', description: 'Difficult process', score: 40 },
        { level: 1, label: 'Very Limited', description: 'Near impossible', score: 20 }
      ]
    }
  }
];
