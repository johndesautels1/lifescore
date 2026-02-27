/**
 * LIFE SCORE - Field Knowledge: Housing & Property
 * 20 metrics (hp_01 through hp_20)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_HOUSING_PROPERTY: Record<string, FieldKnowledge> = {
  'hp_01_hoa_prevalence': {
    talkingPoints: [
      'Over 75 million Americans live in HOA communities',
      'HOA prevalence varies from 5% to 70% by metro area',
      'New construction almost always includes HOA',
      'Older neighborhoods often have no HOA',
      'Avoiding HOA may mean choosing different neighborhoods',
    ],
    keySourceTypes: ['Community Associations Institute', 'Census data', 'Real estate reports'],
    commonQuestions: [
      'How common are HOAs here?',
      'Can I find homes without an HOA?',
      'Are new developments always HOA?',
    ],
    dailyLifeImpact: 'Determines likelihood of living under HOA rules and paying HOA fees.',
  },

  'hp_02_hoa_power': {
    talkingPoints: [
      'HOA powers are defined by CC&Rs (Covenants, Conditions & Restrictions)',
      'Some HOAs control paint colors, landscaping, parking',
      'Fining authority varies - some can lien your home',
      'State laws increasingly limit HOA overreach',
      'Board elections determine HOA direction',
    ],
    keySourceTypes: ['State HOA laws', 'Community Associations Institute', 'HOA CC&Rs'],
    commonQuestions: [
      'What can the HOA control?',
      'Can they fine me?',
      'Can they put a lien on my home?',
      'What are my rights against the HOA?',
    ],
    dailyLifeImpact: 'Affects daily decisions about your property from paint colors to parking.',
  },

  'hp_03_property_tax_rate': {
    talkingPoints: [
      'Rates range from 0.3% (Hawaii) to 2.5%+ (New Jersey)',
      'Assessed value may differ from market value',
      'Homestead exemptions reduce taxes for primary residence',
      'Tax increases may be capped (Prop 13 in California)',
      'Impacts total cost of homeownership significantly',
    ],
    keySourceTypes: ['County assessor', 'Tax Foundation', 'State revenue department'],
    commonQuestions: [
      'What is the property tax rate?',
      'How is my home assessed?',
      'Are there any exemptions?',
      'How much will I pay annually?',
    ],
    dailyLifeImpact: 'Major ongoing cost of homeownership, can be $5,000-$20,000+ annually.',
  },

  'hp_04_rent_control': {
    talkingPoints: [
      'Only a few states allow local rent control',
      'Many states have preemption laws banning rent control',
      'Rent stabilization is different from strict rent control',
      'Vacancy decontrol allows market rate on turnover',
      'New construction is often exempt',
    ],
    keySourceTypes: ['State housing laws', 'Local rent board', 'National Apartment Association'],
    commonQuestions: [
      'Is there rent control?',
      'How much can my rent increase?',
      'Are there any caps on increases?',
    ],
    dailyLifeImpact: 'Affects housing stability and predictability of rental costs.',
  },

  'hp_05_eviction_protection': {
    talkingPoints: [
      'Just cause eviction requirements protect tenants',
      'Notice periods range from 3 days to 90+ days',
      'Eviction moratoriums during emergencies',
      'Right to counsel in eviction proceedings',
      'Relocation assistance requirements in some cities',
    ],
    keySourceTypes: ['State landlord-tenant law', 'Legal aid organizations', 'Eviction Lab'],
    commonQuestions: [
      'How much notice is required to evict?',
      'What are valid reasons for eviction?',
      'Do I have a right to a lawyer?',
    ],
    dailyLifeImpact: 'Critical for housing stability and protection against displacement.',
  },

  'hp_06_zoning_strictness': {
    talkingPoints: [
      'Single-family zoning limits housing density',
      'Mixed-use zoning allows residential and commercial',
      'Minneapolis eliminated single-family zoning citywide',
      'Zoning affects what businesses can operate nearby',
      'Variances and special permits allow exceptions',
    ],
    keySourceTypes: ['City planning department', 'Zoning maps', 'Urban planning reports'],
    commonQuestions: [
      'What can be built in my neighborhood?',
      'Can I have a home business?',
      'Will apartments be built nearby?',
    ],
    dailyLifeImpact: 'Shapes neighborhood character and housing affordability.',
  },

  'hp_07_building_permits': {
    talkingPoints: [
      'Permit requirements vary by project size',
      'Some cities require permits for minor work',
      'Wait times range from days to months',
      'Unpermitted work affects resale and insurance',
      'Owner-builder permits allow DIY in some areas',
    ],
    keySourceTypes: ['City building department', 'State contractor board', 'ICC codes'],
    commonQuestions: [
      'What needs a permit?',
      'How long does approval take?',
      'Can I do the work myself?',
    ],
    dailyLifeImpact: 'Affects ability to improve your property and associated costs/delays.',
  },

  'hp_08_short_term_rental': {
    talkingPoints: [
      'Many cities require registration and licensing',
      'Limits on rental days per year common',
      'Primary residence requirements in some areas',
      'HOAs may have stricter rules than city',
      'Tax collection requirements for hosts',
    ],
    keySourceTypes: ['City short-term rental ordinance', 'Airbnb regulations page', 'HOA CC&Rs'],
    commonQuestions: [
      'Can I Airbnb my home?',
      'Do I need a license?',
      'How many days can I rent?',
    ],
    dailyLifeImpact: 'Affects ability to earn income from property and neighborhood character.',
  },

  'hp_09_adu_laws': {
    talkingPoints: [
      'ADUs (granny flats) increasingly allowed by state law',
      'California mandates ADU approval in most areas',
      'Size limits typically 800-1200 sq ft',
      'Parking requirements often waived for ADUs',
      'Can provide rental income or house family members',
    ],
    keySourceTypes: ['State ADU law', 'City planning department', 'AARP ADU model law'],
    commonQuestions: [
      'Can I build an ADU on my property?',
      'What are the size limits?',
      'Do I need additional parking?',
    ],
    dailyLifeImpact: 'Opportunity to add housing for family or rental income.',
  },

  'hp_10_home_business': {
    talkingPoints: [
      'Zoning often restricts commercial activity in residential',
      'Home occupation permits may be required',
      'Customer traffic and signage usually restricted',
      'Online businesses typically have fewer restrictions',
      'Some businesses prohibited entirely in residential',
    ],
    keySourceTypes: ['City zoning code', 'Business licensing office', 'HOA CC&Rs'],
    commonQuestions: [
      'Can I run a business from home?',
      'Do I need a permit?',
      'Can clients visit my home?',
    ],
    dailyLifeImpact: 'Affects ability to work from home and start small businesses.',
  },

  'hp_11_eminent_domain': {
    talkingPoints: [
      'Government can take private property for public use',
      'Kelo v. New London expanded what counts as public use',
      'Many states reformed laws after Kelo backlash',
      'Just compensation required but often contested',
      'Process and protections vary significantly by state',
    ],
    keySourceTypes: ['State eminent domain law', 'Institute for Justice', 'State constitution'],
    commonQuestions: [
      'Can the government take my property?',
      'What protections do I have?',
      'How is compensation determined?',
    ],
    dailyLifeImpact: 'Affects property security and protection against government takings.',
  },

  'hp_12_squatter_rights': {
    talkingPoints: [
      'Adverse possession requires 5-20 years depending on state',
      'Continuous, open, hostile possession required',
      'Property taxes paid by squatter may accelerate claim',
      'Vacant property most vulnerable',
      'Quick action by owners prevents claims',
    ],
    keySourceTypes: ['State property law', 'Legal aid', 'Real estate attorneys'],
    commonQuestions: [
      'How long until a squatter has rights?',
      'How do I protect vacant property?',
      'What if someone is squatting on my land?',
    ],
    dailyLifeImpact: 'Affects property owners with vacant land or second homes.',
  },

  'hp_13_historic_preservation': {
    talkingPoints: [
      'Historic districts restrict exterior modifications',
      'Approval required for changes visible from street',
      'Can increase property values but limits flexibility',
      'Tax credits available for approved renovations',
      'Individual landmark status differs from district',
    ],
    keySourceTypes: ['Local historic preservation office', 'State historic society', 'National Trust'],
    commonQuestions: [
      'Is my home in a historic district?',
      'What changes need approval?',
      'Are there tax benefits?',
    ],
    dailyLifeImpact: 'Affects ability to modify your property and associated costs.',
  },

  'hp_14_foreign_ownership': {
    talkingPoints: [
      'Most states have no restrictions on foreign ownership',
      'Agricultural land restrictions in some states',
      'CFIUS reviews large acquisitions for national security',
      'Some countries have reciprocity requirements',
      'Financing may be harder for non-residents',
    ],
    keySourceTypes: ['State property laws', 'CFIUS regulations', 'National Association of Realtors'],
    commonQuestions: [
      'Can foreigners buy property here?',
      'Are there any restrictions?',
      'What about agricultural land?',
    ],
    dailyLifeImpact: 'Relevant for international buyers or sellers to foreign nationals.',
  },

  'hp_15_transfer_taxes': {
    talkingPoints: [
      'Transfer taxes range from 0% to 4%+ of sale price',
      'Some states have no transfer tax',
      'Often split between buyer and seller',
      'Additional city taxes in some areas',
      'Mansion taxes apply to high-value properties',
    ],
    keySourceTypes: ['State revenue department', 'County recorder', 'Title company'],
    commonQuestions: [
      'What is the transfer tax rate?',
      'Who pays the transfer tax?',
      'Are there exemptions?',
    ],
    dailyLifeImpact: 'Significant one-time cost when buying or selling property.',
  },

  'hp_16_lawn_regulations': {
    talkingPoints: [
      'Many cities require lawn maintenance',
      'Weed and grass height limits common',
      'Xeriscaping increasingly allowed despite old rules',
      'HOAs often have stricter requirements',
      'Fines can escalate and lead to liens',
    ],
    keySourceTypes: ['City code enforcement', 'HOA CC&Rs', 'Property maintenance code'],
    commonQuestions: [
      'Do I have to maintain my lawn?',
      'Can I have a natural yard?',
      'What about xeriscaping or native plants?',
    ],
    dailyLifeImpact: 'Affects property maintenance obligations and landscaping choices.',
  },

  'hp_17_exterior_colors': {
    talkingPoints: [
      'Paint colors may require approval',
      'Solar panels increasingly protected by state law',
      'Satellite dish rights protected federally (OTARD)',
      'Fencing, sheds, decks often need permits',
      'Historic districts have strictest rules',
    ],
    keySourceTypes: ['HOA architectural review', 'City building department', 'State solar rights laws'],
    commonQuestions: [
      'Do I need approval to paint my house?',
      'Can I install solar panels?',
      'What about a fence or shed?',
    ],
    dailyLifeImpact: 'Affects ability to customize your property appearance.',
  },

  'hp_18_fence_rules': {
    talkingPoints: [
      'Height limits typically 4ft front, 6ft back',
      'Materials may be regulated (no chain link in front)',
      'Setbacks required from property line in some areas',
      'Pool fencing has safety requirements',
      'Good neighbor fence laws share costs',
    ],
    keySourceTypes: ['City zoning code', 'HOA CC&Rs', 'State fence laws'],
    commonQuestions: [
      'How tall can my fence be?',
      'What materials are allowed?',
      'Do I need a permit for a fence?',
    ],
    dailyLifeImpact: 'Affects privacy options and property boundary control.',
  },

  'hp_19_vehicle_parking': {
    talkingPoints: [
      'Minimum parking requirements being eliminated in many cities',
      'On-street parking permits common in dense areas',
      'RV and boat parking often restricted',
      'Garage conversion rules affect parking counts',
      'HOAs may limit vehicle types (no commercial)',
    ],
    keySourceTypes: ['City zoning code', 'Parking authority', 'HOA CC&Rs'],
    commonQuestions: [
      'How many cars can I park?',
      'Can I park my RV at home?',
      'Are there street parking permits?',
    ],
    dailyLifeImpact: 'Affects vehicle storage options and convenience.',
  },

  'hp_20_pet_restrictions': {
    talkingPoints: [
      'Breed-specific legislation (BSL) bans pit bulls in some areas',
      'Pet limits common - typically 2-4 dogs',
      'Exotic pet regulations vary widely',
      'Chicken and backyard farming rules differ by city',
      'HOAs may have stricter limits',
    ],
    keySourceTypes: ['City animal control', 'HOA CC&Rs', 'State animal laws'],
    commonQuestions: [
      'Are there breed restrictions?',
      'How many pets can I have?',
      'Can I keep chickens?',
      'What about exotic pets?',
    ],
    dailyLifeImpact: 'Affects pet ownership options and types of animals you can keep.',
  },
};
