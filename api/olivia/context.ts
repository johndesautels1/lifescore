/**
 * LIFE SCORE - Olivia Context Builder API
 * Transforms comparison data into context for Olivia AI assistant
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// TYPES (inline to avoid import issues in Vercel)
// ============================================================================

interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

interface ContextMetric {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  consensusLevel?: string;
  judgeExplanation?: string;
  legalScore?: number;
  enforcementScore?: number;
  diff?: number;
  category?: string;
}

interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: string;
  topMetrics: ContextMetric[];
}

interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

interface LifeScoreContext {
  comparison: {
    city1: ContextCity;
    city2: ContextCity;
    winner: string;
    scoreDifference: number;
    generatedAt: string;
    comparisonId: string;
  };
  categories: ContextCategory[];
  topMetrics: ContextMetric[];
  evidence: ContextEvidence[];
  consensus?: {
    llmsUsed: string[];
    judgeModel: string;
    overallConfidence: string;
    disagreementSummary?: string;
    topDisagreements: Array<{
      metricName: string;
      standardDeviation: number;
      explanation: string;
    }>;
  };
  gammaReportUrl?: string;
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

// ============================================================================
// CATEGORY NAME MAPPING
// ============================================================================

const CATEGORY_NAMES: Record<string, string> = {
  'personal_freedom': 'Personal Autonomy',
  'personal-freedom': 'Personal Autonomy',
  'housing_property': 'Housing & Property',
  'housing-property': 'Housing & Property',
  'business_work': 'Business & Work',
  'business-work': 'Business & Work',
  'transportation': 'Transportation',
  'policing_legal': 'Policing & Courts',
  'policing-courts': 'Policing & Courts',
  'speech_lifestyle': 'Speech & Lifestyle',
  'speech-lifestyle': 'Speech & Lifestyle',
};

// ============================================================================
// METRIC DISPLAY NAMES (ALL 100 METRICS)
// ============================================================================

const METRIC_DISPLAY_NAMES: Record<string, string> = {
  // Personal Freedom (15 metrics)
  'pf_01_cannabis_legal': 'Cannabis Legality',
  'pf_02_alcohol_restrictions': 'Alcohol Purchase Restrictions',
  'pf_03_gambling_legal': 'Gambling Legality',
  'pf_04_prostitution_status': 'Sex Work Legal Status',
  'pf_05_drug_possession': 'Drug Possession Penalties',
  'pf_06_abortion_access': 'Abortion Access',
  'pf_07_lgbtq_rights': 'LGBTQ+ Rights',
  'pf_08_assisted_dying': 'Assisted Dying Laws',
  'pf_09_smoking_restrictions': 'Smoking Restrictions',
  'pf_10_public_drinking': 'Public Drinking Laws',
  'pf_11_helmet_laws': 'Helmet Laws',
  'pf_12_seatbelt_laws': 'Seatbelt Laws',
  'pf_13_jaywalking': 'Jaywalking Enforcement',
  'pf_14_curfew_laws': 'Curfew Laws',
  'pf_15_noise_ordinances': 'Noise Ordinances',

  // Housing & Property (20 metrics)
  'hp_01_hoa_prevalence': 'HOA Prevalence',
  'hp_02_hoa_power': 'HOA Power & Restrictions',
  'hp_03_property_tax_rate': 'Property Tax Rate',
  'hp_04_rent_control': 'Rent Control Laws',
  'hp_05_eviction_protection': 'Tenant Eviction Protections',
  'hp_06_zoning_restrictions': 'Zoning Restrictions',
  'hp_07_building_permits': 'Building Permit Requirements',
  'hp_08_short_term_rental': 'Short-Term Rental (Airbnb) Laws',
  'hp_09_adu_laws': 'ADU (Accessory Dwelling) Laws',
  'hp_10_home_business': 'Home Business Restrictions',
  'hp_11_eminent_domain': 'Eminent Domain Protections',
  'hp_12_squatter_rights': 'Squatter/Adverse Possession Rights',
  'hp_13_historic_preservation': 'Historic Preservation Rules',
  'hp_14_foreign_ownership': 'Foreign Property Ownership',
  'hp_15_transfer_tax': 'Property Transfer Tax',
  'hp_16_lawn_maintenance': 'Lawn Maintenance Requirements',
  'hp_17_exterior_modifications': 'Exterior Modification Rules',
  'hp_18_fence_regulations': 'Fence Regulations',
  'hp_19_parking_requirements': 'Residential Parking Rules',
  'hp_20_pet_restrictions': 'Pet Ownership Restrictions',

  // Business & Work (25 metrics)
  'bw_01_business_license': 'Business License Requirements',
  'bw_02_occupational_license': 'Occupational Licensing',
  'bw_03_minimum_wage': 'Minimum Wage Level',
  'bw_04_right_to_work': 'Right to Work Laws',
  'bw_05_employment_protections': 'Employment Protections',
  'bw_06_paid_leave': 'Mandatory Paid Leave',
  'bw_07_parental_leave': 'Parental Leave Requirements',
  'bw_08_non_compete': 'Non-Compete Enforceability',
  'bw_09_corporate_tax': 'Corporate Tax Rate',
  'bw_10_income_tax': 'State/Local Income Tax',
  'bw_11_sales_tax': 'Sales Tax Rate',
  'bw_12_gig_economy': 'Gig Worker Regulations',
  'bw_13_work_visa': 'Work Visa Friendliness',
  'bw_14_remote_work': 'Remote Work Laws',
  'bw_15_overtime_rules': 'Overtime Requirements',
  'bw_16_union_laws': 'Union Rights & Laws',
  'bw_17_workplace_safety': 'Workplace Safety Standards',
  'bw_18_anti_discrimination': 'Anti-Discrimination Laws',
  'bw_19_startup_friendliness': 'Startup Friendliness',
  'bw_20_food_truck_regs': 'Food Truck Regulations',
  'bw_21_contractor_license': 'Contractor Licensing',
  'bw_22_health_insurance_mandate': 'Health Insurance Mandate',
  'bw_23_tip_credit': 'Tip Credit Laws',
  'bw_24_banking_access': 'Banking Access',
  'bw_25_crypto_regulations': 'Cryptocurrency Regulations',

  // Transportation (15 metrics)
  'tr_01_public_transit': 'Public Transit Quality',
  'tr_02_walkability': 'Walkability Score',
  'tr_03_bike_infrastructure': 'Bike Infrastructure',
  'tr_04_car_dependency': 'Car Dependency Level',
  'tr_05_rideshare_regs': 'Rideshare Regulations',
  'tr_06_speed_limits': 'Speed Limit Enforcement',
  'tr_07_traffic_cameras': 'Traffic Camera Usage',
  'tr_08_parking_regulations': 'Parking Regulations',
  'tr_09_toll_roads': 'Toll Road Prevalence',
  'tr_10_vehicle_inspection': 'Vehicle Inspection Requirements',
  'tr_11_license_requirements': 'Driver License Requirements',
  'tr_12_dui_laws': 'DUI Law Severity',
  'tr_13_electric_vehicles': 'E-Vehicle/E-Bike Laws',
  'tr_14_airport_access': 'Airport Accessibility',
  'tr_15_traffic_congestion': 'Traffic Congestion Level',

  // Policing & Legal (15 metrics)
  'pl_01_incarceration_rate': 'Incarceration Rate',
  'pl_02_police_per_capita': 'Police Per Capita',
  'pl_03_civil_forfeiture': 'Civil Asset Forfeiture',
  'pl_04_mandatory_minimums': 'Mandatory Minimum Sentences',
  'pl_05_bail_system': 'Cash Bail System',
  'pl_06_police_oversight': 'Police Oversight',
  'pl_07_qualified_immunity': 'Qualified Immunity Status',
  'pl_08_legal_costs': 'Legal System Costs',
  'pl_09_court_efficiency': 'Court System Efficiency',
  'pl_10_jury_rights': 'Jury Nullification Rights',
  'pl_11_surveillance': 'Government Surveillance',
  'pl_12_search_seizure': 'Search & Seizure Protections',
  'pl_13_death_penalty': 'Death Penalty Status',
  'pl_14_prison_conditions': 'Prison Conditions',
  'pl_15_expungement': 'Criminal Record Expungement',

  // Speech & Lifestyle (10 metrics)
  'sl_01_free_speech': 'Free Speech Protections',
  'sl_02_press_freedom': 'Press Freedom',
  'sl_03_internet_freedom': 'Internet Freedom',
  'sl_04_hate_speech_laws': 'Hate Speech Laws',
  'sl_05_protest_rights': 'Protest Rights',
  'sl_06_religious_freedom': 'Religious Freedom',
  'sl_07_privacy_laws': 'Data Privacy Laws',
  'sl_08_dress_codes': 'Dress Code Freedom',
  'sl_09_cultural_tolerance': 'Cultural Tolerance',
  'sl_10_defamation_laws': 'Defamation Laws'
};

/**
 * Get display name for a metric ID
 */
function getMetricDisplayName(metricId: string): string {
  return METRIC_DISPLAY_NAMES[metricId] || metricId.replace(/_/g, ' ').replace(/^[a-z]{2}_\d{2}_/, '');
}

// ============================================================================
// METRIC KNOWLEDGE (Full 100 metrics - imported from fieldKnowledge.ts structure)
// UPDATED 2026-01-25: Expanded from 16 to all 100 metrics
// ============================================================================

interface MetricKnowledge {
  talkingPoints: string[];
  keySourceTypes: string[];
  commonQuestions: string[];
  dailyLifeImpact?: string;
}

const METRIC_KNOWLEDGE: Record<string, MetricKnowledge> = {
  // ============================================================================
  // PERSONAL FREEDOM (15 metrics)
  // ============================================================================
  'pf_01_cannabis_legal': {
    talkingPoints: ['Recreational vs medical distinction matters for everyday users', 'Home cultivation rights vary dramatically - some states allow 6+ plants', 'Possession limits range from 1oz to unlimited for home use', 'Social consumption venues are the next frontier', 'Employment protections for off-duty use are rare but growing'],
    keySourceTypes: ['NORML', 'State legislature', 'MPP (Marijuana Policy Project)'],
    commonQuestions: ['Can I grow my own cannabis?', 'What are the possession limits?', 'Can my employer fire me for using cannabis off-duty?', 'Are there cannabis lounges or cafes?'],
    dailyLifeImpact: 'Affects whether you can legally purchase, possess, and consume cannabis products without fear of arrest.',
  },
  'pf_02_alcohol_restrictions': {
    talkingPoints: ['Blue laws restrict Sunday and holiday sales in many areas', 'Dry counties still exist - over 500 in the US', 'State-run liquor stores limit selection and hours', 'Grocery store wine/beer sales vary by state', 'Happy hour restrictions affect bar culture'],
    keySourceTypes: ['State ABC (Alcohol Beverage Control)', 'Local ordinances'],
    commonQuestions: ['Can I buy alcohol on Sunday?', 'Are there state-run liquor stores?', 'Can I buy wine at the grocery store?', 'What are the bar closing times?'],
    dailyLifeImpact: 'Determines when and where you can purchase alcohol, and affects restaurant/bar culture.',
  },
  'pf_03_gambling_legal': {
    talkingPoints: ['Casino gambling vs tribal gaming differences', 'Sports betting legalization is rapidly expanding', 'Online gambling restrictions vary widely', 'Poker home games have different legal status than casinos', 'State lotteries are nearly universal but other gambling varies'],
    keySourceTypes: ['State gaming commission', 'American Gaming Association'],
    commonQuestions: ['Are there casinos nearby?', 'Can I bet on sports legally?', 'Is online poker legal?', 'What about fantasy sports?'],
    dailyLifeImpact: 'Affects entertainment options and whether you can legally participate in various forms of gambling.',
  },
  'pf_04_prostitution_status': {
    talkingPoints: ['Only Nevada has legal brothels (in certain counties)', 'Decriminalization efforts focus on protecting sex workers', 'Nordic model criminalizes buyers but not sellers', 'Many cities use "end demand" enforcement approaches', 'This metric measures legal status, not moral judgment'],
    keySourceTypes: ['State criminal code', 'ACLU reports', 'Local ordinances'],
    commonQuestions: ['What is the legal status of sex work?', 'Are there any legal options?', 'What are the enforcement priorities?'],
    dailyLifeImpact: 'Reflects broader attitudes toward personal autonomy and victimless crime enforcement.',
  },
  'pf_05_drug_possession': {
    talkingPoints: ['Oregon decriminalized all drugs in 2020', 'Many states have reduced penalties for small amounts', 'Drug courts offer treatment alternatives', 'Fentanyl test strip legality varies', 'Good Samaritan laws protect those calling 911 for overdoses'],
    keySourceTypes: ['State criminal code', 'Drug Policy Alliance', 'SAMHSA'],
    commonQuestions: ['What are penalties for possession?', 'Are there drug courts or diversion programs?', 'Is harm reduction legal?'],
    dailyLifeImpact: 'Affects risk of arrest and incarceration for drug possession, and access to harm reduction.',
  },
  'pf_06_abortion_access': {
    talkingPoints: ['Post-Dobbs landscape varies dramatically by state', 'Gestational limits range from total bans to no restrictions', 'Waiting periods and mandatory counseling add barriers', 'Clinic availability affects practical access', 'Travel restrictions are emerging in some states'],
    keySourceTypes: ['Guttmacher Institute', 'State health department', 'Planned Parenthood'],
    commonQuestions: ['Is abortion legal here?', 'What are the gestational limits?', 'Are there waiting periods?', 'How many clinics are available?'],
    dailyLifeImpact: 'Critical for reproductive autonomy and healthcare access.',
  },
  'pf_07_lgbtq_rights': {
    talkingPoints: ['Marriage equality is federal but other protections vary', 'Employment non-discrimination coverage differs by state', 'Conversion therapy bans protect minors in some states', 'Bathroom bills and transgender sports policies vary', 'Adoption and foster care protections affect families'],
    keySourceTypes: ['HRC State Equality Index', 'Movement Advancement Project', 'State civil rights laws'],
    commonQuestions: ['Are LGBTQ+ people protected from discrimination?', 'Is conversion therapy banned?', 'What are the adoption rights?', 'Are there transgender-specific protections?'],
    dailyLifeImpact: 'Affects safety, employment, housing, and family rights for LGBTQ+ individuals.',
  },
  'pf_08_assisted_dying': {
    talkingPoints: ['Medical aid in dying legal in 10+ states plus DC', 'Requires terminal diagnosis with 6-month prognosis', 'Multiple physician approvals and waiting periods required', 'Some states require state residency', 'Religious and ethical debates continue'],
    keySourceTypes: ['Death with Dignity', 'State health department', 'Medical board'],
    commonQuestions: ['Is medical aid in dying legal?', 'What are the requirements?', 'Do I need to be a resident?'],
    dailyLifeImpact: 'Affects end-of-life autonomy and options for terminally ill individuals.',
  },
  'pf_09_smoking_restrictions': {
    talkingPoints: ['Indoor smoking bans are nearly universal now', 'Outdoor restrictions vary widely - parks, beaches, patios', 'Smoking age raised to 21 federally in 2019', 'Vaping regulations often mirror or exceed tobacco', 'Apartment and condo smoking bans affect housing'],
    keySourceTypes: ['American Lung Association', 'State health department', 'Local ordinances'],
    commonQuestions: ['Where can I smoke?', 'Are vapes treated the same as cigarettes?', 'Can my landlord ban smoking?'],
    dailyLifeImpact: 'Affects daily smoking habits and where tobacco products can be used.',
  },
  'pf_10_public_drinking': {
    talkingPoints: ['Open container laws vary by state and locality', 'Entertainment districts may allow street drinking', 'New Orleans, Las Vegas, Savannah allow open containers', 'Brown bag rules differ from legal drinking', 'Parks and beaches often have separate rules'],
    keySourceTypes: ['State ABC', 'Local ordinances', 'Tourism boards'],
    commonQuestions: ['Can I drink in public?', 'Are there entertainment districts with open containers?', 'What about beaches and parks?'],
    dailyLifeImpact: 'Affects social culture and ability to enjoy outdoor events with alcohol.',
  },
  'pf_11_helmet_laws': {
    talkingPoints: ['Universal helmet laws cover all riders in 18 states', 'Partial laws may only cover riders under 18 or 21', 'Three states have no helmet law at all', 'Bicycle helmet laws are usually local and for minors', 'E-bike and scooter helmet requirements vary'],
    keySourceTypes: ['IIHS', 'State DOT', 'NHTSA'],
    commonQuestions: ['Do I have to wear a motorcycle helmet?', 'What about bicycle helmets?', 'Are e-bike riders required to wear helmets?'],
    dailyLifeImpact: 'Affects personal choice in motorcycle and bicycle safety equipment.',
  },
  'pf_12_seatbelt_laws': {
    talkingPoints: ['Primary enforcement allows stops solely for seatbelt violations', 'Secondary enforcement only tickets seatbelts during other stops', 'New Hampshire has no adult seatbelt law', 'Rear seat requirements vary significantly', 'Exemptions exist for certain vehicles and medical conditions'],
    keySourceTypes: ['NHTSA', 'State DOT', 'Governors Highway Safety Association'],
    commonQuestions: ['Can I be pulled over just for not wearing a seatbelt?', 'Do back seat passengers need seatbelts?', 'Are there any exemptions?'],
    dailyLifeImpact: 'Affects enforcement risk for personal safety choices in vehicles.',
  },
  'pf_13_jaywalking': {
    talkingPoints: ['California decriminalized jaywalking in 2023', 'Many cities de-prioritize jaywalking enforcement', 'Fines range from warnings to $250+', 'Enforcement often has racial disparities', 'Some cities redesigning for pedestrian priority'],
    keySourceTypes: ['Local traffic code', 'City pedestrian plans', 'Police department'],
    commonQuestions: ['Can I get a ticket for jaywalking?', 'How strictly is it enforced?', 'Are there designated crossing areas?'],
    dailyLifeImpact: 'Affects pedestrian freedom and risk of citations for crossing streets.',
  },
  'pf_14_curfew_laws': {
    talkingPoints: ['Most curfews apply only to minors (under 17 or 18)', 'Typical hours are 11pm-6am on school nights', 'Emergency curfews can apply to all ages', 'Enforcement varies dramatically by neighborhood', 'Some cities have eliminated curfews entirely'],
    keySourceTypes: ['Local municipal code', 'Police department', 'ACLU'],
    commonQuestions: ['Is there a curfew for teenagers?', 'What are the curfew hours?', 'Are curfews enforced?'],
    dailyLifeImpact: 'Primarily affects families with teenagers and youth freedom of movement.',
  },
  'pf_15_noise_ordinances': {
    talkingPoints: ['Quiet hours typically 10pm-7am', 'Decibel limits vary by zone (residential vs commercial)', 'Construction noise has separate regulations', 'Barking dogs are a common noise complaint', 'Music and party noise enforcement varies by neighbor complaints'],
    keySourceTypes: ['Local municipal code', 'Noise control office', 'Health department'],
    commonQuestions: ['What are the quiet hours?', 'How loud can I play music?', 'When can construction happen?'],
    dailyLifeImpact: 'Affects ability to host gatherings, play music, and overall neighborhood culture.',
  },
  // ============================================================================
  // HOUSING & PROPERTY (20 metrics)
  // ============================================================================
  'hp_01_hoa_prevalence': {
    talkingPoints: ['Over 75 million Americans live in HOA communities', 'HOA prevalence varies from 5% to 70% by metro area', 'New construction almost always includes HOA', 'Older neighborhoods often have no HOA', 'Avoiding HOA may mean choosing different neighborhoods'],
    keySourceTypes: ['Community Associations Institute', 'Census data', 'Real estate reports'],
    commonQuestions: ['How common are HOAs here?', 'Can I find homes without an HOA?', 'Are new developments always HOA?'],
    dailyLifeImpact: 'Determines likelihood of living under HOA rules and paying HOA fees.',
  },
  'hp_02_hoa_power': {
    talkingPoints: ['HOA powers are defined by CC&Rs (Covenants, Conditions & Restrictions)', 'Some HOAs control paint colors, landscaping, parking', 'Fining authority varies - some can lien your home', 'State laws increasingly limit HOA overreach', 'Board elections determine HOA direction'],
    keySourceTypes: ['State HOA laws', 'Community Associations Institute', 'HOA CC&Rs'],
    commonQuestions: ['What can the HOA control?', 'Can they fine me?', 'Can they put a lien on my home?', 'What are my rights against the HOA?'],
    dailyLifeImpact: 'Affects daily decisions about your property from paint colors to parking.',
  },
  'hp_03_property_tax_rate': {
    talkingPoints: ['Rates range from 0.3% (Hawaii) to 2.5%+ (New Jersey)', 'Assessed value may differ from market value', 'Homestead exemptions reduce taxes for primary residence', 'Tax increases may be capped (Prop 13 in California)', 'Impacts total cost of homeownership significantly'],
    keySourceTypes: ['County assessor', 'Tax Foundation', 'State revenue department'],
    commonQuestions: ['What is the property tax rate?', 'How is my home assessed?', 'Are there any exemptions?', 'How much will I pay annually?'],
    dailyLifeImpact: 'Major ongoing cost of homeownership, can be $5,000-$20,000+ annually.',
  },
  'hp_04_rent_control': {
    talkingPoints: ['Only a few states allow local rent control', 'Many states have preemption laws banning rent control', 'Rent stabilization is different from strict rent control', 'Vacancy decontrol allows market rate on turnover', 'New construction is often exempt'],
    keySourceTypes: ['State housing laws', 'Local rent board', 'National Apartment Association'],
    commonQuestions: ['Is there rent control?', 'How much can my rent increase?', 'Are there any caps on increases?'],
    dailyLifeImpact: 'Affects housing stability and predictability of rental costs.',
  },
  'hp_05_eviction_protection': {
    talkingPoints: ['Just cause eviction requirements protect tenants', 'Notice periods range from 3 days to 90+ days', 'Eviction moratoriums during emergencies', 'Right to counsel in eviction proceedings', 'Relocation assistance requirements in some cities'],
    keySourceTypes: ['State landlord-tenant law', 'Legal aid organizations', 'Eviction Lab'],
    commonQuestions: ['How much notice is required to evict?', 'What are valid reasons for eviction?', 'Do I have a right to a lawyer?'],
    dailyLifeImpact: 'Critical for housing stability and protection against displacement.',
  },
  'hp_06_zoning_restrictions': {
    talkingPoints: ['Single-family zoning limits housing density', 'Mixed-use zoning allows residential and commercial', 'Minneapolis eliminated single-family zoning citywide', 'Zoning affects what businesses can operate nearby', 'Variances and special permits allow exceptions'],
    keySourceTypes: ['City planning department', 'Zoning maps', 'Urban planning reports'],
    commonQuestions: ['What can be built in my neighborhood?', 'Can I have a home business?', 'Will apartments be built nearby?'],
    dailyLifeImpact: 'Shapes neighborhood character and housing affordability.',
  },
  'hp_07_building_permits': {
    talkingPoints: ['Permit requirements vary by project size', 'Some cities require permits for minor work', 'Wait times range from days to months', 'Unpermitted work affects resale and insurance', 'Owner-builder permits allow DIY in some areas'],
    keySourceTypes: ['City building department', 'State contractor board', 'ICC codes'],
    commonQuestions: ['What needs a permit?', 'How long does approval take?', 'Can I do the work myself?'],
    dailyLifeImpact: 'Affects ability to improve your property and associated costs/delays.',
  },
  'hp_08_short_term_rental': {
    talkingPoints: ['Many cities require registration and licensing', 'Limits on rental days per year common', 'Primary residence requirements in some areas', 'HOAs may have stricter rules than city', 'Tax collection requirements for hosts'],
    keySourceTypes: ['City short-term rental ordinance', 'Airbnb regulations page', 'HOA CC&Rs'],
    commonQuestions: ['Can I Airbnb my home?', 'Do I need a license?', 'How many days can I rent?'],
    dailyLifeImpact: 'Affects ability to earn income from property and neighborhood character.',
  },
  'hp_09_adu_laws': {
    talkingPoints: ['ADUs (granny flats) increasingly allowed by state law', 'California mandates ADU approval in most areas', 'Size limits typically 800-1200 sq ft', 'Parking requirements often waived for ADUs', 'Can provide rental income or house family members'],
    keySourceTypes: ['State ADU law', 'City planning department', 'AARP ADU model law'],
    commonQuestions: ['Can I build an ADU on my property?', 'What are the size limits?', 'Do I need additional parking?'],
    dailyLifeImpact: 'Opportunity to add housing for family or rental income.',
  },
  'hp_10_home_business': {
    talkingPoints: ['Zoning often restricts commercial activity in residential', 'Home occupation permits may be required', 'Customer traffic and signage usually restricted', 'Online businesses typically have fewer restrictions', 'Some businesses prohibited entirely in residential'],
    keySourceTypes: ['City zoning code', 'Business licensing office', 'HOA CC&Rs'],
    commonQuestions: ['Can I run a business from home?', 'Do I need a permit?', 'Can clients visit my home?'],
    dailyLifeImpact: 'Affects ability to work from home and start small businesses.',
  },
  'hp_11_eminent_domain': {
    talkingPoints: ['Government can take private property for public use', 'Kelo v. New London expanded what counts as public use', 'Many states reformed laws after Kelo backlash', 'Just compensation required but often contested', 'Process and protections vary significantly by state'],
    keySourceTypes: ['State eminent domain law', 'Institute for Justice', 'State constitution'],
    commonQuestions: ['Can the government take my property?', 'What protections do I have?', 'How is compensation determined?'],
    dailyLifeImpact: 'Affects property security and protection against government takings.',
  },
  'hp_12_squatter_rights': {
    talkingPoints: ['Adverse possession requires 5-20 years depending on state', 'Continuous, open, hostile possession required', 'Property taxes paid by squatter may accelerate claim', 'Vacant property most vulnerable', 'Quick action by owners prevents claims'],
    keySourceTypes: ['State property law', 'Legal aid', 'Real estate attorneys'],
    commonQuestions: ['How long until a squatter has rights?', 'How do I protect vacant property?', 'What if someone is squatting on my land?'],
    dailyLifeImpact: 'Affects property owners with vacant land or second homes.',
  },
  'hp_13_historic_preservation': {
    talkingPoints: ['Historic districts restrict exterior modifications', 'Approval required for changes visible from street', 'Can increase property values but limits flexibility', 'Tax credits available for approved renovations', 'Individual landmark status differs from district'],
    keySourceTypes: ['Local historic preservation office', 'State historic society', 'National Trust'],
    commonQuestions: ['Is my home in a historic district?', 'What changes need approval?', 'Are there tax benefits?'],
    dailyLifeImpact: 'Affects ability to modify your property and associated costs.',
  },
  'hp_14_foreign_ownership': {
    talkingPoints: ['Most states have no restrictions on foreign ownership', 'Agricultural land restrictions in some states', 'CFIUS reviews large acquisitions for national security', 'Some countries have reciprocity requirements', 'Financing may be harder for non-residents'],
    keySourceTypes: ['State property laws', 'CFIUS regulations', 'National Association of Realtors'],
    commonQuestions: ['Can foreigners buy property here?', 'Are there any restrictions?', 'What about agricultural land?'],
    dailyLifeImpact: 'Relevant for international buyers or sellers to foreign nationals.',
  },
  'hp_15_transfer_tax': {
    talkingPoints: ['Transfer taxes range from 0% to 4%+ of sale price', 'Some states have no transfer tax', 'Often split between buyer and seller', 'Additional city taxes in some areas', 'Mansion taxes apply to high-value properties'],
    keySourceTypes: ['State revenue department', 'County recorder', 'Title company'],
    commonQuestions: ['What is the transfer tax rate?', 'Who pays the transfer tax?', 'Are there exemptions?'],
    dailyLifeImpact: 'Significant one-time cost when buying or selling property.',
  },
  'hp_16_lawn_maintenance': {
    talkingPoints: ['Many cities require lawn maintenance', 'Weed and grass height limits common', 'Xeriscaping increasingly allowed despite old rules', 'HOAs often have stricter requirements', 'Fines can escalate and lead to liens'],
    keySourceTypes: ['City code enforcement', 'HOA CC&Rs', 'Property maintenance code'],
    commonQuestions: ['Do I have to maintain my lawn?', 'Can I have a natural yard?', 'What about xeriscaping or native plants?'],
    dailyLifeImpact: 'Affects property maintenance obligations and landscaping choices.',
  },
  'hp_17_exterior_modifications': {
    talkingPoints: ['Paint colors may require approval', 'Solar panels increasingly protected by state law', 'Satellite dish rights protected federally (OTARD)', 'Fencing, sheds, decks often need permits', 'Historic districts have strictest rules'],
    keySourceTypes: ['HOA architectural review', 'City building department', 'State solar rights laws'],
    commonQuestions: ['Do I need approval to paint my house?', 'Can I install solar panels?', 'What about a fence or shed?'],
    dailyLifeImpact: 'Affects ability to customize your property appearance.',
  },
  'hp_18_fence_regulations': {
    talkingPoints: ['Height limits typically 4ft front, 6ft back', 'Materials may be regulated (no chain link in front)', 'Setbacks required from property line in some areas', 'Pool fencing has safety requirements', 'Good neighbor fence laws share costs'],
    keySourceTypes: ['City zoning code', 'HOA CC&Rs', 'State fence laws'],
    commonQuestions: ['How tall can my fence be?', 'What materials are allowed?', 'Do I need a permit for a fence?'],
    dailyLifeImpact: 'Affects privacy options and property boundary control.',
  },
  'hp_19_parking_requirements': {
    talkingPoints: ['Minimum parking requirements being eliminated in many cities', 'On-street parking permits common in dense areas', 'RV and boat parking often restricted', 'Garage conversion rules affect parking counts', 'HOAs may limit vehicle types (no commercial)'],
    keySourceTypes: ['City zoning code', 'Parking authority', 'HOA CC&Rs'],
    commonQuestions: ['How many cars can I park?', 'Can I park my RV at home?', 'Are there street parking permits?'],
    dailyLifeImpact: 'Affects vehicle storage options and convenience.',
  },
  'hp_20_pet_restrictions': {
    talkingPoints: ['Breed-specific legislation (BSL) bans pit bulls in some areas', 'Pet limits common - typically 2-4 dogs', 'Exotic pet regulations vary widely', 'Chicken and backyard farming rules differ by city', 'HOAs may have stricter limits'],
    keySourceTypes: ['City animal control', 'HOA CC&Rs', 'State animal laws'],
    commonQuestions: ['Are there breed restrictions?', 'How many pets can I have?', 'Can I keep chickens?', 'What about exotic pets?'],
    dailyLifeImpact: 'Affects pet ownership options and types of animals you can keep.',
  },
  // ============================================================================
  // BUSINESS & WORK (25 metrics)
  // ============================================================================
  'bw_01_business_license': {
    talkingPoints: ['Most cities require general business licenses', 'Cost ranges from $50 to $500+ annually', 'Home-based businesses usually need licenses too', 'Some states have state-level business registration', 'Industry-specific licenses are additional'],
    keySourceTypes: ['City business license office', 'State Secretary of State', 'SBA'],
    commonQuestions: ['Do I need a business license?', 'How much does it cost?', 'What about online businesses?'],
    dailyLifeImpact: 'Startup cost and annual overhead for business owners.',
  },
  'bw_02_occupational_license': {
    talkingPoints: ['Over 1,000 occupations require licenses in some states', 'Cosmetologists, contractors, real estate agents need licenses', 'License reciprocity between states varies', 'Military spouse licensing reforms expanding', 'Institute for Justice ranks state licensing burden'],
    keySourceTypes: ['State licensing board', 'Institute for Justice', 'Professional associations'],
    commonQuestions: ['Does my profession need a license?', 'Will my out-of-state license transfer?', 'How long does licensing take?'],
    dailyLifeImpact: 'Affects ability to work in licensed professions and career mobility.',
  },
  'bw_03_minimum_wage': {
    talkingPoints: ['Federal minimum is $7.25, many states/cities higher', 'Seattle, NYC, California have $15-20+ minimums', 'Tipped minimum wage can be much lower', 'Small business exemptions in some areas', 'Automatic inflation adjustments in some states'],
    keySourceTypes: ['Department of Labor', 'State labor department', 'EPI'],
    commonQuestions: ['What is the minimum wage?', 'Are tips counted toward minimum?', 'Are there different rates for small businesses?'],
    dailyLifeImpact: 'Affects wages for entry-level workers and operating costs for businesses.',
  },
  'bw_04_right_to_work': {
    talkingPoints: ['27 states have right-to-work laws', 'Workers cannot be required to pay union dues', 'Affects union strength and workplace organization', 'Controversial - seen as anti-union or pro-freedom', 'Michigan repealed right-to-work in 2023'],
    keySourceTypes: ['State labor laws', 'NLRB', 'AFL-CIO', 'National Right to Work Foundation'],
    commonQuestions: ['Is this a right-to-work state?', 'Do I have to join a union?', 'Do I have to pay union dues?'],
    dailyLifeImpact: 'Affects union membership requirements and workplace dynamics.',
  },
  'bw_05_employment_protections': {
    talkingPoints: ['At-will employment is the default in most states', 'Some states have stronger wrongful termination protections', 'Protected classes vary beyond federal minimums', 'Montana is the only state without at-will employment', 'Whistleblower protections vary significantly'],
    keySourceTypes: ['State employment law', 'EEOC', 'Labor rights organizations'],
    commonQuestions: ['Can I be fired for any reason?', 'What protections do I have?', 'Are there whistleblower protections?'],
    dailyLifeImpact: 'Affects job security and protection against unfair termination.',
  },
  'bw_06_paid_leave': {
    talkingPoints: ['No federal paid sick leave requirement', 'Many states and cities require paid sick leave', 'Accrual rates typically 1 hour per 30-40 worked', 'Caps range from 3-7 days annually', 'COVID expanded temporary leave requirements'],
    keySourceTypes: ['State labor department', 'A Better Balance', 'National Partnership'],
    commonQuestions: ['Am I entitled to paid sick leave?', 'How much do I accrue?', 'Can I use it for family members?'],
    dailyLifeImpact: 'Affects ability to take time off when sick without losing income.',
  },
  'bw_07_parental_leave': {
    talkingPoints: ['FMLA provides 12 weeks unpaid for eligible workers', 'Some states have paid family leave programs', 'California, New York, New Jersey lead in paid leave', 'Small employer exemptions common', 'Paternity leave increasing but lags maternity'],
    keySourceTypes: ['Department of Labor', 'State paid leave programs', 'National Partnership'],
    commonQuestions: ['Is there paid parental leave?', 'How many weeks can I take?', 'Does it apply to fathers too?'],
    dailyLifeImpact: 'Critical for new parents balancing work and family.',
  },
  'bw_08_non_compete': {
    talkingPoints: ['California bans non-compete agreements entirely', 'FTC proposed federal ban in 2023', 'Many states limit scope and duration', 'Tech industry increasingly avoiding non-competes', 'Enforceability varies even in permissive states'],
    keySourceTypes: ['State contract law', 'FTC', 'State attorney general'],
    commonQuestions: ['Are non-competes enforceable here?', 'Can I work for a competitor?', 'What are the limits?'],
    dailyLifeImpact: 'Affects career mobility and ability to switch jobs.',
  },
  'bw_09_corporate_tax': {
    talkingPoints: ['State corporate tax rates range from 0% to 11.5%', 'Six states have no corporate income tax', 'Apportionment rules affect multistate businesses', 'Tax incentives and credits vary widely', 'Gross receipts taxes used in some states instead'],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'KPMG'],
    commonQuestions: ['What is the corporate tax rate?', 'Are there tax incentives for businesses?', 'How are multistate profits taxed?'],
    dailyLifeImpact: 'Major factor for business location decisions and operating costs.',
  },
  'bw_10_income_tax': {
    talkingPoints: ['Nine states have no state income tax', 'Top rates range up to 13.3% (California)', 'Flat vs progressive rate structures', 'Local income taxes in some cities', 'Retirement income often taxed differently'],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'IRS'],
    commonQuestions: ['Is there state income tax?', 'What are the tax brackets?', 'Are there local income taxes?'],
    dailyLifeImpact: 'Significant impact on take-home pay and retirement income.',
  },
  'bw_11_sales_tax': {
    talkingPoints: ['Five states have no state sales tax', 'Combined state and local rates can exceed 10%', 'Groceries often exempt or reduced rate', 'Online sales now taxed in most states', 'Sales tax holidays offer temporary relief'],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'Sales Tax Institute'],
    commonQuestions: ['What is the sales tax rate?', 'Are groceries taxed?', 'Are there sales tax holidays?'],
    dailyLifeImpact: 'Affects cost of everyday purchases.',
  },
  'bw_12_gig_economy': {
    talkingPoints: ['California AB5 reclassified many gig workers as employees', 'Prop 22 exempted rideshare and delivery drivers', 'Other states considering similar legislation', 'Independent contractor tests vary by state', 'Benefits and protections tied to classification'],
    keySourceTypes: ['State labor department', 'Department of Labor', 'National Employment Law Project'],
    commonQuestions: ['Am I an employee or contractor?', 'What rights do gig workers have?', 'Are rideshare drivers employees?'],
    dailyLifeImpact: 'Critical for gig economy workers and freelancers.',
  },
  'bw_13_work_visa': {
    talkingPoints: ['State policies can support or hinder visa holders', 'Some states welcome international talent', 'State universities sponsor many H-1B workers', 'Local business communities advocate for visa access', 'Immigration enforcement cooperation varies'],
    keySourceTypes: ['USCIS', 'State economic development', 'Immigration attorneys'],
    commonQuestions: ['How welcoming is this area to work visa holders?', 'Are there many H-1B employers?', 'What is the immigration climate?'],
    dailyLifeImpact: 'Relevant for international workers and employers hiring them.',
  },
  'bw_14_remote_work': {
    talkingPoints: ['State tax implications for remote workers vary', 'Convenience of employer rules in some states', 'Workers compensation coverage for remote work', 'Privacy laws may apply to remote monitoring', 'Right to disconnect laws emerging'],
    keySourceTypes: ['State revenue department', 'State labor department', 'HR policy organizations'],
    commonQuestions: ['Are there tax issues working remotely?', 'Can my employer monitor me at home?', 'What are my remote work rights?'],
    dailyLifeImpact: 'Affects remote workers and employers with distributed teams.',
  },
  'bw_15_overtime_rules': {
    talkingPoints: ['Federal FLSA requires overtime over 40 hours/week', 'Some states have daily overtime (over 8 hours)', 'California has extensive overtime protections', 'Salary thresholds for exemption vary', 'Agricultural and other exemptions common'],
    keySourceTypes: ['Department of Labor', 'State labor department', 'HR compliance resources'],
    commonQuestions: ['When do I get overtime pay?', 'Is there daily overtime?', 'Am I exempt from overtime?'],
    dailyLifeImpact: 'Affects compensation for hours worked beyond standard schedule.',
  },
  'bw_16_union_laws': {
    talkingPoints: ['NLRA governs most private sector unionization', 'Public sector union rights vary by state', 'Card check vs secret ballot elections', 'Union density highest in Northeast and Midwest', 'Recent organizing surge at Amazon, Starbucks'],
    keySourceTypes: ['NLRB', 'State labor relations board', 'Bureau of Labor Statistics'],
    commonQuestions: ['What are my rights to organize?', 'Can public employees unionize?', 'How do union elections work?'],
    dailyLifeImpact: 'Affects workplace voice and collective bargaining options.',
  },
  'bw_17_workplace_safety': {
    talkingPoints: ['OSHA sets federal standards but states can exceed', 'State OSHA plans in about half of states', 'Enforcement and inspection frequency varies', 'COVID exposed gaps in worker safety', 'Heat illness standards emerging in some states'],
    keySourceTypes: ['OSHA', 'State OSHA', 'National Council for Occupational Safety'],
    commonQuestions: ['What safety standards apply?', 'How often are workplaces inspected?', 'Can I report unsafe conditions anonymously?'],
    dailyLifeImpact: 'Affects physical safety and working conditions.',
  },
  'bw_18_anti_discrimination': {
    talkingPoints: ['Federal law covers race, sex, religion, national origin, etc.', 'Many states add sexual orientation, gender identity', 'Some states protect political affiliation, marital status', 'State agencies may be more responsive than EEOC', 'Statute of limitations varies'],
    keySourceTypes: ['EEOC', 'State civil rights agency', 'Legal aid organizations'],
    commonQuestions: ['What discrimination protections exist?', 'How do I file a complaint?', 'Are LGBTQ workers protected?'],
    dailyLifeImpact: 'Affects workplace fairness and protection from discrimination.',
  },
  'bw_19_startup_friendliness': {
    talkingPoints: ['Delaware incorporation remains popular for startups', 'State startup incentives vary widely', 'Accelerator and incubator ecosystems differ', 'Venture capital concentration in select metros', 'Regulatory sandbox programs for fintech'],
    keySourceTypes: ['State economic development', 'Kauffman Foundation', 'Startup Genome'],
    commonQuestions: ['Is this a good place to start a company?', 'Where should I incorporate?', 'Are there startup incentives?'],
    dailyLifeImpact: 'Affects entrepreneurs launching new businesses.',
  },
  'bw_20_food_truck_regs': {
    talkingPoints: ['Permit requirements and costs vary dramatically', 'Proximity restrictions near restaurants common', 'Time limits and location restrictions', 'Health inspection requirements', 'Some cities very food truck friendly, others not'],
    keySourceTypes: ['City licensing department', 'Health department', 'Food truck associations'],
    commonQuestions: ['How easy is it to operate a food truck?', 'What permits are needed?', 'Are there location restrictions?'],
    dailyLifeImpact: 'Affects food entrepreneurs and street food availability.',
  },
  'bw_21_contractor_license': {
    talkingPoints: ['Most states require contractor licensing', 'Thresholds for licensing vary ($500-$30,000+)', 'Trade-specific licenses (electrical, plumbing)', 'Testing and insurance requirements', 'Penalties for unlicensed work'],
    keySourceTypes: ['State contractor board', 'Local building department', 'Trade associations'],
    commonQuestions: ['Do contractors need licenses?', 'Can I do my own work without a license?', 'How do I verify a contractor is licensed?'],
    dailyLifeImpact: 'Affects home improvement costs and DIY options.',
  },
  'bw_22_health_insurance_mandate': {
    talkingPoints: ['Federal mandate penalty eliminated in 2019', 'Some states have individual mandates', 'Massachusetts, New Jersey, California, DC, Rhode Island', 'Penalties collected through state taxes', 'Exemptions for affordability and hardship'],
    keySourceTypes: ['State health exchange', 'State insurance department', 'Healthcare.gov'],
    commonQuestions: ['Am I required to have health insurance?', 'Is there a penalty for being uninsured?', 'What are the exemptions?'],
    dailyLifeImpact: 'Affects whether going uninsured has financial penalties.',
  },
  'bw_23_tip_credit': {
    talkingPoints: ['Federal allows $2.13 tipped minimum wage', 'Seven states require full minimum for tipped workers', 'Tip pooling rules vary', 'Service charges vs tips have different rules', 'Tip credit abuse enforcement varies'],
    keySourceTypes: ['Department of Labor', 'State labor department', 'Restaurant associations'],
    commonQuestions: ['What is the tipped minimum wage?', 'Can employers take tip credit?', 'How does tip pooling work?'],
    dailyLifeImpact: 'Critical for restaurant and hospitality workers.',
  },
  'bw_24_banking_access': {
    talkingPoints: ['Chexsystems affects account access for past issues', 'Public banking initiatives emerging', 'Credit union availability varies', 'Cannabis industry banking restrictions', 'Immigrant banking access varies'],
    keySourceTypes: ['FDIC', 'State banking department', 'National Credit Union Administration'],
    commonQuestions: ['Can I get a bank account with past issues?', 'Are there good credit union options?', 'What about banking for cannabis businesses?'],
    dailyLifeImpact: 'Affects access to basic financial services.',
  },
  'bw_25_crypto_regulations': {
    talkingPoints: ['Money transmitter licenses required in most states', 'Wyoming leads in crypto-friendly legislation', 'New York BitLicense is most restrictive', 'SEC vs CFTC jurisdiction still evolving', 'State taxation of crypto gains varies'],
    keySourceTypes: ['State financial regulator', 'SEC', 'State attorney general'],
    commonQuestions: ['How is crypto regulated here?', 'Do I need special licenses?', 'How are crypto gains taxed?'],
    dailyLifeImpact: 'Affects crypto investors and businesses.',
  },
  // ============================================================================
  // TRANSPORTATION (15 metrics)
  // ============================================================================
  'tr_01_public_transit': {
    talkingPoints: ['Quality varies from world-class to nonexistent', 'Heavy rail, light rail, bus rapid transit options', 'Coverage area and frequency matter most', 'Last-mile connectivity affects usability', 'Funding mechanisms affect service stability'],
    keySourceTypes: ['Transit agency', 'American Public Transportation Association', 'Transit scores'],
    commonQuestions: ['How good is public transit?', 'Can I get around without a car?', 'How often do buses/trains run?'],
    dailyLifeImpact: 'Determines whether car-free living is practical.',
  },
  'tr_02_walkability': {
    talkingPoints: ['Walk Score provides standardized measure', 'Sidewalk coverage and maintenance varies', 'Pedestrian infrastructure investments differ', 'Climate affects year-round walkability', 'Safety and lighting matter for walking'],
    keySourceTypes: ['Walk Score', 'City pedestrian master plan', 'Transportation department'],
    commonQuestions: ['How walkable is this area?', 'Are there good sidewalks?', 'Is it safe to walk at night?'],
    dailyLifeImpact: 'Affects daily errands and health through walking.',
  },
  'tr_03_bike_infrastructure': {
    talkingPoints: ['Protected bike lanes safest option', 'Bike share programs increase accessibility', 'E-bike infrastructure expanding rapidly', 'Bike parking and theft prevention', 'Climate and terrain affect bikeability'],
    keySourceTypes: ['Bike Score', 'City bike master plan', 'League of American Bicyclists'],
    commonQuestions: ['How bike-friendly is this city?', 'Are there protected bike lanes?', 'Is there bike share?'],
    dailyLifeImpact: 'Affects commuting and recreation options.',
  },
  'tr_04_car_dependency': {
    talkingPoints: ['Many US metros require cars for basic life', 'Jobs-housing mismatch increases car need', 'Sprawl development patterns require driving', 'Parking minimums perpetuate car dependency', 'One-car or car-free households save significantly'],
    keySourceTypes: ['Census commuting data', 'Transportation surveys', 'Urban planning studies'],
    commonQuestions: ['Do I need a car to live here?', 'Can I get by with one car for a family?', 'How do most people commute?'],
    dailyLifeImpact: 'Major cost and lifestyle factor.',
  },
  'tr_05_rideshare_regs': {
    talkingPoints: ['Uber/Lyft operate in most metros now', 'Airport and downtown pickup rules vary', 'Surge pricing regulations in some cities', 'Driver requirements and background checks', 'Competition affects pricing and availability'],
    keySourceTypes: ['City transportation department', 'State public utilities commission', 'Rideshare companies'],
    commonQuestions: ['Is Uber/Lyft available?', 'Can I get picked up at the airport?', 'How reliable is rideshare here?'],
    dailyLifeImpact: 'Affects transportation options without car ownership.',
  },
  'tr_06_speed_limits': {
    talkingPoints: ['Speed limits range from 25 mph to 85 mph on highways', 'Vision Zero initiatives lowering urban speeds', 'Speed tolerances vary by jurisdiction', 'School zones have strict enforcement', 'Rural vs urban speed limit differences'],
    keySourceTypes: ['State DOT', 'IIHS', 'Local traffic code'],
    commonQuestions: ['What are typical speed limits?', 'How strictly enforced are they?', 'Are there speed cameras?'],
    dailyLifeImpact: 'Affects commute times and ticket risk.',
  },
  'tr_07_traffic_cameras': {
    talkingPoints: ['Red light cameras in many cities, banned in some states', 'Speed cameras less common, controversial', 'Privacy concerns vs safety arguments', 'Camera revenue motivations debated', 'Ticket processing and appeals vary'],
    keySourceTypes: ['City traffic department', 'IIHS', 'State camera laws'],
    commonQuestions: ['Are there red light cameras?', 'Are there speed cameras?', 'How do I contest a camera ticket?'],
    dailyLifeImpact: 'Affects driving behavior and ticket exposure.',
  },
  'tr_08_parking_regulations': {
    talkingPoints: ['Street parking rules vary by zone', 'Parking meter rates range widely', 'Residential permit parking protects neighborhoods', 'Garage parking expensive in dense areas', 'Parking apps help find and pay for parking'],
    keySourceTypes: ['City parking authority', 'Parking apps', 'Local parking regulations'],
    commonQuestions: ['How hard is it to find parking?', 'How much does parking cost?', 'Are there resident parking permits?'],
    dailyLifeImpact: 'Daily frustration factor for drivers.',
  },
  'tr_09_toll_roads': {
    talkingPoints: ['Toll roads common in some regions, rare in others', 'Express lanes/HOT lanes use dynamic pricing', 'Electronic tolling (EZ Pass, etc.) standard', 'Toll costs can add up significantly', 'Public-private partnerships controversial'],
    keySourceTypes: ['State DOT', 'Toll authority', 'IBTTA'],
    commonQuestions: ['Are there toll roads?', 'How much do tolls cost?', 'Do I need a transponder?'],
    dailyLifeImpact: 'Affects commute costs and route choices.',
  },
  'tr_10_vehicle_inspection': {
    talkingPoints: ['Safety inspections required in about 15 states', 'Emissions testing required in many metros', 'Inspection frequency typically annual', 'Costs range from free to $100+', 'Waiver processes for older/low-income vehicles'],
    keySourceTypes: ['State DMV', 'Environmental agency', 'Car Care Council'],
    commonQuestions: ['Do I need an inspection?', 'How often?', 'What does it cost?'],
    dailyLifeImpact: 'Recurring vehicle ownership requirement.',
  },
  'tr_11_license_requirements': {
    talkingPoints: ['Standard vs Real ID requirements', 'Undocumented immigrant license access varies', 'Teen licensing graduated programs differ', 'Senior license renewal requirements', 'Out-of-state license transfer processes'],
    keySourceTypes: ['State DMV', 'AAA', 'AAMVA'],
    commonQuestions: ['What do I need to get a license?', 'How do I transfer my license?', 'Are there special requirements for new drivers?'],
    dailyLifeImpact: 'Barrier to entry for driving.',
  },
  'tr_12_dui_laws': {
    talkingPoints: ['BAC limit 0.08 nationally, some states stricter', 'Zero tolerance for under-21 drivers', 'First offense consequences vary widely', 'Ignition interlock requirements expanding', 'DUI checkpoints legal in most states'],
    keySourceTypes: ['State DMV', 'MADD', 'State traffic safety office'],
    commonQuestions: ['What is the BAC limit?', 'What are the penalties for DUI?', 'Are there DUI checkpoints?'],
    dailyLifeImpact: 'Critical for anyone who drinks and drives.',
  },
  'tr_13_electric_vehicles': {
    talkingPoints: ['EV incentives vary by state', 'Charging infrastructure improving rapidly', 'E-bike regulations differ from regular bikes', 'Electric scooter rules vary widely', 'HOV lane access for EVs in some states'],
    keySourceTypes: ['State energy office', 'PlugShare', 'DOE Alternative Fuels Data Center'],
    commonQuestions: ['Are there EV incentives?', 'How is the charging infrastructure?', 'Where can I ride an e-bike?'],
    dailyLifeImpact: 'Affects EV adoption practicality.',
  },
  'tr_14_airport_access': {
    talkingPoints: ['Distance to major airport varies widely', 'Public transit connections to airport matter', 'Regional airports offer alternatives', 'Airport traffic and parking considerations', 'Direct flight availability key for travelers'],
    keySourceTypes: ['Airport website', 'Transit agency', 'Flight search tools'],
    commonQuestions: ['How far is the airport?', 'Can I take public transit to the airport?', 'What destinations have direct flights?'],
    dailyLifeImpact: 'Important for frequent travelers.',
  },
  'tr_15_traffic_congestion': {
    talkingPoints: ['Commute times vary dramatically by metro', 'Peak hour delays quantified by INRIX', 'Work from home reducing some congestion', 'Congestion pricing emerging in some cities', 'Infrastructure investments aim to reduce delays'],
    keySourceTypes: ['INRIX', 'Texas A&M Urban Mobility Report', 'Google Maps traffic'],
    commonQuestions: ['How bad is traffic?', 'What are typical commute times?', 'When is rush hour?'],
    dailyLifeImpact: 'Daily time and stress factor.',
  },
  // ============================================================================
  // POLICING & LEGAL (15 metrics)
  // ============================================================================
  'pl_01_incarceration_rate': {
    talkingPoints: ['US has highest incarceration rate globally', 'Rates vary 3x+ between states', 'Racial disparities significant in all states', 'Prison population declining from peak', 'Pre-trial detention drives much incarceration'],
    keySourceTypes: ['Prison Policy Initiative', 'Bureau of Justice Statistics', 'Vera Institute'],
    commonQuestions: ['What is the incarceration rate?', 'How does it compare to other states?', 'Are there racial disparities?'],
    dailyLifeImpact: 'Reflects criminal justice system harshness.',
  },
  'pl_02_police_per_capita': {
    talkingPoints: ['Police staffing varies from 1 to 6+ per 1000', 'Higher numbers dont always mean more safety', 'Community policing vs enforcement models differ', 'Funding debates ongoing post-2020', 'Sheriff vs police department jurisdictions'],
    keySourceTypes: ['FBI UCR data', 'Police department', 'Bureau of Justice Statistics'],
    commonQuestions: ['How many police officers are there?', 'What is the police approach to community?', 'How quick is police response?'],
    dailyLifeImpact: 'Affects police presence and response times.',
  },
  'pl_03_civil_forfeiture': {
    talkingPoints: ['Police can seize property without conviction', 'Some states require criminal conviction', 'Federal equitable sharing bypasses state limits', 'Burden of proof varies significantly', 'Institute for Justice grades state policies'],
    keySourceTypes: ['Institute for Justice', 'State forfeiture laws', 'ACLU'],
    commonQuestions: ['Can police seize my property without charges?', 'How do I get seized property back?', 'What protections exist?'],
    dailyLifeImpact: 'Risk of property loss without due process.',
  },
  'pl_04_mandatory_minimums': {
    talkingPoints: ['Mandatory minimums remove judicial discretion', 'Drug offenses often have harsh minimums', 'Three strikes laws in some states', 'Reform efforts reducing some minimums', 'Federal vs state minimum differences'],
    keySourceTypes: ['Families Against Mandatory Minimums', 'State sentencing commission', 'Sentencing Project'],
    commonQuestions: ['Are there mandatory minimum sentences?', 'What crimes have mandatories?', 'Is there judicial discretion?'],
    dailyLifeImpact: 'Affects potential consequences of criminal charges.',
  },
  'pl_05_bail_system': {
    talkingPoints: ['Cash bail keeps poor people in jail pre-trial', 'Some jurisdictions eliminated cash bail', 'Risk assessment tools increasingly used', 'Bail reform efforts ongoing nationwide', 'Bail bond industry opposes reform'],
    keySourceTypes: ['Bail Project', 'Pretrial Justice Institute', 'State court rules'],
    commonQuestions: ['How does bail work here?', 'Can I be held without bail?', 'Are there bail reform efforts?'],
    dailyLifeImpact: 'Affects pre-trial freedom and economic burden.',
  },
  'pl_06_police_oversight': {
    talkingPoints: ['Civilian oversight boards vary in power', 'Subpoena power for investigations important', 'Police union contracts limit oversight', 'Body camera policies and access vary', 'Transparency in misconduct records differs'],
    keySourceTypes: ['NACOLE', 'State POST commission', 'ACLU'],
    commonQuestions: ['Is there civilian oversight of police?', 'Can I access misconduct records?', 'Are body cameras required?'],
    dailyLifeImpact: 'Affects police accountability.',
  },
  'pl_07_qualified_immunity': {
    talkingPoints: ['Federal doctrine protects officers from lawsuits', 'Some states have limited qualified immunity', 'Colorado first state to restrict in 2020', 'Reform efforts ongoing in Congress', 'Affects ability to sue for civil rights violations'],
    keySourceTypes: ['Institute for Justice', 'State civil rights laws', 'ACLU'],
    commonQuestions: ['What is qualified immunity?', 'Can I sue police for misconduct?', 'Has the state limited qualified immunity?'],
    dailyLifeImpact: 'Affects ability to seek justice for police misconduct.',
  },
  'pl_08_legal_costs': {
    talkingPoints: ['Public defender caseloads often excessive', 'Private attorney costs vary by region', 'Court fees and fines add up', 'Civil legal aid availability varies', 'Debt from legal system common'],
    keySourceTypes: ['State bar association', 'Legal aid organizations', 'Brennan Center'],
    commonQuestions: ['How much do lawyers cost?', 'Is there good public defense?', 'What court fees apply?'],
    dailyLifeImpact: 'Affects access to justice.',
  },
  'pl_09_court_efficiency': {
    talkingPoints: ['Case backlogs vary dramatically', 'COVID increased backlogs in many courts', 'Online court options expanding', 'Small claims court thresholds differ', 'Alternative dispute resolution availability'],
    keySourceTypes: ['State court system', 'National Center for State Courts', 'Court statistics'],
    commonQuestions: ['How long do cases take?', 'Are there big backlogs?', 'Can I handle matters online?'],
    dailyLifeImpact: 'Affects time to resolve legal matters.',
  },
  'pl_10_jury_rights': {
    talkingPoints: ['Jury nullification is legal but judges dont inform', 'Fully informed jury movements advocate awareness', 'Jury selection processes vary', 'Jury compensation typically minimal', 'Juror privacy protections differ'],
    keySourceTypes: ['FIJA', 'State court rules', 'Bar association'],
    commonQuestions: ['Can juries nullify bad laws?', 'How are jurors selected?', 'What is jury compensation?'],
    dailyLifeImpact: 'Affects jury service and trial outcomes.',
  },
  'pl_11_surveillance': {
    talkingPoints: ['Facial recognition bans in some cities', 'License plate readers widespread', 'Social media monitoring by police varies', 'Stingray/cell site simulator use', 'Transparency in surveillance spending differs'],
    keySourceTypes: ['EFF', 'ACLU surveillance map', 'State privacy laws'],
    commonQuestions: ['Does police use facial recognition?', 'Is there surveillance transparency?', 'What are my privacy rights?'],
    dailyLifeImpact: 'Affects privacy in public spaces.',
  },
  'pl_12_search_seizure': {
    talkingPoints: ['Fourth Amendment provides federal baseline', 'Some state constitutions provide more protection', 'Vehicle search rules vary', 'Digital privacy protections emerging', 'No-knock warrant policies differ'],
    keySourceTypes: ['State constitution', 'ACLU', 'State court decisions'],
    commonQuestions: ['What are my search and seizure rights?', 'Can police search my car?', 'What about digital devices?'],
    dailyLifeImpact: 'Affects protection from unreasonable searches.',
  },
  'pl_13_death_penalty': {
    talkingPoints: ['27 states have death penalty on books', 'Many have moratoriums or no executions', 'California has most death row inmates', 'Federal death penalty separately administered', 'Methods vary: injection, electrocution, etc.'],
    keySourceTypes: ['Death Penalty Information Center', 'State corrections', 'ACLU'],
    commonQuestions: ['Is there a death penalty?', 'When was the last execution?', 'Are there moratoriums?'],
    dailyLifeImpact: 'Reflects criminal justice philosophy.',
  },
  'pl_14_prison_conditions': {
    talkingPoints: ['Overcrowding common in many systems', 'Private prisons operate in many states', 'Healthcare quality varies significantly', 'Solitary confinement practices differ', 'Visitation and communication policies vary'],
    keySourceTypes: ['Prison Policy Initiative', 'State DOC', 'ACLU'],
    commonQuestions: ['What are prison conditions like?', 'Are there private prisons?', 'What is healthcare like in prison?'],
    dailyLifeImpact: 'Relevant for those with incarcerated loved ones.',
  },
  'pl_15_expungement': {
    talkingPoints: ['Expungement and sealing eligibility varies widely', 'Automatic expungement emerging in some states', 'Clean slate laws gaining momentum', 'Waiting periods differ significantly', 'Costs and complexity of process vary'],
    keySourceTypes: ['State criminal law', 'Clean Slate Initiative', 'Legal aid'],
    commonQuestions: ['Can I get my record expunged?', 'Is it automatic or do I have to apply?', 'How long do I have to wait?'],
    dailyLifeImpact: 'Critical for those with criminal records seeking fresh start.',
  },
  // ============================================================================
  // SPEECH & LIFESTYLE (10 metrics)
  // ============================================================================
  'sl_01_free_speech': {
    talkingPoints: ['First Amendment provides strong baseline', 'State constitutions may add protections', 'Campus free speech policies vary', 'Anti-SLAPP laws protect against harassment lawsuits', 'Public forum access rules differ'],
    keySourceTypes: ['FIRE', 'ACLU', 'State constitution'],
    commonQuestions: ['What are the free speech protections?', 'Are there anti-SLAPP laws?', 'What about campus speech?'],
    dailyLifeImpact: 'Affects ability to speak freely without legal risk.',
  },
  'sl_02_press_freedom': {
    talkingPoints: ['Shield laws protect journalist sources in most states', 'Public records access varies significantly', 'Press access to government meetings differs', 'Journalist safety and harassment concerns', 'Local news deserts affecting coverage'],
    keySourceTypes: ['Reporters Committee', 'SPJ', 'State press association'],
    commonQuestions: ['Are journalist sources protected?', 'How good is public records access?', 'Can I attend government meetings?'],
    dailyLifeImpact: 'Affects quality of local journalism and government transparency.',
  },
  'sl_03_internet_freedom': {
    talkingPoints: ['Net neutrality rules vary after federal repeal', 'Some states enacted their own net neutrality', 'Municipal broadband bans in some states', 'Rural broadband access issues', 'Privacy in ISP data collection'],
    keySourceTypes: ['State broadband office', 'EFF', 'FCC'],
    commonQuestions: ['Is there net neutrality?', 'Can I get municipal broadband?', 'How is rural internet access?'],
    dailyLifeImpact: 'Affects internet access and online privacy.',
  },
  'sl_04_hate_speech_laws': {
    talkingPoints: ['US has minimal hate speech restrictions', 'True threats and incitement not protected', 'Hate crime enhancements for bias-motivated crimes', 'Campus speech codes vary', 'Social media moderation is private action'],
    keySourceTypes: ['ACLU', 'State hate crime laws', 'ADL'],
    commonQuestions: ['Is hate speech illegal?', 'What are hate crime laws?', 'How is bias-motivated crime prosecuted?'],
    dailyLifeImpact: 'Affects consequences for discriminatory speech and actions.',
  },
  'sl_05_protest_rights': {
    talkingPoints: ['Permit requirements for protests vary', 'Anti-protest laws enacted in some states', 'Police response to protests differs', 'Civil disobedience consequences vary', 'Counter-protest management'],
    keySourceTypes: ['ACLU', 'State protest laws', 'ICNL'],
    commonQuestions: ['Do I need a permit to protest?', 'What are the rules for demonstrations?', 'Are there anti-protest laws?'],
    dailyLifeImpact: 'Affects ability to participate in civic demonstrations.',
  },
  'sl_06_religious_freedom': {
    talkingPoints: ['First Amendment protects free exercise', 'State RFRAs provide additional protections', 'Religious exemptions from general laws vary', 'Workplace religious accommodation', 'School prayer and religious clubs rules'],
    keySourceTypes: ['State RFRA', 'Becket Fund', 'ACLU'],
    commonQuestions: ['What religious freedom protections exist?', 'Are there religious exemptions from laws?', 'What about workplace accommodation?'],
    dailyLifeImpact: 'Affects religious practice and exemptions.',
  },
  'sl_07_privacy_laws': {
    talkingPoints: ['California CCPA/CPRA leads nation', 'Growing number of states with privacy laws', 'No comprehensive federal privacy law yet', 'Data broker regulations emerging', 'Biometric privacy laws in some states'],
    keySourceTypes: ['State privacy law', 'IAPP', 'EFF'],
    commonQuestions: ['What data privacy rights do I have?', 'Can I opt out of data collection?', 'Are there biometric protections?'],
    dailyLifeImpact: 'Affects control over personal data.',
  },
  'sl_08_dress_codes': {
    talkingPoints: ['Public nudity laws vary by locality', 'Beach and pool dress standards differ', 'Religious dress protections', 'School dress codes vary', 'Workplace dress code limitations'],
    keySourceTypes: ['Local ordinances', 'State civil rights law', 'ACLU'],
    commonQuestions: ['What are public dress requirements?', 'Are there nude beaches?', 'What about religious dress protections?'],
    dailyLifeImpact: 'Affects personal expression through dress.',
  },
  'sl_09_cultural_tolerance': {
    talkingPoints: ['Diversity varies significantly by region', 'Immigration and international population presence', 'Hate crime rates and reporting', 'LGBTQ+ acceptance indicators', 'Religious diversity and acceptance'],
    keySourceTypes: ['Census data', 'Pew Research', 'HRC', 'ADL'],
    commonQuestions: ['How diverse is this area?', 'How accepting is the community?', 'What is the hate crime rate?'],
    dailyLifeImpact: 'Affects sense of belonging and safety.',
  },
  'sl_10_defamation_laws': {
    talkingPoints: ['Defamation requires false statement of fact', 'Public figures face higher standards', 'Anti-SLAPP laws deter frivolous suits', 'Online defamation increasingly common', 'Truth is absolute defense'],
    keySourceTypes: ['State defamation law', 'Anti-SLAPP statutes', 'Media law resources'],
    commonQuestions: ['What are the defamation standards?', 'Are there anti-SLAPP protections?', 'Can I be sued for online reviews?'],
    dailyLifeImpact: 'Affects risk when speaking about others.',
  },
};

/**
 * Get knowledge for a metric ID
 */
function getMetricKnowledge(metricId: string): MetricKnowledge | undefined {
  return METRIC_KNOWLEDGE[metricId];
}

// ============================================================================
// CONTEXT BUILDER FUNCTIONS
// ============================================================================

/**
 * Check if result is enhanced (multi-LLM) format
 */
function isEnhancedResult(result: any): boolean {
  return 'llmsUsed' in result && Array.isArray(result.llmsUsed);
}

/**
 * Build context from standard ComparisonResult
 */
function buildStandardContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageScore > city2Cat.averageScore ? 'city1' :
                   city2Cat.averageScore > cat.averageScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference
    const metricDiffs = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.normalizedScore - (city2Cat.metrics[mIdx]?.normalizedScore || 0))
    }));
    metricDiffs.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricDiffs.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricName || md.metric.metricId,
      city1Score: Math.round(md.metric.normalizedScore),
      city2Score: Math.round(md.city2Metric?.normalizedScore || 0),
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageScore),
      city2Score: Math.round(city2Cat.averageScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from all metrics
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city1.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });
  city2.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city2.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });

  // Get ALL metrics with display names (sorted by score difference)
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: getMetricDisplayName(m.metricId),
        city1Score: Math.round(m.normalizedScore),
        city2Score: Math.round(city2Metric?.normalizedScore || 0),
        diff: Math.abs(m.normalizedScore - (city2Metric?.normalizedScore || 0)),
        category: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  // Include ALL metrics, not just top 10
  const topMetrics = allMetricDiffs;

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalScore),
        normalizedScore: Math.round(city1.normalizedScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalScore),
        normalizedScore: Math.round(city2.normalizedScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 50), // Expanded to 50 for richer context
    stats: {
      metricsEvaluated: allMetricDiffs.length,
      totalProcessingTimeMs: 0,
    },
  };
}

/**
 * Build context from EnhancedComparisonResult (multi-LLM)
 */
function buildEnhancedContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries with consensus data
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageConsensusScore > city2Cat.averageConsensusScore ? 'city1' :
                   city2Cat.averageConsensusScore > cat.averageConsensusScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference or disagreement
    const metricData = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.consensusScore - (city2Cat.metrics[mIdx]?.consensusScore || 0)),
      stdDev: m.standardDeviation || 0,
    }));
    metricData.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricData.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricId, // Will be formatted by client
      city1Score: Math.round(md.metric.consensusScore),
      city2Score: Math.round(md.city2Metric?.consensusScore || 0),
      consensusLevel: md.metric.confidenceLevel,
      judgeExplanation: md.metric.judgeExplanation,
      legalScore: md.metric.legalScore,
      enforcementScore: md.metric.enforcementScore,
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageConsensusScore),
      city2Score: Math.round(city2Cat.averageConsensusScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from LLM scores
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.llmScores) {
        metric.llmScores.forEach((llmScore: any) => {
          if (llmScore.evidence && llmScore.evidence.length > 0) {
            evidence.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: city1.city,
              sources: llmScore.evidence.map((e: any) => ({
                url: e.url,
                title: e.title,
                snippet: e.snippet,
              })),
            });
          }
        });
      }
    });
  });

  // Get top disagreements
  const topDisagreements: any[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((m: any) => {
      if (m.standardDeviation && m.standardDeviation > 10) {
        topDisagreements.push({
          metricName: m.metricId,
          standardDeviation: m.standardDeviation,
          explanation: m.judgeExplanation || 'LLMs disagreed on this metric.',
        });
      }
    });
  });
  topDisagreements.sort((a, b) => b.standardDeviation - a.standardDeviation);

  // Get ALL metrics with display names (sorted by score difference)
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: getMetricDisplayName(m.metricId),
        city1Score: Math.round(m.consensusScore),
        city2Score: Math.round(city2Metric?.consensusScore || 0),
        consensusLevel: m.confidenceLevel,
        judgeExplanation: m.judgeExplanation,
        diff: Math.abs(m.consensusScore - (city2Metric?.consensusScore || 0)),
        category: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  // Include ALL metrics, not just top 10
  const topMetrics = allMetricDiffs;

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalConsensusScore),
        normalizedScore: Math.round(city1.totalConsensusScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalConsensusScore),
        normalizedScore: Math.round(city2.totalConsensusScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 50), // Expanded to 50 for richer context
    consensus: {
      llmsUsed: result.llmsUsed || [],
      judgeModel: result.judgeModel || 'claude-opus',
      overallConfidence: result.overallConsensusConfidence || 'medium',
      disagreementSummary: result.disagreementSummary,
      topDisagreements: topDisagreements.slice(0, 5),
    },
    stats: {
      metricsEvaluated: result.processingStats?.metricsEvaluated || allMetricDiffs.length,
      totalProcessingTimeMs: result.processingStats?.totalTimeMs || 0,
    },
  };
}

/**
 * Estimate token count for context
 */
function estimateTokens(context: LifeScoreContext): number {
  const json = JSON.stringify(context);
  // Rough estimate: ~4 characters per token
  return Math.ceil(json.length / 4);
}

/**
 * Truncate context if too large
 */
function truncateContext(context: LifeScoreContext, maxTokens: number): LifeScoreContext {
  let tokens = estimateTokens(context);

  if (tokens <= maxTokens) {
    return context;
  }

  // Progressively reduce data
  const truncated = { ...context };

  // First: reduce evidence
  if (truncated.evidence.length > 10) {
    truncated.evidence = truncated.evidence.slice(0, 10);
    tokens = estimateTokens(truncated);
    if (tokens <= maxTokens) return truncated;
  }

  // Second: reduce top metrics per category
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.slice(0, 2),
  }));
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Third: reduce overall top metrics
  truncated.topMetrics = truncated.topMetrics.slice(0, 5);
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Fourth: remove judge explanations
  truncated.topMetrics = truncated.topMetrics.map(m => ({
    ...m,
    judgeExplanation: undefined,
  }));
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.map(m => ({
      ...m,
      judgeExplanation: undefined,
    })),
  }));

  // Fifth: clear evidence entirely
  truncated.evidence = [];

  return truncated;
}

// ============================================================================
// TEXT SUMMARY GENERATOR
// ============================================================================

/**
 * Generate a human-readable text summary for Olivia's context
 */
function generateTextSummary(context: LifeScoreContext): string {
  const { comparison, categories, topMetrics } = context;
  const city1 = comparison.city1.name;
  const city2 = comparison.city2.name;

  let summary = `# LIFE SCORE Comparison Report\n\n`;
  summary += `## ${city1} vs ${city2}\n\n`;
  summary += `**Overall Winner:** ${comparison.winner} (by ${comparison.scoreDifference} points)\n`;
  summary += `**${city1}:** ${comparison.city1.normalizedScore}/100\n`;
  summary += `**${city2}:** ${comparison.city2.normalizedScore}/100\n\n`;

  // Executive Summary (narrative for Olivia to reference when discussing "the report")
  const city1CatWins = categories.filter(c => c.winner === 'city1').length;
  const city2CatWins = categories.filter(c => c.winner === 'city2').length;
  const sortedDiffs = [...topMetrics].sort((a, b) => (b.diff || 0) - (a.diff || 0));
  const biggestWinMetrics = sortedDiffs.slice(0, 3);
  const closeMetrics = sortedDiffs.filter(m => (m.diff || 0) < 5).slice(0, 3);

  summary += `## Executive Summary\n\n`;
  summary += `This LIFE SCORE (Legal Independence & Freedom Evaluation) comparison analyzed 100 legal freedom metrics across 6 categories to determine which city offers more personal and economic freedom.\n\n`;
  summary += `**Key Finding:** ${comparison.winner} emerges as the winner with a total score of ${comparison.winner === city1 ? comparison.city1.normalizedScore : comparison.city2.normalizedScore}/100, beating ${comparison.winner === city1 ? city2 : city1} by ${comparison.scoreDifference} points.\n\n`;
  summary += `**Category Wins:** ${city1} won ${city1CatWins} categories, ${city2} won ${city2CatWins} categories.\n\n`;

  if (biggestWinMetrics.length > 0) {
    summary += `**Biggest Differences:**\n`;
    biggestWinMetrics.forEach(m => {
      const winner = m.city1Score > m.city2Score ? city1 : city2;
      summary += `- ${m.name}: ${winner} scores ${Math.abs(m.city1Score - m.city2Score)} points higher\n`;
    });
    summary += `\n`;
  }

  if (closeMetrics.length > 0) {
    summary += `**Areas Where Cities Are Similar:** ${closeMetrics.map(m => m.name).join(', ')}\n\n`;
  }

  summary += `**What This Means:** If you value personal freedom, property rights, and low regulatory burden, ${comparison.winner} offers more legal freedom for everyday life decisions. However, the specific areas that matter most to you should guide your final decision.\n\n`;

  // Category Breakdown
  summary += `## Category Breakdown\n\n`;
  categories.forEach(cat => {
    const catWinner = cat.winner === 'city1' ? city1 : cat.winner === 'city2' ? city2 : 'Tie';
    summary += `### ${cat.name}\n`;
    summary += `- ${city1}: ${cat.city1Score}/100\n`;
    summary += `- ${city2}: ${cat.city2Score}/100\n`;
    summary += `- Winner: ${catWinner}\n\n`;
  });

  // All Metrics (grouped by category)
  summary += `## All 100 Metrics Detail\n\n`;

  // Group metrics by category
  const metricsByCategory: Record<string, typeof topMetrics> = {};
  topMetrics.forEach(m => {
    const cat = m.category || 'Other';
    if (!metricsByCategory[cat]) metricsByCategory[cat] = [];
    metricsByCategory[cat].push(m);
  });

  Object.entries(metricsByCategory).forEach(([catName, metrics]) => {
    summary += `### ${catName}\n`;
    summary += `| Metric | ${city1} | ${city2} | Diff |\n`;
    summary += `|--------|---------|---------|------|\n`;
    metrics.forEach(m => {
      const diff = m.city1Score - m.city2Score;
      const diffStr = diff > 0 ? `+${diff}` : diff.toString();
      summary += `| ${m.name} | ${m.city1Score} | ${m.city2Score} | ${diffStr} |\n`;
    });
    summary += `\n`;
  });

  // Top 10 Biggest Differences (for quick reference)
  summary += `## Top 10 Biggest Differences\n\n`;
  const sortedByDiff = [...topMetrics].sort((a, b) => (b.diff || 0) - (a.diff || 0)).slice(0, 10);
  sortedByDiff.forEach((m, i) => {
    const better = m.city1Score > m.city2Score ? city1 : city2;
    const diff = Math.abs(m.city1Score - m.city2Score);
    summary += `${i + 1}. **${m.name}**: ${better} wins by ${diff} points (${m.city1Score} vs ${m.city2Score})\n`;
  });

  // Deep-Dive Knowledge for Top Differences (helps Olivia discuss specifics)
  // UPDATED 2026-01-25: Now uses full 100-metric knowledge base
  summary += `\n## Deep-Dive: What These Differences Mean\n\n`;
  summary += `Here is detailed knowledge about the most significant differences:\n\n`;
  sortedByDiff.forEach((m) => {
    const knowledge = getMetricKnowledge(m.id);
    if (knowledge) {
      summary += `### ${m.name}\n`;
      summary += `**Daily Life Impact:** ${knowledge.dailyLifeImpact || 'Affects daily life in this location.'}\n\n`;
      summary += `**Key Talking Points:**\n`;
      knowledge.talkingPoints.forEach(point => {
        summary += `- ${point}\n`;
      });
      summary += `\n**Common Questions Users Ask:**\n`;
      knowledge.commonQuestions.forEach(q => {
        summary += `- ${q}\n`;
      });
      summary += `\n**Key Sources:** ${knowledge.keySourceTypes.join(', ')}\n\n`;
    }
  });

  // Consensus info if available
  if (context.consensus) {
    summary += `\n## AI Consensus Information\n\n`;
    summary += `- LLMs Used: ${context.consensus.llmsUsed.join(', ')}\n`;
    summary += `- Judge Model: ${context.consensus.judgeModel}\n`;
    summary += `- Confidence: ${context.consensus.overallConfidence}\n`;

    if (context.consensus.topDisagreements.length > 0) {
      summary += `\n### Areas of LLM Disagreement\n`;
      context.consensus.topDisagreements.forEach(d => {
        summary += `- ${d.metricName}: StdDev ${d.standardDeviation.toFixed(1)} - ${d.explanation}\n`;
      });
    }
  }

  // Evidence and Sources with actual quotes
  if (context.evidence && context.evidence.length > 0) {
    summary += `\n## Source Evidence & Quotes\n\n`;
    summary += `The following evidence was gathered from web research:\n\n`;

    // Group evidence by metric for better organization
    const evidenceByMetric: Record<string, typeof context.evidence> = {};
    context.evidence.forEach(e => {
      const key = `${e.metricName} (${e.city})`;
      if (!evidenceByMetric[key]) evidenceByMetric[key] = [];
      evidenceByMetric[key].push(e);
    });

    Object.entries(evidenceByMetric).forEach(([metricKey, evidenceItems]) => {
      summary += `### ${metricKey}\n`;
      evidenceItems.forEach(e => {
        e.sources.forEach(s => {
          if (s.title) {
            summary += `- **${s.title}**\n`;
          }
          if (s.snippet) {
            summary += `  > "${s.snippet}"\n`;
          }
          summary += `  Source: ${s.url}\n\n`;
        });
      });
    });
  }

  return summary;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - open for context
  if (handleCors(req, res, 'open')) return;

  // Rate limiting - standard preset for context
  if (!applyRateLimit(req.headers, 'olivia-context', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { comparisonResult, includeEvidence = true, maxTokens = 16000 } = req.body || {};

    if (!comparisonResult) {
      res.status(400).json({ error: 'comparisonResult is required' });
      return;
    }

    // Build context based on result type
    let context: LifeScoreContext;
    if (isEnhancedResult(comparisonResult)) {
      context = buildEnhancedContext(comparisonResult);
    } else {
      context = buildStandardContext(comparisonResult);
    }

    // Remove evidence if not requested
    if (!includeEvidence) {
      context.evidence = [];
    }

    // Generate text summary for Olivia to reference
    const textSummary = generateTextSummary(context);

    // Truncate if needed
    const tokenEstimate = estimateTokens(context);
    const truncated = tokenEstimate > maxTokens;
    if (truncated) {
      context = truncateContext(context, maxTokens);
    }

    res.status(200).json({
      context,
      textSummary,
      tokenEstimate: estimateTokens(context),
      truncated,
    });
  } catch (error) {
    console.error('[OLIVIA/CONTEXT] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build context',
    });
  }
}
