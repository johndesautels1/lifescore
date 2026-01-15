/**
 * LIFE SCORE™ Metric Tooltips
 * "Why This Matters" explanations for each freedom metric
 */

export interface MetricTooltip {
  shortName: string;
  whyMatters: string;
}

// Tooltips explaining why each metric matters for lived freedom
export const METRIC_TOOLTIPS: Record<string, MetricTooltip> = {
  // Personal Freedom (15)
  'Cannabis': {
    shortName: 'Cannabis',
    whyMatters: 'Affects your ability to make personal health and recreational choices without government prosecution.'
  },
  'Alcohol Laws': {
    shortName: 'Alcohol Laws',
    whyMatters: 'Determines when and where you can purchase alcohol, impacting personal convenience and business hours.'
  },
  'Gambling': {
    shortName: 'Gambling',
    whyMatters: 'Shows how much the government controls your right to risk your own money as you choose.'
  },
  'Sex Work Laws': {
    shortName: 'Sex Work Laws',
    whyMatters: 'Reflects government control over consensual adult activities and bodily autonomy.'
  },
  'Drug Penalties': {
    shortName: 'Drug Penalties',
    whyMatters: 'Indicates how severely the government punishes personal substance choices - affects incarceration risk.'
  },
  'Abortion Access': {
    shortName: 'Abortion Access',
    whyMatters: 'Measures government control over reproductive healthcare decisions.'
  },
  'LGBTQ+ Rights': {
    shortName: 'LGBTQ+ Rights',
    whyMatters: 'Shows if the government treats all citizens equally regardless of sexual orientation or gender identity.'
  },
  'Assisted Dying': {
    shortName: 'Assisted Dying',
    whyMatters: 'Determines your right to make end-of-life decisions without government interference.'
  },
  'Smoking Laws': {
    shortName: 'Smoking Laws',
    whyMatters: 'Shows the extent of government restrictions on legal personal behavior in public and private spaces.'
  },
  'Public Drinking': {
    shortName: 'Public Drinking',
    whyMatters: 'Indicates government control over your behavior in public spaces with legal substances.'
  },
  'Helmet Laws': {
    shortName: 'Helmet Laws',
    whyMatters: 'Reflects whether the government mandates personal safety choices that only affect you.'
  },
  'Seatbelt Laws': {
    shortName: 'Seatbelt Laws',
    whyMatters: 'Shows if government requires personal safety measures under threat of fines.'
  },
  'Jaywalking': {
    shortName: 'Jaywalking',
    whyMatters: 'Indicates government control over basic pedestrian movement and street crossing.'
  },
  'Curfews': {
    shortName: 'Curfews',
    whyMatters: 'Shows if the government restricts when you can be outside, affecting personal freedom of movement.'
  },
  'Noise Laws': {
    shortName: 'Noise Laws',
    whyMatters: 'Determines how strictly government controls noise on your own property.'
  },

  // Housing & Property (20)
  'HOA Prevalence': {
    shortName: 'HOA Prevalence',
    whyMatters: 'More HOAs mean more quasi-governmental control over your property, even after you own it.'
  },
  'HOA Power': {
    shortName: 'HOA Power',
    whyMatters: 'Determines how much private associations can control what you do on your own property.'
  },
  'Property Tax': {
    shortName: 'Property Tax',
    whyMatters: 'Ongoing government fees mean you never truly own your property outright.'
  },
  'Rent Control': {
    shortName: 'Rent Control',
    whyMatters: 'Shows government intervention in private rental agreements between landlords and tenants.'
  },
  'Eviction Protection': {
    shortName: 'Eviction Protection',
    whyMatters: 'Indicates government restrictions on property owners\' control over their rental properties.'
  },
  'Zoning': {
    shortName: 'Zoning',
    whyMatters: 'Restricts what you can build or do with your own land - fundamental property rights issue.'
  },
  'Permits': {
    shortName: 'Permits',
    whyMatters: 'Bureaucratic barriers to improving your own property - more permits mean less autonomy.'
  },
  'STR/Airbnb': {
    shortName: 'STR/Airbnb',
    whyMatters: 'Shows if government restricts your right to rent out your own property short-term.'
  },
  'ADU Laws': {
    shortName: 'ADU Laws',
    whyMatters: 'Determines if you can build additional housing on your own property.'
  },
  'Home Business': {
    shortName: 'Home Business',
    whyMatters: 'Affects your freedom to work from home and run a business from your own property.'
  },
  'Eminent Domain': {
    shortName: 'Eminent Domain',
    whyMatters: 'How easily can government take your property for "public use"? Fundamental ownership risk.'
  },
  'Squatter Rights': {
    shortName: 'Squatter Rights',
    whyMatters: 'Strong squatter protections can undermine your property rights and control.'
  },
  'Historic Rules': {
    shortName: 'Historic Rules',
    whyMatters: 'Historic designations can severely limit what you can do with your own property.'
  },
  'Foreign Ownership': {
    shortName: 'Foreign Ownership',
    whyMatters: 'Restrictions on foreign buyers affect property markets and your resale options.'
  },
  'Transfer Tax': {
    shortName: 'Transfer Tax',
    whyMatters: 'Government takes a cut every time property changes hands - hidden cost of ownership.'
  },
  'Lawn Rules': {
    shortName: 'Lawn Rules',
    whyMatters: 'Can you let your lawn grow? Government controlling aesthetic choices on your property.'
  },
  'Exterior Rules': {
    shortName: 'Exterior Rules',
    whyMatters: 'Shows government control over your home\'s appearance - paint color, decorations, etc.'
  },
  'Fence Rules': {
    shortName: 'Fence Rules',
    whyMatters: 'Determines if you can build privacy barriers on your own property as you choose.'
  },
  'Parking Rules': {
    shortName: 'Parking Rules',
    whyMatters: 'Can you park vehicles on your own property freely? Another property rights indicator.'
  },
  'Pet Rules': {
    shortName: 'Pet Rules',
    whyMatters: 'Shows government restrictions on keeping animals on your own property.'
  },

  // Business & Work (25)
  'Business License': {
    shortName: 'Business License',
    whyMatters: 'How many bureaucratic hoops must you jump through to start earning a living?'
  },
  'Occupation License': {
    shortName: 'Occupation License',
    whyMatters: 'Does the government require permission to work in your field? Restricts job mobility.'
  },
  'Min Wage': {
    shortName: 'Min Wage',
    whyMatters: 'Government-mandated wages affect both employers\' costs and entry-level job availability.'
  },
  'Right to Work': {
    shortName: 'Right to Work',
    whyMatters: 'Can you work without being forced to join a union? Affects employment freedom.'
  },
  'Employment Laws': {
    shortName: 'Employment Laws',
    whyMatters: 'Strict employment laws limit both employer and employee flexibility in work arrangements.'
  },
  'Paid Leave': {
    shortName: 'Paid Leave',
    whyMatters: 'Mandated leave affects business costs and may impact hiring decisions.'
  },
  'Parental Leave': {
    shortName: 'Parental Leave',
    whyMatters: 'Shows government mandates on employers for family leave - affects business flexibility.'
  },
  'Non-Compete': {
    shortName: 'Non-Compete',
    whyMatters: 'Can you freely leave a job and work for competitors? Affects career mobility.'
  },
  'Corp Tax': {
    shortName: 'Corp Tax',
    whyMatters: 'How much does government take from business profits? Affects entrepreneurship viability.'
  },
  'Income Tax': {
    shortName: 'Income Tax',
    whyMatters: 'How much of your earnings does government take? Directly impacts your financial freedom.'
  },
  'Sales Tax': {
    shortName: 'Sales Tax',
    whyMatters: 'Hidden tax on every purchase - affects your purchasing power daily.'
  },
  'Gig Work Laws': {
    shortName: 'Gig Work Laws',
    whyMatters: 'Can you work flexible gig jobs freely, or does government restrict this work model?'
  },
  'Work Visa': {
    shortName: 'Work Visa',
    whyMatters: 'How easy is it to work legally if you\'re not a citizen? Affects international mobility.'
  },
  'Remote Work': {
    shortName: 'Remote Work',
    whyMatters: 'Are there legal barriers to working remotely? Important for digital nomads.'
  },
  'Overtime Rules': {
    shortName: 'Overtime Rules',
    whyMatters: 'Government rules on working hours affect both employers and employees\' flexibility.'
  },
  'Union Rights': {
    shortName: 'Union Rights',
    whyMatters: 'Shows the balance between worker organizing rights and employer freedom.'
  },
  'Safety Standards': {
    shortName: 'Safety Standards',
    whyMatters: 'More regulations mean higher compliance costs and potential business barriers.'
  },
  'Anti-Discrimination': {
    shortName: 'Anti-Discrimination',
    whyMatters: 'Laws affecting hiring decisions - balance between equal opportunity and business freedom.'
  },
  'Startup Ease': {
    shortName: 'Startup Ease',
    whyMatters: 'How quickly can you legally start a business? Bureaucratic friction indicator.'
  },
  'Food Trucks': {
    shortName: 'Food Trucks',
    whyMatters: 'Can you start a low-cost food business easily? Tests barriers to entry-level entrepreneurship.'
  },
  'Contractor License': {
    shortName: 'Contractor License',
    whyMatters: 'How much government permission is needed to do home repair work professionally?'
  },
  'Health Mandate': {
    shortName: 'Health Mandate',
    whyMatters: 'Must employers provide health insurance? Affects business costs and employment structures.'
  },
  'Tip Credit': {
    shortName: 'Tip Credit',
    whyMatters: 'Can tips count toward minimum wage? Affects restaurant economics and server earnings.'
  },
  'Banking Access': {
    shortName: 'Banking Access',
    whyMatters: 'How easily can you open business accounts? Barriers here slow entrepreneurship.'
  },
  'Crypto Laws': {
    shortName: 'Crypto Laws',
    whyMatters: 'Shows government stance on financial innovation and alternative currencies.'
  },

  // Transportation (15)
  'Transit Quality': {
    shortName: 'Transit Quality',
    whyMatters: 'Better transit means less dependence on cars and government-controlled driving privileges.'
  },
  'Walkability': {
    shortName: 'Walkability',
    whyMatters: 'Can you live without needing government-issued driver\'s license and car registration?'
  },
  'Bike Infra': {
    shortName: 'Bike Infra',
    whyMatters: 'Alternatives to car-dependent transport give you freedom from vehicle regulations.'
  },
  'Car Dependency': {
    shortName: 'Car Dependency',
    whyMatters: 'Must you own a car to function? More car dependency = more government control over mobility.'
  },
  'Rideshare': {
    shortName: 'Rideshare',
    whyMatters: 'Can you get around without owning a car? Rideshare availability affects transportation freedom.'
  },
  'Speed Limits': {
    shortName: 'Speed Limits',
    whyMatters: 'Lower limits with strict enforcement = more government control over your driving.'
  },
  'Traffic Cameras': {
    shortName: 'Traffic Cameras',
    whyMatters: 'Automated surveillance and fines - government monitoring your movements constantly.'
  },
  'Toll Roads': {
    shortName: 'Toll Roads',
    whyMatters: 'Pay-to-drive infrastructure affects your cost of mobility and freedom of movement.'
  },
  'Vehicle Inspection': {
    shortName: 'Vehicle Inspection',
    whyMatters: 'Regular inspections mean government approval needed to keep driving your own vehicle.'
  },
  'License Reqs': {
    shortName: 'License Reqs',
    whyMatters: 'How difficult is getting/keeping a driver\'s license? Barrier to personal mobility.'
  },
  'DUI Laws': {
    shortName: 'DUI Laws',
    whyMatters: 'While safety-focused, very strict laws can criminalize minor offenses severely.'
  },
  'E-Mobility': {
    shortName: 'E-Mobility',
    whyMatters: 'Can you use e-scooters, e-bikes freely? Shows government stance on new mobility options.'
  },
  'Airport Access': {
    shortName: 'Airport Access',
    whyMatters: 'Easy airport access means better ability to travel freely domestically and internationally.'
  },
  'Traffic': {
    shortName: 'Traffic',
    whyMatters: 'Bad traffic wastes your time and affects daily freedom of movement quality.'
  },

  // Policing & Legal (15)
  'Incarceration': {
    shortName: 'Incarceration',
    whyMatters: 'High incarceration rates indicate aggressive prosecution - your risk of losing freedom.'
  },
  'Police Density': {
    shortName: 'Police Density',
    whyMatters: 'More police presence means more potential for stops, searches, and citations.'
  },
  'Asset Forfeiture': {
    shortName: 'Asset Forfeiture',
    whyMatters: 'Can police take your property without conviction? Massive threat to property rights.'
  },
  'Mandatory Mins': {
    shortName: 'Mandatory Mins',
    whyMatters: 'Mandatory minimum sentences mean harsh punishment even for minor offenses.'
  },
  'Bail System': {
    shortName: 'Bail System',
    whyMatters: 'Cash bail can keep you jailed before trial simply because you\'re not wealthy.'
  },
  'Police Oversight': {
    shortName: 'Police Oversight',
    whyMatters: 'Without oversight, police can abuse power with little accountability.'
  },
  'Qualified Immunity': {
    shortName: 'Qualified Immunity',
    whyMatters: 'Protects police from lawsuits - makes it hard to hold them accountable for misconduct.'
  },
  'Legal Costs': {
    shortName: 'Legal Costs',
    whyMatters: 'High legal costs mean justice is accessible only to the wealthy.'
  },
  'Court Efficiency': {
    shortName: 'Court Efficiency',
    whyMatters: 'Slow courts mean your case drags on, affecting your life for months or years.'
  },
  'Jury Rights': {
    shortName: 'Jury Rights',
    whyMatters: 'Strong jury rights mean citizens, not just government, decide your fate.'
  },
  'Surveillance': {
    shortName: 'Surveillance',
    whyMatters: 'Government cameras everywhere = constant monitoring of your movements and activities.'
  },
  'Search Protections': {
    shortName: 'Search Protections',
    whyMatters: 'Strong protections prevent police from searching you/your property without cause.'
  },
  'Death Penalty': {
    shortName: 'Death Penalty',
    whyMatters: 'Shows government\'s ultimate power - ability to execute citizens.'
  },
  'Prison Standards': {
    shortName: 'Prison Standards',
    whyMatters: 'If incarcerated, conditions matter - reflects how humanely government treats prisoners.'
  },
  'Expungement': {
    shortName: 'Expungement',
    whyMatters: 'Can past mistakes be erased? Affects your ability to move on from minor offenses.'
  },

  // Speech & Lifestyle (10)
  'Free Speech': {
    shortName: 'Free Speech',
    whyMatters: 'Can you criticize the government without legal consequences? Fundamental freedom.'
  },
  'Press Freedom': {
    shortName: 'Press Freedom',
    whyMatters: 'Free press holds government accountable - restricted press means less transparency.'
  },
  'Internet Freedom': {
    shortName: 'Internet Freedom',
    whyMatters: 'Can you access information freely online, or does government censor/monitor internet?'
  },
  'Hate Speech Laws': {
    shortName: 'Hate Speech Laws',
    whyMatters: 'Broad hate speech laws can be used to prosecute unpopular opinions.'
  },
  'Protest Rights': {
    shortName: 'Protest Rights',
    whyMatters: 'Can you peacefully protest government without arrest? Essential democratic freedom.'
  },
  'Religious Freedom': {
    shortName: 'Religious Freedom',
    whyMatters: 'Can you practice (or not practice) religion freely without government interference?'
  },
  'Data Privacy': {
    shortName: 'Data Privacy',
    whyMatters: 'How much can government access your personal data? Affects privacy from surveillance.'
  },
  'Dress Freedom': {
    shortName: 'Dress Freedom',
    whyMatters: 'Can you wear what you want, or does government mandate dress codes?'
  },
  'Tolerance': {
    shortName: 'Tolerance',
    whyMatters: 'Government-backed intolerance means discrimination is officially sanctioned.'
  },
  'Defamation Laws': {
    shortName: 'Defamation Laws',
    whyMatters: 'Strict defamation laws can be used to silence criticism of powerful people.'
  }
};

/**
 * Get tooltip for a metric by its shortName
 */
export const getMetricTooltip = (shortName: string): MetricTooltip | undefined => {
  return METRIC_TOOLTIPS[shortName];
};

export default METRIC_TOOLTIPS;
