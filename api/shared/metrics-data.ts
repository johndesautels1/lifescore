/**
 * LIFE SCORE™ - Legal Independence & Freedom Evaluation
 * Complete 100 Metric Definitions
 * 
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 * 
 * IMPORTANT: These metrics are carefully designed to measure LEGAL FREEDOM
 * Each metric has specific search queries for verification via Claude API + Web Search
 */

import type { Category, CategoryId, MetricDefinition } from './types.js';

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const CATEGORIES: Category[] = [
  {
    id: 'personal_freedom',
    name: 'Personal Autonomy',
    shortName: 'Personal Autonomy',
    description: 'Laws governing personal choices, bodily autonomy, and individual liberty',
    metricCount: 15,
    weight: 20,
    icon: '🗽'
  },
  {
    id: 'housing_property',
    name: 'Housing, Property & HOA Control',
    shortName: 'Housing & Property',
    description: 'Property rights, ownership restrictions, HOA regulations, and housing freedom',
    metricCount: 20,
    weight: 20,
    icon: '🏠'
  },
  {
    id: 'business_work',
    name: 'Business & Work Regulation',
    shortName: 'Business & Work',
    description: 'Employment laws, licensing requirements, business regulations, and economic freedom',
    metricCount: 25,
    weight: 20,
    icon: '💼'
  },
  {
    id: 'transportation',
    name: 'Transportation & Daily Movement',
    shortName: 'Transportation',
    description: 'Mobility freedom, car dependency, public transit, and movement restrictions',
    metricCount: 15,
    weight: 15,
    icon: '🚇'
  },
  {
    id: 'policing_legal',
    name: 'Policing, Courts & Enforcement',
    shortName: 'Legal System',
    description: 'Law enforcement practices, incarceration rates, legal costs, and justice system',
    metricCount: 15,
    weight: 15,
    icon: '⚖️'
  },
  {
    id: 'speech_lifestyle',
    name: 'Speech, Lifestyle & Culture',
    shortName: 'Speech & Lifestyle',
    description: 'Free expression, cultural norms, privacy rights, and lifestyle autonomy',
    metricCount: 10,
    weight: 10,
    icon: '🎭'
  }
];

export const CATEGORIES_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.id]: cat }),
  {} as Record<CategoryId, Category>
);

// ============================================================================
// PERSONAL FREEDOM & MORALITY (15 Metrics)
// ============================================================================

const PERSONAL_FREEDOM_METRICS: MetricDefinition[] = [
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

// ============================================================================
// HOUSING, PROPERTY & HOA CONTROL (20 Metrics)
// ============================================================================

const HOUSING_PROPERTY_METRICS: MetricDefinition[] = [
  {
    id: 'hp_01_hoa_prevalence',
    categoryId: 'housing_property',
    name: 'HOA Prevalence',
    shortName: 'HOA Prevalence',
    description: 'Percentage of housing under HOA governance',
    weight: 8,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} HOA homeowners association percentage housing',
      '{city} HOA community prevalence statistics'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 80
    }
  },
  {
    id: 'hp_02_hoa_power',
    categoryId: 'housing_property',
    name: 'HOA Legal Powers',
    shortName: 'HOA Power',
    description: 'Legal authority granted to HOAs (liens, fines, foreclosure)',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} HOA foreclosure power liens fines',
      '{city} {state} HOA legal authority limits'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Limited', description: 'No foreclosure, limited fines', score: 100 },
        { level: 4, label: 'Limited', description: 'Restricted powers, oversight', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard powers', score: 60 },
        { level: 2, label: 'Strong', description: 'Can lien and foreclose', score: 40 },
        { level: 1, label: 'Very Strong', description: 'Extensive unchecked powers', score: 20 }
      ]
    }
  },
  {
    id: 'hp_03_property_tax_rate',
    categoryId: 'housing_property',
    name: 'Property Tax Rate',
    shortName: 'Property Tax',
    description: 'Effective property tax rate as percentage of value',
    weight: 7,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} property tax rate effective percentage',
      '{city} {county} property tax millage rate'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 3
    }
  },
  {
    id: 'hp_04_rent_control',
    categoryId: 'housing_property',
    name: 'Rent Control Laws',
    shortName: 'Rent Control',
    description: 'Existence and extent of rent control/stabilization',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} rent control stabilization laws',
      '{city} {state} rent increase limits regulations'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'strong', label: 'Strong Rent Control', score: 100 },
        { value: 'moderate', label: 'Moderate Stabilization', score: 75 },
        { value: 'limited', label: 'Limited Controls', score: 50 },
        { value: 'none', label: 'No Rent Control', score: 25 }
      ]
    }
  },
  {
    id: 'hp_05_eviction_protection',
    categoryId: 'housing_property',
    name: 'Tenant Eviction Protections',
    shortName: 'Eviction Protection',
    description: 'Legal protections for tenants against eviction',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} tenant eviction protection laws rights',
      '{city} {state} eviction process timeline requirements'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Strong', description: '60+ day notice, just cause required', score: 100 },
        { level: 4, label: 'Strong', description: '30-60 day notice, protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
        { level: 2, label: 'Weak', description: 'Minimal protections', score: 40 },
        { level: 1, label: 'Very Weak', description: 'Quick eviction allowed', score: 20 }
      ]
    }
  },
  {
    id: 'hp_06_zoning_strictness',
    categoryId: 'housing_property',
    name: 'Zoning Restrictions',
    shortName: 'Zoning',
    description: 'Strictness of land use zoning regulations',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} zoning laws land use restrictions',
      '{city} single family zoning mixed use allowed'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Flexible', description: 'Mixed-use, minimal restrictions', score: 100 },
        { level: 4, label: 'Flexible', description: 'Liberal zoning', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard zoning', score: 60 },
        { level: 2, label: 'Strict', description: 'Heavy restrictions', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Rigid single-use zoning', score: 20 }
      ]
    }
  },
  {
    id: 'hp_07_building_permits',
    categoryId: 'housing_property',
    name: 'Building Permit Requirements',
    shortName: 'Permits',
    description: 'Complexity and requirements for home improvement permits',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} building permit requirements residential',
      '{city} home improvement permit process time cost'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Minimal permits needed', score: 100 },
        { level: 4, label: 'Easy', description: 'Simple process', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard requirements', score: 60 },
        { level: 2, label: 'Difficult', description: 'Complex process', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Extensive bureaucracy', score: 20 }
      ]
    }
  },
  {
    id: 'hp_08_short_term_rental',
    categoryId: 'housing_property',
    name: 'Short-Term Rental (Airbnb) Laws',
    shortName: 'STR/Airbnb',
    description: 'Restrictions on short-term vacation rentals',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} Airbnb short term rental laws regulations',
      '{city} vacation rental restrictions VRBO'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'unrestricted', label: 'Unrestricted', score: 100 },
        { value: 'light_regulation', label: 'Light Regulation', score: 80 },
        { value: 'moderate_regulation', label: 'Moderate Regulation', score: 60 },
        { value: 'heavy_regulation', label: 'Heavy Regulation', score: 40 },
        { value: 'banned', label: 'Banned/Near-Banned', score: 10 }
      ]
    }
  },
  {
    id: 'hp_09_adu_laws',
    categoryId: 'housing_property',
    name: 'ADU (Accessory Dwelling) Laws',
    shortName: 'ADU Laws',
    description: 'Ability to build accessory dwelling units (granny flats)',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} ADU accessory dwelling unit laws allowed',
      '{city} granny flat in-law suite regulations'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'allowed_easy', label: 'Allowed (easy approval)', score: 100 },
        { value: 'allowed_moderate', label: 'Allowed (moderate process)', score: 75 },
        { value: 'restricted', label: 'Restricted/Limited', score: 50 },
        { value: 'difficult', label: 'Very Difficult', score: 25 },
        { value: 'prohibited', label: 'Prohibited', score: 0 }
      ]
    }
  },
  {
    id: 'hp_10_home_business',
    categoryId: 'housing_property',
    name: 'Home Business Regulations',
    shortName: 'Home Business',
    description: 'Restrictions on operating businesses from home',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} home based business regulations zoning',
      '{city} work from home business license requirements'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Permissive', description: 'Minimal restrictions', score: 100 },
        { level: 4, label: 'Permissive', description: 'Easy to operate', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard requirements', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Many limitations', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Heavy restrictions', score: 20 }
      ]
    }
  },
  {
    id: 'hp_11_eminent_domain',
    categoryId: 'housing_property',
    name: 'Eminent Domain Protections',
    shortName: 'Eminent Domain',
    description: 'Protections against government property seizure',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} eminent domain laws property seizure',
      '{city} government property condemnation protections'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Strong', description: 'Strict limits on use', score: 100 },
        { level: 4, label: 'Strong', description: 'Good protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
        { level: 2, label: 'Weak', description: 'Broad government power', score: 40 },
        { level: 1, label: 'Very Weak', description: 'Easy seizure allowed', score: 20 }
      ]
    }
  },
  {
    id: 'hp_12_squatter_rights',
    categoryId: 'housing_property',
    name: 'Adverse Possession/Squatter Laws',
    shortName: 'Squatter Rights',
    description: 'Protection of property owners against squatters',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} squatter rights adverse possession years',
      '{city} squatter removal property owner rights'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'owner_favored', label: 'Owner Highly Protected', score: 100 },
        { value: 'balanced', label: 'Balanced', score: 60 },
        { value: 'squatter_favored', label: 'Squatter Favored', score: 20 }
      ]
    }
  },
  {
    id: 'hp_13_historic_preservation',
    categoryId: 'housing_property',
    name: 'Historic Preservation Restrictions',
    shortName: 'Historic Rules',
    description: 'Restrictions on modifying historic properties',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} historic preservation restrictions modifications',
      '{city} historic district regulations renovation'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Minimal', description: 'Few restrictions', score: 100 },
        { level: 4, label: 'Light', description: 'Light oversight', score: 80 },
        { level: 3, label: 'Moderate', description: 'Reasonable restrictions', score: 60 },
        { level: 2, label: 'Heavy', description: 'Significant limits', score: 40 },
        { level: 1, label: 'Very Heavy', description: 'Extensive restrictions', score: 20 }
      ]
    }
  },
  {
    id: 'hp_14_foreign_ownership',
    categoryId: 'housing_property',
    name: 'Foreign Property Ownership',
    shortName: 'Foreign Ownership',
    description: 'Rights of foreigners to own property',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {country} foreign property ownership laws restrictions',
      '{city} non-resident property purchase rules'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'unrestricted', label: 'Unrestricted', score: 100 },
        { value: 'mostly_allowed', label: 'Mostly Allowed', score: 80 },
        { value: 'restricted', label: 'Some Restrictions', score: 50 },
        { value: 'heavily_restricted', label: 'Heavily Restricted', score: 25 },
        { value: 'prohibited', label: 'Prohibited/Very Limited', score: 0 }
      ]
    }
  },
  {
    id: 'hp_15_transfer_taxes',
    categoryId: 'housing_property',
    name: 'Property Transfer Taxes',
    shortName: 'Transfer Tax',
    description: 'Taxes paid when buying/selling property',
    weight: 4,
    scoringDirection: 'lower_is_better',
    dataType: 'numeric',
    unit: 'percent',
    searchQueries: [
      '{city} {state} property transfer tax deed stamp tax',
      '{city} real estate closing costs transfer fees'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 5
    }
  },
  {
    id: 'hp_16_lawn_regulations',
    categoryId: 'housing_property',
    name: 'Lawn & Landscaping Regulations',
    shortName: 'Lawn Rules',
    description: 'Municipal/HOA rules on lawn appearance and landscaping',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} lawn maintenance requirements grass height',
      '{city} xeriscaping native plants allowed lawn'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Flexible', description: 'Any landscaping allowed', score: 100 },
        { level: 4, label: 'Flexible', description: 'Native plants encouraged', score: 80 },
        { level: 3, label: 'Moderate', description: 'Basic standards', score: 60 },
        { level: 2, label: 'Strict', description: 'Grass required', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Detailed requirements', score: 20 }
      ]
    }
  },
  {
    id: 'hp_17_exterior_colors',
    categoryId: 'housing_property',
    name: 'Exterior Appearance Rules',
    shortName: 'Exterior Rules',
    description: 'Rules on home exterior colors and appearance',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} HOA house color exterior rules',
      '{city} home exterior appearance regulations'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'No Rules', description: 'Any colors/style allowed', score: 100 },
        { level: 4, label: 'Minimal', description: 'Basic guidelines only', score: 80 },
        { level: 3, label: 'Moderate', description: 'Approval process', score: 60 },
        { level: 2, label: 'Strict', description: 'Limited palette', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Rigid requirements', score: 20 }
      ]
    }
  },
  {
    id: 'hp_18_fence_rules',
    categoryId: 'housing_property',
    name: 'Fence & Wall Regulations',
    shortName: 'Fence Rules',
    description: 'Restrictions on fences, walls, and privacy barriers',
    weight: 3,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} fence height restrictions regulations',
      '{city} privacy fence rules requirements permit'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Permissive', description: 'No height/style limits', score: 100 },
        { level: 4, label: 'Permissive', description: 'High limits allowed', score: 80 },
        { level: 3, label: 'Moderate', description: '6ft typical limit', score: 60 },
        { level: 2, label: 'Restrictive', description: '4ft limits, style rules', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Minimal fencing allowed', score: 20 }
      ]
    }
  },
  {
    id: 'hp_19_vehicle_parking',
    categoryId: 'housing_property',
    name: 'Residential Vehicle Parking Rules',
    shortName: 'Parking Rules',
    description: 'Restrictions on parking vehicles on your own property',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} residential vehicle parking regulations driveway',
      '{city} RV boat commercial vehicle parking home'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Permissive', description: 'Park anything anywhere', score: 100 },
        { level: 4, label: 'Permissive', description: 'Few restrictions', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard rules', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Many vehicle limits', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Garage-only, strict rules', score: 20 }
      ]
    }
  },
  {
    id: 'hp_20_pet_restrictions',
    categoryId: 'housing_property',
    name: 'Pet Ownership Restrictions',
    shortName: 'Pet Rules',
    description: 'Housing-related restrictions on pet ownership',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} pet restrictions HOA breed bans housing',
      '{city} dangerous dog breed ban pit bull'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Permissive', description: 'No breed/number limits', score: 100 },
        { level: 4, label: 'Permissive', description: 'Minimal limits', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some breed/size limits', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Many restrictions', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Strict breed bans', score: 20 }
      ]
    }
  }
];

// ============================================================================
// BUSINESS & WORK REGULATION (25 Metrics)
// ============================================================================

const BUSINESS_WORK_METRICS: MetricDefinition[] = [
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

// ============================================================================
// TRANSPORTATION & DAILY MOVEMENT (15 Metrics)
// ============================================================================

const TRANSPORTATION_METRICS: MetricDefinition[] = [
  {
    id: 'tr_01_public_transit_quality',
    categoryId: 'transportation',
    name: 'Public Transit Quality',
    shortName: 'Transit Quality',
    description: 'Quality and coverage of public transportation',
    weight: 9,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} public transportation quality rating',
      '{city} transit score public transport coverage'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'World-class transit', score: 100 },
        { level: 4, label: 'Good', description: 'Comprehensive system', score: 80 },
        { level: 3, label: 'Adequate', description: 'Basic coverage', score: 60 },
        { level: 2, label: 'Poor', description: 'Limited service', score: 40 },
        { level: 1, label: 'Very Poor', description: 'Minimal/none', score: 20 }
      ]
    }
  },
  {
    id: 'tr_02_walkability',
    categoryId: 'transportation',
    name: 'Walkability Score',
    shortName: 'Walkability',
    description: 'Overall walkability for daily errands',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'numeric',
    unit: 'score',
    searchQueries: [
      '{city} walk score walkability rating',
      '{city} walkable neighborhoods pedestrian friendly'
    ],
    scoringCriteria: {
      type: 'range',
      minValue: 0,
      maxValue: 100
    }
  },
  {
    id: 'tr_03_bike_infrastructure',
    categoryId: 'transportation',
    name: 'Bicycle Infrastructure',
    shortName: 'Bike Infra',
    description: 'Quality of bike lanes and cycling infrastructure',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} bike lanes cycling infrastructure',
      '{city} bicycle friendly city rating'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Protected lanes, bike-share', score: 100 },
        { level: 4, label: 'Good', description: 'Good network', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some infrastructure', score: 60 },
        { level: 2, label: 'Poor', description: 'Limited lanes', score: 40 },
        { level: 1, label: 'Very Poor', description: 'Dangerous for cycling', score: 20 }
      ]
    }
  },
  {
    id: 'tr_04_car_dependency',
    categoryId: 'transportation',
    name: 'Car Dependency Level',
    shortName: 'Car Dependency',
    description: 'Necessity of owning a car for daily life',
    weight: 8,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} car dependency needed live without car',
      '{city} car-free lifestyle possible'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Car Optional', description: 'Easy car-free life', score: 100 },
        { level: 4, label: 'Low Dependency', description: 'Car helpful not needed', score: 80 },
        { level: 3, label: 'Moderate', description: 'Car often needed', score: 60 },
        { level: 2, label: 'High Dependency', description: 'Car usually required', score: 40 },
        { level: 1, label: 'Car Essential', description: 'Impossible without car', score: 20 }
      ]
    }
  },
  {
    id: 'tr_05_rideshare_legal',
    categoryId: 'transportation',
    name: 'Rideshare Legality',
    shortName: 'Rideshare',
    description: 'Legal status and availability of rideshare services',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} Uber Lyft legal available',
      '{city} rideshare regulations taxi'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'fully_legal', label: 'Fully Legal & Available', score: 100 },
        { value: 'regulated', label: 'Legal with Regulations', score: 80 },
        { value: 'restricted', label: 'Restricted', score: 50 },
        { value: 'limited', label: 'Very Limited', score: 30 },
        { value: 'banned', label: 'Banned/Unavailable', score: 0 }
      ]
    }
  },
  {
    id: 'tr_06_speed_limits',
    categoryId: 'transportation',
    name: 'Speed Limit Reasonableness',
    shortName: 'Speed Limits',
    description: 'Reasonableness of posted speed limits',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} speed limits roads highways',
      '{city} {state} speed limit laws enforcement'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Reasonable', description: 'Appropriate speeds', score: 100 },
        { level: 4, label: 'Reasonable', description: 'Generally fair', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some slow zones', score: 60 },
        { level: 2, label: 'Slow', description: 'Often too slow', score: 40 },
        { level: 1, label: 'Very Slow', description: 'Frustratingly slow', score: 20 }
      ]
    }
  },
  {
    id: 'tr_07_speed_camera',
    categoryId: 'transportation',
    name: 'Speed/Red Light Cameras',
    shortName: 'Traffic Cameras',
    description: 'Prevalence of automated traffic enforcement',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} speed cameras red light cameras',
      '{city} automated traffic enforcement'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'None/Banned', description: 'No cameras', score: 100 },
        { level: 4, label: 'Very Few', description: 'Minimal cameras', score: 80 },
        { level: 3, label: 'Some', description: 'Limited use', score: 60 },
        { level: 2, label: 'Many', description: 'Widespread cameras', score: 40 },
        { level: 1, label: 'Extensive', description: 'Heavy surveillance', score: 20 }
      ]
    }
  },
  {
    id: 'tr_08_parking_regs',
    categoryId: 'transportation',
    name: 'Parking Regulations',
    shortName: 'Parking Rules',
    description: 'Strictness of parking enforcement and costs',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} parking regulations enforcement tickets',
      '{city} parking costs meter rates'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Relaxed', description: 'Plentiful, cheap parking', score: 100 },
        { level: 4, label: 'Relaxed', description: 'Easy parking', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard enforcement', score: 60 },
        { level: 2, label: 'Strict', description: 'Aggressive enforcement', score: 40 },
        { level: 1, label: 'Very Strict', description: 'Expensive, heavy ticketing', score: 20 }
      ]
    }
  },
  {
    id: 'tr_09_toll_roads',
    categoryId: 'transportation',
    name: 'Toll Road Prevalence',
    shortName: 'Toll Roads',
    description: 'Extent of toll roads and congestion pricing',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} toll roads congestion pricing',
      '{city} highway tolls expressway fees'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'None', description: 'No tolls', score: 100 },
        { level: 4, label: 'Minimal', description: 'Few toll roads', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some tolls', score: 60 },
        { level: 2, label: 'Many', description: 'Extensive tolls', score: 40 },
        { level: 1, label: 'Extensive', description: 'Heavy toll burden', score: 20 }
      ]
    }
  },
  {
    id: 'tr_10_vehicle_inspection',
    categoryId: 'transportation',
    name: 'Vehicle Inspection Requirements',
    shortName: 'Vehicle Inspection',
    description: 'Requirements for vehicle safety/emissions inspections',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} {state} vehicle inspection requirements emissions',
      '{city} car inspection safety emissions test'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'none', label: 'No Inspection Required', score: 100 },
        { value: 'safety_only', label: 'Safety Only', score: 80 },
        { value: 'emissions_only', label: 'Emissions Only', score: 70 },
        { value: 'both', label: 'Safety + Emissions', score: 50 },
        { value: 'strict', label: 'Strict Requirements', score: 30 }
      ]
    }
  },
  {
    id: 'tr_11_drivers_license',
    categoryId: 'transportation',
    name: 'Drivers License Requirements',
    shortName: 'License Reqs',
    description: 'Difficulty of obtaining drivers license',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} drivers license requirements test',
      '{city} {country} driving license process foreigners'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Easy', description: 'Simple test, easy renewal', score: 100 },
        { level: 4, label: 'Easy', description: 'Standard process', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some difficulty', score: 60 },
        { level: 2, label: 'Difficult', description: 'Complex requirements', score: 40 },
        { level: 1, label: 'Very Difficult', description: 'Extensive training/tests', score: 20 }
      ]
    }
  },
  {
    id: 'tr_12_dui_laws',
    categoryId: 'transportation',
    name: 'DUI/Drunk Driving Laws',
    shortName: 'DUI Laws',
    description: 'Strictness of drunk driving laws and penalties',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} {state} DUI DWI laws penalties BAC limit',
      '{city} drunk driving penalties first offense'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Reasonable', description: 'Proportionate penalties', score: 100 },
        { level: 4, label: 'Moderate', description: 'Standard penalties', score: 80 },
        { level: 3, label: 'Strict', description: 'Above average penalties', score: 60 },
        { level: 2, label: 'Very Strict', description: 'Harsh penalties', score: 40 },
        { level: 1, label: 'Extreme', description: 'Severe consequences', score: 20 }
      ]
    }
  },
  {
    id: 'tr_13_scooter_ebike',
    categoryId: 'transportation',
    name: 'E-Scooter/E-Bike Regulations',
    shortName: 'E-Mobility',
    description: 'Rules for electric scooters and e-bikes',
    weight: 4,
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    searchQueries: [
      '{city} electric scooter e-bike laws regulations',
      '{city} e-scooter legal rental Bird Lime'
    ],
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'unrestricted', label: 'Largely Unrestricted', score: 100 },
        { value: 'light_regulation', label: 'Light Regulation', score: 80 },
        { value: 'moderate', label: 'Moderate Rules', score: 60 },
        { value: 'restrictive', label: 'Restrictive', score: 40 },
        { value: 'banned', label: 'Banned/Heavily Restricted', score: 20 }
      ]
    }
  },
  {
    id: 'tr_14_airport_access',
    categoryId: 'transportation',
    name: 'Airport Accessibility',
    shortName: 'Airport Access',
    description: 'Quality of airport access and flight options',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} airport accessibility international flights',
      '{city} airport transit connections'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Major hub, great access', score: 100 },
        { level: 4, label: 'Good', description: 'Good airport, many flights', score: 80 },
        { level: 3, label: 'Adequate', description: 'Decent options', score: 60 },
        { level: 2, label: 'Limited', description: 'Few flights', score: 40 },
        { level: 1, label: 'Poor', description: 'Remote/limited airport', score: 20 }
      ]
    }
  },
  {
    id: 'tr_15_traffic_congestion',
    categoryId: 'transportation',
    name: 'Traffic Congestion Level',
    shortName: 'Traffic',
    description: 'Severity of traffic congestion',
    weight: 6,
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    searchQueries: [
      '{city} traffic congestion ranking commute time',
      '{city} average commute rush hour traffic'
    ],
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Light', description: 'Minimal congestion', score: 100 },
        { level: 4, label: 'Light', description: 'Below average', score: 80 },
        { level: 3, label: 'Moderate', description: 'Average traffic', score: 60 },
        { level: 2, label: 'Heavy', description: 'Above average', score: 40 },
        { level: 1, label: 'Severe', description: 'Extreme congestion', score: 20 }
      ]
    }
  }
];

// ============================================================================
// POLICING, COURTS & ENFORCEMENT (15 Metrics)
// ============================================================================

const POLICING_LEGAL_METRICS: MetricDefinition[] = [
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

// ============================================================================
// SPEECH, LIFESTYLE & CULTURE (10 Metrics)
// ============================================================================

const SPEECH_LIFESTYLE_METRICS: MetricDefinition[] = [
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Very strong protections', score: 100 },
        { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard protections', score: 60 },
        { level: 2, label: 'Limited', description: 'Some restrictions', score: 40 },
        { level: 1, label: 'Weak', description: 'Significant limits', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Top press freedom', score: 100 },
        { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some issues', score: 60 },
        { level: 2, label: 'Limited', description: 'Notable restrictions', score: 40 },
        { level: 1, label: 'Poor', description: 'Severe restrictions', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Free', description: 'No censorship', score: 100 },
        { level: 4, label: 'Mostly Free', description: 'Minimal blocking', score: 80 },
        { level: 3, label: 'Partly Free', description: 'Some restrictions', score: 60 },
        { level: 2, label: 'Not Free', description: 'Significant censorship', score: 40 },
        { level: 1, label: 'Very Restricted', description: 'Heavy censorship', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'No Laws', description: 'Speech fully protected', score: 100 },
        { level: 4, label: 'Narrow', description: 'Only threats/incitement', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some hate speech laws', score: 60 },
        { level: 2, label: 'Broad', description: 'Extensive restrictions', score: 40 },
        { level: 1, label: 'Very Broad', description: 'Heavy speech limits', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Strong', description: 'Minimal restrictions', score: 100 },
        { level: 4, label: 'Strong', description: 'Good protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Permit required', score: 60 },
        { level: 2, label: 'Limited', description: 'Significant hurdles', score: 40 },
        { level: 1, label: 'Restricted', description: 'Protests suppressed', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Excellent', description: 'Full religious freedom', score: 100 },
        { level: 4, label: 'Good', description: 'Strong protections', score: 80 },
        { level: 3, label: 'Moderate', description: 'Some issues', score: 60 },
        { level: 2, label: 'Limited', description: 'State religion influence', score: 40 },
        { level: 1, label: 'Restricted', description: 'Religious restrictions', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'gdpr_level', label: 'GDPR-Level Protection', score: 100 },
        { value: 'strong', label: 'Strong Protection', score: 80 },
        { value: 'moderate', label: 'Moderate Protection', score: 60 },
        { value: 'weak', label: 'Weak Protection', score: 40 },
        { value: 'minimal', label: 'Minimal/None', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Permissive', description: 'Few restrictions', score: 100 },
        { level: 4, label: 'Permissive', description: 'Minimal requirements', score: 80 },
        { level: 3, label: 'Standard', description: 'Basic standards', score: 60 },
        { level: 2, label: 'Restrictive', description: 'Modesty requirements', score: 40 },
        { level: 1, label: 'Very Restrictive', description: 'Strict dress codes', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Very Tolerant', description: 'Highly diverse/inclusive', score: 100 },
        { level: 4, label: 'Tolerant', description: 'Generally accepting', score: 80 },
        { level: 3, label: 'Moderate', description: 'Mixed attitudes', score: 60 },
        { level: 2, label: 'Intolerant', description: 'Conservative culture', score: 40 },
        { level: 1, label: 'Very Intolerant', description: 'Hostile to differences', score: 20 }
      ]
    }
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
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 5, label: 'Speech-Friendly', description: 'High burden for plaintiffs', score: 100 },
        { level: 4, label: 'Balanced', description: 'Fair standards', score: 80 },
        { level: 3, label: 'Moderate', description: 'Standard laws', score: 60 },
        { level: 2, label: 'Plaintiff-Friendly', description: 'Easy to sue', score: 40 },
        { level: 1, label: 'Chilling', description: 'Suppresses speech', score: 20 }
      ]
    }
  }
];

// ============================================================================
// COMBINED METRICS EXPORT
// ============================================================================

export const ALL_METRICS: MetricDefinition[] = [
  ...PERSONAL_FREEDOM_METRICS,
  ...HOUSING_PROPERTY_METRICS,
  ...BUSINESS_WORK_METRICS,
  ...TRANSPORTATION_METRICS,
  ...POLICING_LEGAL_METRICS,
  ...SPEECH_LIFESTYLE_METRICS
];

// Create a map for quick lookup
export const METRICS_MAP: Record<string, MetricDefinition> = ALL_METRICS.reduce(
  (acc, metric) => ({ ...acc, [metric.id]: metric }),
  {} as Record<string, MetricDefinition>
);

// Get metrics by category
export const getMetricsByCategory = (categoryId: CategoryId): MetricDefinition[] => {
  return ALL_METRICS.filter(m => m.categoryId === categoryId);
};

// Validation
export const validateMetricCounts = (): boolean => {
  const counts: Record<CategoryId, number> = {
    personal_freedom: 0,
    housing_property: 0,
    business_work: 0,
    transportation: 0,
    policing_legal: 0,
    speech_lifestyle: 0
  };
  
  ALL_METRICS.forEach(m => {
    counts[m.categoryId]++;
  });
  
  const expected: Record<CategoryId, number> = {
    personal_freedom: 15,
    housing_property: 20,
    business_work: 25,
    transportation: 15,
    policing_legal: 15,
    speech_lifestyle: 10
  };
  
  for (const cat of Object.keys(expected) as CategoryId[]) {
    if (counts[cat] !== expected[cat]) {
      console.error(`Category ${cat}: expected ${expected[cat]}, got ${counts[cat]}`);
      return false;
    }
  }
  
  return true;
};

// Confirm total
console.log(`Total LIFE SCORE metrics defined: ${ALL_METRICS.length}`);
