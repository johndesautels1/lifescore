/**
 * Contrast Image Service
 *
 * Provides prompt templates for generating AI contrast images
 * that visualize metric differences between cities.
 *
 * Each metric category has carefully crafted prompts that:
 * - Show realistic human experiences
 * - Convey freedom vs restriction visually
 * - Are safe for all audiences
 * - Work well with Flux image generation
 */

import { getAuthHeaders } from '../lib/supabase';

export interface MetricPromptTemplate {
  metricId: string;
  topic: string;
  category: string;
  positiveContext: string;  // High score scenario
  negativeContext: string;  // Low score scenario
  positiveCaption: string;
  negativeCaption: string;
}

export interface ContrastRequest {
  topic: string;
  metricId: string;
  cityA: {
    name: string;
    score: number;
    context: string;
  };
  cityB: {
    name: string;
    score: number;
    context: string;
  };
  conversationContext?: string;
}

export interface ContrastImageResult {
  cityAImage: {
    url: string;
    caption: string;
  };
  cityBImage: {
    url: string;
    caption: string;
  };
  topic: string;
  cached: boolean;
}

// Prompt templates for key metrics — IDs MUST match src/data/metrics.ts (source of truth)
// These cover the most commonly discussed differences
const METRIC_TEMPLATES: MetricPromptTemplate[] = [
  // ════════════════════════════════════════════════════════════════
  // PERSONAL FREEDOM (pf_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'pf_01_cannabis_legal',
    topic: 'Cannabis Legality',
    category: 'Personal Freedom',
    positiveContext: 'Person relaxing at an outdoor cafe with friends, sunny atmosphere, casual lifestyle',
    negativeContext: 'Person looking worried while walking past official government buildings, formal atmosphere',
    positiveCaption: 'Legal cannabis and personal freedom',
    negativeCaption: 'Strict drug enforcement',
  },
  {
    metricId: 'pf_02_alcohol_restrictions',
    topic: 'Alcohol Access',
    category: 'Personal Freedom',
    positiveContext: 'Friends enjoying wine at a sidewalk bistro, European cafe culture, relaxed evening',
    negativeContext: 'Person at a restricted state liquor store with limited hours, bureaucratic setting',
    positiveCaption: 'Easy access to alcohol',
    negativeCaption: 'Restricted alcohol sales',
  },
  {
    metricId: 'pf_03_gambling_legal',
    topic: 'Gambling Legality',
    category: 'Personal Freedom',
    positiveContext: 'Elegant casino entrance with well-dressed guests, entertainment district, vibrant nightlife',
    negativeContext: 'Closed doors and no gambling signs, quiet entertainment district',
    positiveCaption: 'Legal gambling entertainment',
    negativeCaption: 'Gambling restrictions',
  },
  {
    metricId: 'pf_04_prostitution_status',
    topic: 'Sex Work Legal Status',
    category: 'Personal Freedom',
    positiveContext: 'Well-lit, regulated entertainment district with safety measures visible',
    negativeContext: 'Dark alley with danger signs, underground feeling',
    positiveCaption: 'Regulated adult services',
    negativeCaption: 'Unregulated restrictions',
  },
  {
    metricId: 'pf_05_drug_possession',
    topic: 'Drug Possession Penalties',
    category: 'Personal Freedom',
    positiveContext: 'Community health clinic with harm reduction services, supportive environment',
    negativeContext: 'Person handcuffed outside a courthouse, severe legal consequences visible',
    positiveCaption: 'Decriminalized approach',
    negativeCaption: 'Harsh possession penalties',
  },
  {
    metricId: 'pf_06_abortion_access',
    topic: 'Abortion Access',
    category: 'Personal Freedom',
    positiveContext: 'Modern women\'s health clinic with supportive staff, accessible healthcare setting',
    negativeContext: 'Closed clinic with restricted access signs, limited healthcare options',
    positiveCaption: 'Protected reproductive rights',
    negativeCaption: 'Restricted reproductive access',
  },
  {
    metricId: 'pf_07_lgbtq_rights',
    topic: 'LGBTQ Rights',
    category: 'Personal Freedom',
    positiveContext: 'Pride celebration with rainbow flags, happy couples, inclusive community',
    negativeContext: 'Plain street with no visible LGBTQ representation, muted colors',
    positiveCaption: 'LGBTQ acceptance',
    negativeCaption: 'Limited LGBTQ rights',
  },
  {
    metricId: 'pf_08_euthanasia_status',
    topic: 'Assisted Dying Laws',
    category: 'Personal Freedom',
    positiveContext: 'Compassionate hospice care with patient choice visible, dignified setting',
    negativeContext: 'Institutional medical setting with rigid rules posted, no patient choice',
    positiveCaption: 'End-of-life autonomy',
    negativeCaption: 'No assisted dying rights',
  },
  {
    metricId: 'pf_10_public_drinking',
    topic: 'Public Drinking Laws',
    category: 'Personal Freedom',
    positiveContext: 'Vibrant nightlife district, people socializing outdoors with drinks, lively atmosphere',
    negativeContext: 'Quiet streets at night, early closing times, no outdoor drinking allowed',
    positiveCaption: 'Relaxed public drinking laws',
    negativeCaption: 'Strict public drinking enforcement',
  },

  // ════════════════════════════════════════════════════════════════
  // HOUSING & PROPERTY (hp_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'hp_01_hoa_prevalence',
    topic: 'HOA Prevalence',
    category: 'Housing & Property',
    positiveContext: 'Colorful, unique homes with personality, gardens, creative landscaping',
    negativeContext: 'Identical cookie-cutter homes in strict HOA community, no variation',
    positiveCaption: 'Freedom from HOA rules',
    negativeCaption: 'Strict HOA regulations',
  },
  {
    metricId: 'hp_03_property_tax_rate',
    topic: 'Property Tax Rate',
    category: 'Housing & Property',
    positiveContext: 'Family moving into affordable home, happy homeowners, manageable costs',
    negativeContext: 'Stressed homeowner looking at large tax bill, worried expression',
    positiveCaption: 'Low property taxes',
    negativeCaption: 'High property tax burden',
  },
  {
    metricId: 'hp_06_zoning_strictness',
    topic: 'Zoning Restrictions',
    category: 'Housing & Property',
    positiveContext: 'Mixed-use neighborhood with home offices, small shops, live-work spaces',
    negativeContext: 'Strictly separated residential zone, no commercial allowed signs',
    positiveCaption: 'Flexible zoning',
    negativeCaption: 'Strict zoning laws',
  },
  {
    metricId: 'hp_08_short_term_rental',
    topic: 'Short-Term Rental Laws',
    category: 'Housing & Property',
    positiveContext: 'Airbnb-friendly apartment building, tourists with luggage, vacation vibes',
    negativeContext: 'No short-term rentals sign, strict building rules posted',
    positiveCaption: 'Rental freedom',
    negativeCaption: 'Rental restrictions',
  },

  // ════════════════════════════════════════════════════════════════
  // BUSINESS & WORK (bw_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'bw_03_minimum_wage',
    topic: 'Minimum Wage Level',
    category: 'Business & Work',
    positiveContext: 'Flexible job market, freelancer working from cafe, gig economy',
    negativeContext: 'Regulated workplace, strict labor rules posted, limited flexibility',
    positiveCaption: 'Flexible labor market',
    negativeCaption: 'Regulated labor market',
  },
  {
    metricId: 'bw_10_income_tax',
    topic: 'State/Local Income Tax',
    category: 'Business & Work',
    positiveContext: 'Professional keeping more of their paycheck, simple tax filing, financial freedom',
    negativeContext: 'Person overwhelmed by complex tax forms, high tax rate visible',
    positiveCaption: 'Low income taxes',
    negativeCaption: 'High income taxes',
  },
  {
    metricId: 'bw_11_sales_tax',
    topic: 'Sales Tax Rate',
    category: 'Business & Work',
    positiveContext: 'Happy shopper at checkout with no sales tax, affordable prices',
    negativeContext: 'Shopper surprised by high sales tax added at register',
    positiveCaption: 'No/low sales tax',
    negativeCaption: 'High sales tax',
  },
  {
    metricId: 'bw_19_startup_ease',
    topic: 'Startup Friendliness',
    category: 'Business & Work',
    positiveContext: 'Entrepreneur opening new business, ribbon cutting, supportive community',
    negativeContext: 'Closed storefronts, for lease signs, difficult business environment',
    positiveCaption: 'Business-friendly climate',
    negativeCaption: 'Difficult for business',
  },
  {
    metricId: 'bw_20_food_truck',
    topic: 'Food Truck Regulations',
    category: 'Business & Work',
    positiveContext: 'Diverse food truck row with cuisines from around the world, street food culture',
    negativeContext: 'Empty streets with no food vendor permits allowed, chain restaurants only',
    positiveCaption: 'Thriving food truck scene',
    negativeCaption: 'Restrictive food truck laws',
  },
  {
    metricId: 'bw_22_health_insurance',
    topic: 'Health Insurance Mandate',
    category: 'Business & Work',
    positiveContext: 'Modern hospital with short wait times, accessible healthcare',
    negativeContext: 'Crowded emergency room, long wait time signs',
    positiveCaption: 'Good healthcare access',
    negativeCaption: 'Limited healthcare options',
  },
  {
    metricId: 'bw_25_crypto_regulation',
    topic: 'Cryptocurrency Regulations',
    category: 'Business & Work',
    positiveContext: 'Bitcoin accepted sign in shop window, modern digital payment',
    negativeContext: 'Cash only signs, traditional banking only, no crypto',
    positiveCaption: 'Crypto-friendly',
    negativeCaption: 'Crypto restrictions',
  },

  // ════════════════════════════════════════════════════════════════
  // TRANSPORTATION (tr_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'tr_01_public_transit_quality',
    topic: 'Public Transit Quality',
    category: 'Transportation',
    positiveContext: 'Modern subway station with frequent trains, clean and efficient public transit',
    negativeContext: 'Crumbling bus stop with infrequent service, car-dependent sprawl',
    positiveCaption: 'Excellent public transit',
    negativeCaption: 'Poor transit options',
  },
  {
    metricId: 'tr_02_walkability',
    topic: 'Walkability Score',
    category: 'Transportation',
    positiveContext: 'Pedestrian-friendly streets with wide sidewalks, outdoor dining, walkable neighborhoods',
    negativeContext: 'Car-dominated highway with no sidewalks, impossible to walk anywhere',
    positiveCaption: 'Highly walkable',
    negativeCaption: 'Not walkable',
  },
  {
    metricId: 'tr_03_bike_infrastructure',
    topic: 'Bike Infrastructure',
    category: 'Transportation',
    positiveContext: 'Protected bike lanes, bike-share stations, cyclists commuting safely',
    negativeContext: 'No bike lanes, dangerous roads, no cycling infrastructure',
    positiveCaption: 'Great bike infrastructure',
    negativeCaption: 'No bike-friendly options',
  },

  // ════════════════════════════════════════════════════════════════
  // POLICING & LEGAL (pl_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'pl_01_incarceration_rate',
    topic: 'Incarceration Rate',
    category: 'Policing & Legal',
    positiveContext: 'Safe neighborhood at night, well-lit streets, community-oriented policing',
    negativeContext: 'Prison facility exterior, high walls and fences, institutional atmosphere',
    positiveCaption: 'Low incarceration',
    negativeCaption: 'High incarceration rate',
  },
  {
    metricId: 'pl_06_police_accountability',
    topic: 'Police Oversight',
    category: 'Policing & Legal',
    positiveContext: 'Community meeting with police oversight board, transparency and accountability',
    negativeContext: 'Heavy-handed police presence, no civilian oversight visible',
    positiveCaption: 'Strong police accountability',
    negativeCaption: 'Limited police oversight',
  },

  // ════════════════════════════════════════════════════════════════
  // SPEECH & LIFESTYLE (sl_) — source: src/data/metrics.ts
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'sl_01_free_speech',
    topic: 'Free Speech Protections',
    category: 'Speech & Lifestyle',
    positiveContext: 'Peaceful protest with diverse signs, public square, democratic expression',
    negativeContext: 'Empty public square with surveillance cameras, restricted gathering',
    positiveCaption: 'Protected free speech',
    negativeCaption: 'Speech restrictions',
  },
  {
    metricId: 'sl_06_religious_freedom',
    topic: 'Religious Freedom',
    category: 'Speech & Lifestyle',
    positiveContext: 'Diverse houses of worship on same street, mosque, church, temple together',
    negativeContext: 'Single state-approved religious building, uniform architecture',
    positiveCaption: 'Religious diversity',
    negativeCaption: 'Religious restrictions',
  },
  {
    metricId: 'sl_09_cultural_tolerance',
    topic: 'Cultural Tolerance',
    category: 'Speech & Lifestyle',
    positiveContext: 'Vibrant multicultural arts district, museums, galleries, street art, diverse community',
    negativeContext: 'Minimal cultural offerings, homogeneous environment, no diversity visible',
    positiveCaption: 'Rich cultural diversity',
    negativeCaption: 'Limited cultural tolerance',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL PERSONAL FREEDOM (pf_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'pf_09_smoking_regulations',
    topic: 'Smoking Regulations',
    category: 'Personal Freedom',
    positiveContext: 'Outdoor cafe with designated smoking area, adults enjoying personal choice, relaxed atmosphere',
    negativeContext: 'No smoking signs everywhere, restricted outdoor spaces, heavy regulation visible',
    positiveCaption: 'Relaxed smoking rules',
    negativeCaption: 'Strict smoking bans',
  },
  {
    metricId: 'pf_11_helmet_laws',
    topic: 'Motorcycle Helmet Laws',
    category: 'Personal Freedom',
    positiveContext: 'Motorcyclist riding cruiser on scenic highway with wind in hair, no helmet, classic American biker freedom',
    negativeContext: 'Motorcyclist in full helmet and safety gear at traffic stop, helmet law enforcement sign visible',
    positiveCaption: 'Personal choice on helmets',
    negativeCaption: 'Mandatory helmet laws',
  },
  {
    metricId: 'pf_13_jaywalking',
    topic: 'Jaywalking Enforcement',
    category: 'Personal Freedom',
    positiveContext: 'Pedestrians freely crossing streets, European-style walkable city, no barriers',
    negativeContext: 'Strict crosswalk signals, jaywalking fine signs, barriers preventing crossing',
    positiveCaption: 'Pedestrian freedom',
    negativeCaption: 'Strict jaywalking enforcement',
  },
  {
    metricId: 'pf_15_noise_ordinances',
    topic: 'Noise Ordinances',
    category: 'Personal Freedom',
    positiveContext: 'Lively neighborhood with music venues, outdoor events, vibrant nightlife',
    negativeContext: 'Quiet hours signs posted, noise complaint warnings, silent streets at night',
    positiveCaption: 'Relaxed noise rules',
    negativeCaption: 'Strict quiet hours',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL HOUSING & PROPERTY (hp_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'hp_02_hoa_power',
    topic: 'HOA Legal Powers',
    category: 'Housing & Property',
    positiveContext: 'Homeowner freely decorating their property, personal expression, colorful gardens',
    negativeContext: 'HOA violation notice on door, lawyer letters, foreclosure warning signs',
    positiveCaption: 'Limited HOA power',
    negativeCaption: 'Powerful HOA control',
  },
  {
    metricId: 'hp_04_rent_control',
    topic: 'Rent Control Laws',
    category: 'Housing & Property',
    positiveContext: 'Long-term tenant in affordable apartment, stable community, multigenerational neighbors',
    negativeContext: 'Eviction notice on door, rising rent signs, families moving out',
    positiveCaption: 'Strong rent protections',
    negativeCaption: 'No rent control',
  },
  {
    metricId: 'hp_07_building_permits',
    topic: 'Building Permit Process',
    category: 'Housing & Property',
    positiveContext: 'Homeowner doing DIY renovation, easy permit approval, home improvement project',
    negativeContext: 'Stack of permit paperwork, long wait times, bureaucratic office',
    positiveCaption: 'Easy permit process',
    negativeCaption: 'Complex permit requirements',
  },
  {
    metricId: 'hp_09_adu_laws',
    topic: 'Accessory Dwelling Units',
    category: 'Housing & Property',
    positiveContext: 'Cozy modern backyard cottage with elderly parent waving, multigenerational family, granny flat rental income',
    negativeContext: 'Large empty backyard with only lawn, no ADU allowed sign, elderly parent living far away',
    positiveCaption: 'ADUs allowed',
    negativeCaption: 'ADUs prohibited',
  },
  {
    metricId: 'hp_10_home_business',
    topic: 'Home Business Rules',
    category: 'Housing & Property',
    positiveContext: 'Entrepreneur working from home office, small business sign, work-life balance',
    negativeContext: 'No commercial activity signs, residential-only zone, business prohibited',
    positiveCaption: 'Home business friendly',
    negativeCaption: 'Home business restricted',
  },
  {
    metricId: 'hp_16_lawn_regulations',
    topic: 'Lawn & Landscaping Rules',
    category: 'Housing & Property',
    positiveContext: 'Creative xeriscape garden, wildflower meadow, sustainable landscaping',
    negativeContext: 'Uniform grass lawns everywhere, lawn violation notice, mandatory grass requirements',
    positiveCaption: 'Landscape freedom',
    negativeCaption: 'Strict lawn rules',
  },
  {
    metricId: 'hp_19_vehicle_parking',
    topic: 'Vehicle Parking Rules',
    category: 'Housing & Property',
    positiveContext: 'RV and boat in driveway, car enthusiast with multiple vehicles, hobby vehicles',
    negativeContext: 'No RV parking signs, vehicle restriction notices, tow warning',
    positiveCaption: 'Flexible parking rules',
    negativeCaption: 'Strict parking restrictions',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL BUSINESS & WORK (bw_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'bw_01_business_license',
    topic: 'Business License Requirements',
    category: 'Business & Work',
    positiveContext: 'Small business owner opening shop easily, quick approval, entrepreneurial spirit',
    negativeContext: 'Complicated licensing office, stacks of forms, bureaucratic hurdles',
    positiveCaption: 'Easy business licensing',
    negativeCaption: 'Complex licensing requirements',
  },
  {
    metricId: 'bw_02_occupational_licensing',
    topic: 'Occupational Licensing',
    category: 'Business & Work',
    positiveContext: 'Hair braider or florist happily serving customers in small shop, no license required, entrepreneurial freedom',
    negativeContext: 'Cosmetology school classroom with 1500 hours requirement sign, expensive textbooks, licensing exam stress',
    positiveCaption: 'Low licensing barriers',
    negativeCaption: 'Heavy occupational licensing',
  },
  {
    metricId: 'bw_08_non_compete',
    topic: 'Non-Compete Agreements',
    category: 'Business & Work',
    positiveContext: 'Tech worker happily starting at new company, carrying box into modern office, career advancement celebration',
    negativeContext: 'Professional receiving cease and desist letter from lawyer, former employer lawsuit threat, trapped at desk',
    positiveCaption: 'Non-competes banned',
    negativeCaption: 'Enforced non-competes',
  },
  {
    metricId: 'bw_12_freelance_regs',
    topic: 'Freelance Regulations',
    category: 'Business & Work',
    positiveContext: 'Freelance graphic designer working from beach with laptop, multiple clients, location independence',
    negativeContext: 'Uber driver receiving employee reclassification letter, AB5 law notice, forced into W-2 status',
    positiveCaption: 'Freelance-friendly',
    negativeCaption: 'Restrictive gig laws',
  },
  {
    metricId: 'bw_04_right_to_work',
    topic: 'Right to Work Laws',
    category: 'Business & Work',
    positiveContext: 'Factory worker happily on job without union membership requirement, personal employment choice',
    negativeContext: 'Worker signing mandatory union paperwork on first day, union dues automatically deducted from paycheck',
    positiveCaption: 'Right to work state',
    negativeCaption: 'Mandatory union membership',
  },
  {
    metricId: 'bw_24_banking_access',
    topic: 'Banking Accessibility',
    category: 'Business & Work',
    positiveContext: 'Modern fintech apps, easy banking access, digital financial services',
    negativeContext: 'Unbanked community, check cashing stores, limited financial services',
    positiveCaption: 'Easy banking access',
    negativeCaption: 'Limited banking options',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL TRANSPORTATION (tr_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'tr_05_rideshare_legal',
    topic: 'Rideshare Legality',
    category: 'Transportation',
    positiveContext: 'Uber and Lyft readily available, easy app-based transportation, convenient rides',
    negativeContext: 'Taxi-only zones, rideshare banned signs, limited transportation options',
    positiveCaption: 'Rideshare available',
    negativeCaption: 'Rideshare restricted',
  },
  {
    metricId: 'tr_12_dui_laws',
    topic: 'DUI Laws',
    category: 'Transportation',
    positiveContext: 'Person safely using rideshare app after dinner with wine, responsible choices, nightlife district',
    negativeContext: 'Police DUI checkpoint at night with flashing lights, sobriety test being administered, zero tolerance',
    positiveCaption: 'Reasonable DUI laws',
    negativeCaption: 'Strict DUI enforcement',
  },
  {
    metricId: 'tr_13_scooter_ebike',
    topic: 'E-Scooter & E-Bike Laws',
    category: 'Transportation',
    positiveContext: 'Young professional commuting on Lime scooter in bike lane, e-bike rental stations, urban mobility',
    negativeContext: 'Pile of confiscated e-scooters by city officials, scooter ban signs, impounded micro-mobility vehicles',
    positiveCaption: 'E-mobility friendly',
    negativeCaption: 'E-mobility restricted',
  },
  {
    metricId: 'tr_04_car_dependency',
    topic: 'Car Dependency',
    category: 'Transportation',
    positiveContext: 'Car-optional lifestyle, multiple transport choices, freedom without car ownership',
    negativeContext: 'Sprawling parking lots, car-dependent infrastructure, no alternatives',
    positiveCaption: 'Low car dependency',
    negativeCaption: 'Car-dependent city',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL POLICING & LEGAL (pl_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'pl_03_civil_forfeiture',
    topic: 'Civil Asset Forfeiture',
    category: 'Policing & Legal',
    positiveContext: 'Person driving their car freely on highway, property rights secure, no fear of seizure',
    negativeContext: 'Police impounding vehicle at roadside, cash being seized during traffic stop, forfeiture notice',
    positiveCaption: 'Forfeiture protections',
    negativeCaption: 'Easy asset seizure',
  },
  {
    metricId: 'pl_11_surveillance',
    topic: 'Government Surveillance',
    category: 'Policing & Legal',
    positiveContext: 'People walking freely in public park without visible cameras, privacy preserved, anonymous movement',
    negativeContext: 'City intersection with multiple CCTV cameras, facial recognition warning sign, license plate readers',
    positiveCaption: 'Low surveillance',
    negativeCaption: 'Heavy surveillance',
  },
  {
    metricId: 'pl_05_bail_system',
    topic: 'Bail System',
    category: 'Policing & Legal',
    positiveContext: 'Person released from courthouse on own recognizance, walking free with family, fair pretrial system',
    negativeContext: 'Person behind bars in jail cell, unable to afford bail, family crying outside bail bonds office',
    positiveCaption: 'Reformed bail system',
    negativeCaption: 'Cash bail required',
  },
  {
    metricId: 'pl_15_record_expungement',
    topic: 'Record Expungement',
    category: 'Policing & Legal',
    positiveContext: 'Person celebrating job offer after record expungement, fresh start, professional attire, hopeful future',
    negativeContext: 'Person rejected from job interview, background check denial letter, permanent criminal record following them',
    positiveCaption: 'Easy expungement',
    negativeCaption: 'Permanent records',
  },

  // ════════════════════════════════════════════════════════════════
  // ADDITIONAL SPEECH & LIFESTYLE (sl_) — Expanded to 50
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'sl_03_internet_freedom',
    topic: 'Internet Freedom',
    category: 'Speech & Lifestyle',
    positiveContext: 'Person happily browsing social media and news on laptop at cafe, global internet access, open web',
    negativeContext: 'Computer screen showing website blocked message, VPN required, government firewall censorship',
    positiveCaption: 'Free internet access',
    negativeCaption: 'Internet restrictions',
  },
  {
    metricId: 'sl_05_protest_rights',
    topic: 'Protest Rights',
    category: 'Speech & Lifestyle',
    positiveContext: 'Peaceful protest in public square, free assembly, democratic expression',
    negativeContext: 'Protest permit denied, restricted gathering zones, police barriers',
    positiveCaption: 'Protected protest rights',
    negativeCaption: 'Limited protest rights',
  },
  {
    metricId: 'sl_07_data_privacy',
    topic: 'Data Privacy Laws',
    category: 'Speech & Lifestyle',
    positiveContext: 'Person confidently using smartphone with privacy lock icon, secure digital life, data protection',
    negativeContext: 'Person overwhelmed by targeted ads on all screens, data brokers selling info, no privacy control',
    positiveCaption: 'Strong data privacy',
    negativeCaption: 'Weak privacy laws',
  },
  {
    metricId: 'sl_02_press_freedom',
    topic: 'Press Freedom',
    category: 'Speech & Lifestyle',
    positiveContext: 'Independent journalists reporting freely, diverse media landscape, free press',
    negativeContext: 'State-controlled media, censored newspapers, restricted journalism',
    positiveCaption: 'Free press',
    negativeCaption: 'Press restrictions',
  },
];

// Get template by metric ID
export function getMetricTemplate(metricId: string): MetricPromptTemplate | null {
  return METRIC_TEMPLATES.find(t => t.metricId === metricId) || null;
}

// Get template by topic (fuzzy matching)
export function findTemplateByTopic(topic: string): MetricPromptTemplate | null {
  const normalizedTopic = topic.toLowerCase().trim();

  // Exact match first
  let template = METRIC_TEMPLATES.find(
    t => t.topic.toLowerCase() === normalizedTopic
  );

  if (template) return template;

  // Partial match
  template = METRIC_TEMPLATES.find(
    t => t.topic.toLowerCase().includes(normalizedTopic) ||
         normalizedTopic.includes(t.topic.toLowerCase())
  );

  if (template) return template;

  // Keyword matching
  const keywords = normalizedTopic.split(/\s+/);
  template = METRIC_TEMPLATES.find(t => {
    const templateWords = `${t.topic} ${t.category}`.toLowerCase();
    return keywords.some(kw => templateWords.includes(kw));
  });

  return template || null;
}

// Get all templates for a category
export function getTemplatesByCategory(category: string): MetricPromptTemplate[] {
  return METRIC_TEMPLATES.filter(
    t => t.category.toLowerCase() === category.toLowerCase()
  );
}

// Build request object for the API
export function buildContrastRequest(
  metricId: string,
  cityA: { name: string; score: number },
  cityB: { name: string; score: number },
  conversationContext?: string
): ContrastRequest | null {
  const template = getMetricTemplate(metricId);

  if (!template) {
    // Try to find by topic using metricId as topic
    const byTopic = findTemplateByTopic(metricId);
    if (!byTopic) return null;

    return {
      topic: byTopic.topic,
      metricId: byTopic.metricId,
      cityA: {
        name: cityA.name,
        score: cityA.score,
        context: cityA.score >= cityB.score ? byTopic.positiveContext : byTopic.negativeContext,
      },
      cityB: {
        name: cityB.name,
        score: cityB.score,
        context: cityB.score >= cityA.score ? byTopic.positiveContext : byTopic.negativeContext,
      },
      conversationContext,
    };
  }

  return {
    topic: template.topic,
    metricId: template.metricId,
    cityA: {
      name: cityA.name,
      score: cityA.score,
      context: cityA.score >= cityB.score ? template.positiveContext : template.negativeContext,
    },
    cityB: {
      name: cityB.name,
      score: cityB.score,
      context: cityB.score >= cityA.score ? template.positiveContext : template.negativeContext,
    },
    conversationContext,
  };
}

// Generate images via API
export async function generateContrastImages(
  request: ContrastRequest
): Promise<ContrastImageResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch('/api/olivia/contrast-images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to generate images');
  }

  return response.json();
}

// Detect if a message contains metric references that should trigger visualization
export function detectVisualizationTriggers(message: string): string[] {
  const triggers: string[] = [];
  const normalizedMessage = message.toLowerCase();

  for (const template of METRIC_TEMPLATES) {
    // Check if the message mentions this topic
    const topicWords = template.topic.toLowerCase().split(/\s+/);
    const categoryWords = template.category.toLowerCase().split(/\s+/);

    const mentionsTopic = topicWords.some(word =>
      word.length > 3 && normalizedMessage.includes(word)
    );

    const mentionsCategory = categoryWords.some(word =>
      word.length > 4 && normalizedMessage.includes(word)
    );

    if (mentionsTopic || mentionsCategory) {
      triggers.push(template.metricId);
    }
  }

  // Dedupe and limit to 3 triggers
  return [...new Set(triggers)].slice(0, 3);
}

// Export all templates for debugging/display
export function getAllTemplates(): MetricPromptTemplate[] {
  return [...METRIC_TEMPLATES];
}

export { METRIC_TEMPLATES };
