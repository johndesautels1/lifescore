/**
 * LIFE SCORE™ - HOUSING PROPERTY Metrics
 * Clues Intelligence LTD © 2025
 */

import type { MetricDefinition } from './types.js';

export const HOUSING_PROPERTY_METRICS: MetricDefinition[] = [
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
