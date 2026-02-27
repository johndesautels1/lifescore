/**
 * LIFE SCORE™ - Business & Work Regulation Metrics (25 Metrics)
 * Category: business_work
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { MetricDefinition } from '../types/metrics';

export const BUSINESS_WORK_METRICS: MetricDefinition[] = [
  {
    id: 'bw_01_business_license',
    categoryId: 'business_work',
    name: 'Business License Requirements',
    shortName: 'Business License',
    description: 'Complexity of obtaining a general business license',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} business license requirements process',
      '{city} starting a business permits needed'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Online, same-day', score: 100 },
        { level: 4, label: 'Easy', description: 'Simple process', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard requirements', score: 60 },
        { level: 2, label: 'Difficult', description: 'Complex process', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Extensive bureaucracy', score: 20 }
      ]
    }
  },
  {
    id: 'bw_02_occupational_licensing',
    categoryId: 'business_work',
    name: 'Occupational Licensing Burden',
    shortName: 'Occupation License',
    description: 'Number of occupations requiring licenses',
    weight: 7,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} occupational licensing requirements',
      '{city} professional license requirements cosmetology contractor'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Light', description: 'Few occupations licensed', score: 100 },
        { level: 4, label: 'Light', description: 'Below average', score: 80 },
        { level: 3, label: 'Moderate', description: 'Average requirements', score: 60 },
        { level: 2, label: 'Heavy', description: 'Many licenses needed', score: 40 },
        { level: 1, label: 'Very Heavy', description: 'Extensive licensing', score: 20 }
      ]
    }
  },
  {
    id: 'bw_03_minimum_wage',
    categoryId: 'business_work',
    name: 'Minimum Wage Level',
    shortName: 'Min Wage',
    description: 'Local minimum wage relative to cost of living',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'numeric',
    unit: 'currency_per_hour',
    searchQueries: [
      '{city} {state} minimum wage current 2024 2025 2026',
      '{city} hourly minimum wage rate'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 7,
      maxValue: 25
    }
  },
  {
    id: 'bw_04_right_to_work',
    categoryId: 'business_work',
    name: 'Right-to-Work Laws',
    shortName: 'Right to Work',
    description: 'Laws prohibiting mandatory union membership',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'boolean',
    searchQueries: [
      '{city} {state} right to work law union',
      '{city} {state} union membership required employment'
    ],
    scoringCriteria: {
      type: 'boolean'
    }
  },
  {
    id: 'bw_05_at_will_employment',
    categoryId: 'business_work',
    name: 'Employment Termination Laws',
    shortName: 'Employment Laws',
    description: 'Balance between employer/employee termination rights',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} at will employment laws termination',
      '{city} {country} employee firing protections'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Balanced', description: 'Fair protections both sides', score: 100 },
        { level: 4, label: 'Slightly Pro-Employee', description: 'Good protections', score: 80 },
        { level: 3, label: 'Slightly Pro-Employer', description: 'Standard at-will', score: 60 },
        { level: 2, label: 'Very Pro-Employer', description: 'Easy termination', score: 40 },
        { level: 1, label: 'Very Pro-Employee', description: 'Hard to terminate', score: 40 }
      ]
    }
  },
  {
    id: 'bw_06_paid_leave_mandate',
    categoryId: 'business_work',
    name: 'Mandatory Paid Leave',
    shortName: 'Paid Leave',
    description: 'Required paid vacation/sick leave days',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'numeric',
    unit: 'days',
    searchQueries: [
      '{city} {state} mandatory paid leave vacation sick days',
      '{city} {country} statutory holiday leave requirements'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 30
    }
  },
  {
    id: 'bw_07_parental_leave',
    categoryId: 'business_work',
    name: 'Parental Leave Requirements',
    shortName: 'Parental Leave',
    description: 'Mandated parental/maternity leave',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'numeric',
    unit: 'weeks',
    searchQueries: [
      '{city} {state} parental leave maternity paternity law',
      '{city} {country} paid parental leave requirements'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 52
    }
  },
  {
    id: 'bw_08_non_compete',
    categoryId: 'business_work',
    name: 'Non-Compete Agreement Enforcement',
    shortName: 'Non-Compete',
    description: 'Enforceability of non-compete clauses',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} non-compete agreement enforceable law',
      '{city} non-compete clause restrictions'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'banned', label: 'Banned/Unenforceable', score: 100 },
        { value: 'limited', label: 'Limited Enforcement', score: 70 },
        { value: 'standard', label: 'Standard Enforcement', score: 40 },
        { value: 'strong', label: 'Strongly Enforced', score: 10 }
      ]
    }
  },
  {
    id: 'bw_09_corporate_tax',
    categoryId: 'business_work',
    name: 'Corporate Tax Rate',
    shortName: 'Corp Tax',
    description: 'Effective corporate tax rate',
    weight: 5,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} {state} corporate tax rate business',
      '{city} {country} company tax rate'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 35
    }
  },
  {
    id: 'bw_10_income_tax',
    categoryId: 'business_work',
    name: 'Personal Income Tax Rate',
    shortName: 'Income Tax',
    description: 'Top marginal personal income tax rate',
    weight: 6,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} {state} income tax rate top marginal',
      '{city} {country} personal income tax rates'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 50
    }
  },
  {
    id: 'bw_11_sales_tax',
    categoryId: 'business_work',
    name: 'Sales Tax Rate',
    shortName: 'Sales Tax',
    description: 'Combined state/local sales tax rate',
    weight: 4,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} {state} sales tax rate combined',
      '{city} {country} VAT sales tax rate'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 25
    }
  },
  {
    id: 'bw_12_freelance_regs',
    categoryId: 'business_work',
    name: 'Freelance/Gig Worker Regulations',
    shortName: 'Gig Work Laws',
    description: 'Regulations affecting freelance and gig economy workers',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} gig worker freelance independent contractor law',
      '{city} AB5 freelance worker classification'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Flexible', description: 'Easy to work freelance', score: 100 },
        { level: 4, label: 'Flexible', description: 'Supportive environment', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard regulations', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Classification hurdles', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Strict AB5-style laws', score: 20 }
      ]
    }
  },
  {
    id: 'bw_13_work_visa',
    categoryId: 'business_work',
    name: 'Work Visa/Permit Access',
    shortName: 'Work Visa',
    description: 'Ease of obtaining work authorization for foreigners',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} work visa permit requirements foreigners',
      '{city} work authorization process immigrants'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Open work permits', score: 100 },
        { level: 4, label: 'Easy', description: 'Accessible programs', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard process', score: 60 },
        { level: 2, label: 'Difficult', description: 'Complex requirements', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Highly restricted', score: 20 }
      ]
    }
  },
  {
    id: 'bw_14_remote_work',
    categoryId: 'business_work',
    name: 'Remote Work Regulations',
    shortName: 'Remote Work',
    description: 'Legal framework supporting remote work',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {country} remote work laws regulations telecommuting',
      '{city} work from home legal requirements employer'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Supportive', description: 'Right to request remote', score: 100 },
        { level: 4, label: 'Supportive', description: 'Favorable laws', score: 80 },
        { level: 3, label: 'Neutral', description: 'No specific laws', score: 60 },
        { level: 2, label: 'Unsupportive', description: 'Barriers exist', score: 40 },
        { level: 1, label: 'Restrictive', description: 'Limits on remote work', score: 20 }
      ]
    }
  },
  {
    id: 'bw_15_overtime_rules',
    categoryId: 'business_work',
    name: 'Overtime Regulations',
    shortName: 'Overtime Rules',
    description: 'Overtime pay requirements and exemptions',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} overtime pay requirements law',
      '{city} {country} overtime regulations working hours'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Strong Protections', description: 'Strict overtime pay', score: 100 },
        { level: 4, label: 'Good Protections', description: 'Solid requirements', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard rules', score: 60 },
        { level: 2, label: 'Weak Protections', description: 'Many exemptions', score: 40 },
        { level: 1, label: 'Minimal', description: 'Few requirements', score: 20 }
      ]
    }
  },
  {
    id: 'bw_16_union_rights',
    categoryId: 'business_work',
    name: 'Union Formation Rights',
    shortName: 'Union Rights',
    description: 'Legal protections for forming unions',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} union formation rights laws',
      '{city} {country} collective bargaining worker rights'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Strong', description: 'Full union rights', score: 100 },
        { level: 4, label: 'Strong', description: 'Good protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard rights', score: 60 },
        { level: 2, label: 'Weak', description: 'Limited protections', score: 40 },
        { level: 1, label: 'Very Weak', description: 'Union-hostile', score: 20 }
      ]
    }
  },
  {
    id: 'bw_17_workplace_safety',
    categoryId: 'business_work',
    name: 'Workplace Safety Standards',
    shortName: 'Safety Standards',
    description: 'Occupational health and safety requirements',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} workplace safety OSHA standards',
      '{city} {country} occupational health safety regulations'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Rigorous standards', score: 100 },
        { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
        { level: 3, label: 'Adequate', description: 'Standard compliance', score: 60 },
        { level: 2, label: 'Weak', description: 'Limited enforcement', score: 40 },
        { level: 1, label: 'Poor', description: 'Minimal standards', score: 20 }
      ]
    }
  },
  {
    id: 'bw_18_discrimination_law',
    categoryId: 'business_work',
    name: 'Employment Discrimination Protections',
    shortName: 'Anti-Discrimination',
    description: 'Legal protections against workplace discrimination',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} employment discrimination law protections',
      '{city} workplace discrimination race gender age disability'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Comprehensive', description: 'Full protected classes', score: 100 },
        { level: 4, label: 'Strong', description: 'Broad protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
        { level: 2, label: 'Limited', description: 'Basic protections only', score: 40 },
        { level: 1, label: 'Minimal', description: 'Few protections', score: 20 }
      ]
    }
  },
  {
    id: 'bw_19_startup_ease',
    categoryId: 'business_work',
    name: 'Startup Formation Ease',
    shortName: 'Startup Ease',
    description: 'Ease of registering a new business entity',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} starting business LLC formation process',
      '{city} {country} company registration time cost'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Online, 1-2 days', score: 100 },
        { level: 4, label: 'Easy', description: 'Simple process', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard bureaucracy', score: 60 },
        { level: 2, label: 'Difficult', description: 'Complex process', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Extensive requirements', score: 20 }
      ]
    }
  },
  {
    id: 'bw_20_food_truck',
    categoryId: 'business_work',
    name: 'Food Truck/Street Vendor Regulations',
    shortName: 'Food Trucks',
    description: 'Regulations for mobile food vendors',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} food truck permit regulations requirements',
      '{city} street vendor license mobile food'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Simple permits, few zones', score: 100 },
        { level: 4, label: 'Easy', description: 'Accessible licensing', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard requirements', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Many restrictions', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Near impossible', score: 20 }
      ]
    }
  },
  {
    id: 'bw_21_contractor_license',
    categoryId: 'business_work',
    name: 'Contractor Licensing Requirements',
    shortName: 'Contractor License',
    description: 'Requirements for home improvement contractors',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} contractor license requirements handyman',
      '{city} home improvement contractor permit'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Minimal', description: 'Low thresholds', score: 100 },
        { level: 4, label: 'Light', description: 'Easy licensing', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard requirements', score: 60 },
        { level: 2, label: 'Strict', description: 'Extensive requirements', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Heavy burden', score: 20 }
      ]
    }
  },
  {
    id: 'bw_22_health_insurance',
    categoryId: 'business_work',
    name: 'Employer Health Insurance Mandate',
    shortName: 'Health Mandate',
    description: 'Requirements for employer-provided health insurance',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} employer health insurance mandate requirements',
      '{city} {country} universal healthcare employer obligations'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'universal', label: 'Universal Healthcare', score: 100 },
        { value: 'strong_mandate', label: 'Strong Employer Mandate', score: 80 },
        { value: 'aca_style', label: 'ACA-Style Requirements', score: 60 },
        { value: 'minimal', label: 'Minimal Requirements', score: 40 },
        { value: 'none', label: 'No Requirements', score: 20 }
      ]
    }
  },
  {
    id: 'bw_23_tip_credit',
    categoryId: 'business_work',
    name: 'Tipped Worker Wage Laws',
    shortName: 'Tip Credit',
    description: 'Whether tip credit reduces minimum wage',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} tipped minimum wage tip credit',
      '{city} server minimum wage restaurant'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'full_wage', label: 'Full Minimum Wage + Tips', score: 100 },
        { value: 'high_base', label: 'High Base Wage', score: 70 },
        { value: 'standard_credit', label: 'Standard Tip Credit', score: 40 },
        { value: 'large_credit', label: 'Large Tip Credit Allowed', score: 20 }
      ]
    }
  },
  {
    id: 'bw_24_banking_access',
    categoryId: 'business_work',
    name: 'Business Banking Access',
    shortName: 'Banking Access',
    description: 'Ease of opening business bank accounts',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} business bank account opening requirements',
      '{city} {country} corporate banking access foreigners'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Online, minimal docs', score: 100 },
        { level: 4, label: 'Easy', description: 'Standard process', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some requirements', score: 60 },
        { level: 2, label: 'Difficult', description: 'Extensive documentation', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Major barriers', score: 20 }
      ]
    }
  },
  {
    id: 'bw_25_crypto_regulation',
    categoryId: 'business_work',
    name: 'Cryptocurrency Regulations',
    shortName: 'Crypto Laws',
    description: 'Legal status and regulations for cryptocurrency',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} cryptocurrency regulation legal status',
      '{city} {country} bitcoin crypto laws business'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Favorable', description: 'Crypto-friendly laws', score: 100 },
        { level: 4, label: 'Favorable', description: 'Supportive environment', score: 80 },
        { level: 3, label: 'Neutral', description: 'Standard regulations', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Burdensome rules', score: 40 },
        { level: 1, label: 'Hostile', description: 'Bans or severe limits', score: 20 }
      ]
    }
  }
];
