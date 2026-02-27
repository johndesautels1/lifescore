/**
 * LIFE SCORE - Field Knowledge: Business & Work
 * 25 metrics (bw_01 through bw_25)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_BUSINESS_WORK: Record<string, FieldKnowledge> = {
  'bw_01_business_license': {
    talkingPoints: [
      'Most cities require general business licenses',
      'Cost ranges from $50 to $500+ annually',
      'Home-based businesses usually need licenses too',
      'Some states have state-level business registration',
      'Industry-specific licenses are additional',
    ],
    keySourceTypes: ['City business license office', 'State Secretary of State', 'SBA'],
    commonQuestions: [
      'Do I need a business license?',
      'How much does it cost?',
      'What about online businesses?',
    ],
    dailyLifeImpact: 'Startup cost and annual overhead for business owners.',
  },

  'bw_02_occupational_licensing': {
    talkingPoints: [
      'Over 1,000 occupations require licenses in some states',
      'Cosmetologists, contractors, real estate agents need licenses',
      'License reciprocity between states varies',
      'Military spouse licensing reforms expanding',
      'Institute for Justice ranks state licensing burden',
    ],
    keySourceTypes: ['State licensing board', 'Institute for Justice', 'Professional associations'],
    commonQuestions: [
      'Does my profession need a license?',
      'Will my out-of-state license transfer?',
      'How long does licensing take?',
    ],
    dailyLifeImpact: 'Affects ability to work in licensed professions and career mobility.',
  },

  'bw_03_minimum_wage': {
    talkingPoints: [
      'Federal minimum is $7.25, many states/cities higher',
      'Seattle, NYC, California have $15-20+ minimums',
      'Tipped minimum wage can be much lower',
      'Small business exemptions in some areas',
      'Automatic inflation adjustments in some states',
    ],
    keySourceTypes: ['Department of Labor', 'State labor department', 'EPI'],
    commonQuestions: [
      'What is the minimum wage?',
      'Are tips counted toward minimum?',
      'Are there different rates for small businesses?',
    ],
    dailyLifeImpact: 'Affects wages for entry-level workers and operating costs for businesses.',
  },

  'bw_04_right_to_work': {
    talkingPoints: [
      '27 states have right-to-work laws',
      'Workers cannot be required to pay union dues',
      'Affects union strength and workplace organization',
      'Controversial - seen as anti-union or pro-freedom',
      'Michigan repealed right-to-work in 2023',
    ],
    keySourceTypes: ['State labor laws', 'NLRB', 'AFL-CIO', 'National Right to Work Foundation'],
    commonQuestions: [
      'Is this a right-to-work state?',
      'Do I have to join a union?',
      'Do I have to pay union dues?',
    ],
    dailyLifeImpact: 'Affects union membership requirements and workplace dynamics.',
  },

  'bw_05_at_will_employment': {
    talkingPoints: [
      'At-will employment is the default in most states',
      'Some states have stronger wrongful termination protections',
      'Protected classes vary beyond federal minimums',
      'Montana is the only state without at-will employment',
      'Whistleblower protections vary significantly',
    ],
    keySourceTypes: ['State employment law', 'EEOC', 'Labor rights organizations'],
    commonQuestions: [
      'Can I be fired for any reason?',
      'What protections do I have?',
      'Are there whistleblower protections?',
    ],
    dailyLifeImpact: 'Affects job security and protection against unfair termination.',
  },

  'bw_06_paid_leave_mandate': {
    talkingPoints: [
      'No federal paid sick leave requirement',
      'Many states and cities require paid sick leave',
      'Accrual rates typically 1 hour per 30-40 worked',
      'Caps range from 3-7 days annually',
      'COVID expanded temporary leave requirements',
    ],
    keySourceTypes: ['State labor department', 'A Better Balance', 'National Partnership'],
    commonQuestions: [
      'Am I entitled to paid sick leave?',
      'How much do I accrue?',
      'Can I use it for family members?',
    ],
    dailyLifeImpact: 'Affects ability to take time off when sick without losing income.',
  },

  'bw_07_parental_leave': {
    talkingPoints: [
      'FMLA provides 12 weeks unpaid for eligible workers',
      'Some states have paid family leave programs',
      'California, New York, New Jersey lead in paid leave',
      'Small employer exemptions common',
      'Paternity leave increasing but lags maternity',
    ],
    keySourceTypes: ['Department of Labor', 'State paid leave programs', 'National Partnership'],
    commonQuestions: [
      'Is there paid parental leave?',
      'How many weeks can I take?',
      'Does it apply to fathers too?',
    ],
    dailyLifeImpact: 'Critical for new parents balancing work and family.',
  },

  'bw_08_non_compete': {
    talkingPoints: [
      'California bans non-compete agreements entirely',
      'FTC proposed federal ban in 2023',
      'Many states limit scope and duration',
      'Tech industry increasingly avoiding non-competes',
      'Enforceability varies even in permissive states',
    ],
    keySourceTypes: ['State contract law', 'FTC', 'State attorney general'],
    commonQuestions: [
      'Are non-competes enforceable here?',
      'Can I work for a competitor?',
      'What are the limits?',
    ],
    dailyLifeImpact: 'Affects career mobility and ability to switch jobs.',
  },

  'bw_09_corporate_tax': {
    talkingPoints: [
      'State corporate tax rates range from 0% to 11.5%',
      'Six states have no corporate income tax',
      'Apportionment rules affect multistate businesses',
      'Tax incentives and credits vary widely',
      'Gross receipts taxes used in some states instead',
    ],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'KPMG'],
    commonQuestions: [
      'What is the corporate tax rate?',
      'Are there tax incentives for businesses?',
      'How are multistate profits taxed?',
    ],
    dailyLifeImpact: 'Major factor for business location decisions and operating costs.',
  },

  'bw_10_income_tax': {
    talkingPoints: [
      'Nine states have no state income tax',
      'Top rates range up to 13.3% (California)',
      'Flat vs progressive rate structures',
      'Local income taxes in some cities',
      'Retirement income often taxed differently',
    ],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'IRS'],
    commonQuestions: [
      'Is there state income tax?',
      'What are the tax brackets?',
      'Are there local income taxes?',
    ],
    dailyLifeImpact: 'Significant impact on take-home pay and retirement income.',
  },

  'bw_11_sales_tax': {
    talkingPoints: [
      'Five states have no state sales tax',
      'Combined state and local rates can exceed 10%',
      'Groceries often exempt or reduced rate',
      'Online sales now taxed in most states',
      'Sales tax holidays offer temporary relief',
    ],
    keySourceTypes: ['State revenue department', 'Tax Foundation', 'Sales Tax Institute'],
    commonQuestions: [
      'What is the sales tax rate?',
      'Are groceries taxed?',
      'Are there sales tax holidays?',
    ],
    dailyLifeImpact: 'Affects cost of everyday purchases.',
  },

  'bw_12_freelance_regs': {
    talkingPoints: [
      'California AB5 reclassified many gig workers as employees',
      'Prop 22 exempted rideshare and delivery drivers',
      'Other states considering similar legislation',
      'Independent contractor tests vary by state',
      'Benefits and protections tied to classification',
    ],
    keySourceTypes: ['State labor department', 'Department of Labor', 'National Employment Law Project'],
    commonQuestions: [
      'Am I an employee or contractor?',
      'What rights do gig workers have?',
      'Are rideshare drivers employees?',
    ],
    dailyLifeImpact: 'Critical for gig economy workers and freelancers.',
  },

  'bw_13_work_visa': {
    talkingPoints: [
      'State policies can support or hinder visa holders',
      'Some states welcome international talent',
      'State universities sponsor many H-1B workers',
      'Local business communities advocate for visa access',
      'Immigration enforcement cooperation varies',
    ],
    keySourceTypes: ['USCIS', 'State economic development', 'Immigration attorneys'],
    commonQuestions: [
      'How welcoming is this area to work visa holders?',
      'Are there many H-1B employers?',
      'What is the immigration climate?',
    ],
    dailyLifeImpact: 'Relevant for international workers and employers hiring them.',
  },

  'bw_14_remote_work': {
    talkingPoints: [
      'State tax implications for remote workers vary',
      'Convenience of employer rules in some states',
      'Workers compensation coverage for remote work',
      'Privacy laws may apply to remote monitoring',
      'Right to disconnect laws emerging',
    ],
    keySourceTypes: ['State revenue department', 'State labor department', 'HR policy organizations'],
    commonQuestions: [
      'Are there tax issues working remotely?',
      'Can my employer monitor me at home?',
      'What are my remote work rights?',
    ],
    dailyLifeImpact: 'Affects remote workers and employers with distributed teams.',
  },

  'bw_15_overtime_rules': {
    talkingPoints: [
      'Federal FLSA requires overtime over 40 hours/week',
      'Some states have daily overtime (over 8 hours)',
      'California has extensive overtime protections',
      'Salary thresholds for exemption vary',
      'Agricultural and other exemptions common',
    ],
    keySourceTypes: ['Department of Labor', 'State labor department', 'HR compliance resources'],
    commonQuestions: [
      'When do I get overtime pay?',
      'Is there daily overtime?',
      'Am I exempt from overtime?',
    ],
    dailyLifeImpact: 'Affects compensation for hours worked beyond standard schedule.',
  },

  'bw_16_union_rights': {
    talkingPoints: [
      'NLRA governs most private sector unionization',
      'Public sector union rights vary by state',
      'Card check vs secret ballot elections',
      'Union density highest in Northeast and Midwest',
      'Recent organizing surge at Amazon, Starbucks',
    ],
    keySourceTypes: ['NLRB', 'State labor relations board', 'Bureau of Labor Statistics'],
    commonQuestions: [
      'What are my rights to organize?',
      'Can public employees unionize?',
      'How do union elections work?',
    ],
    dailyLifeImpact: 'Affects workplace voice and collective bargaining options.',
  },

  'bw_17_workplace_safety': {
    talkingPoints: [
      'OSHA sets federal standards but states can exceed',
      'State OSHA plans in about half of states',
      'Enforcement and inspection frequency varies',
      'COVID exposed gaps in worker safety',
      'Heat illness standards emerging in some states',
    ],
    keySourceTypes: ['OSHA', 'State OSHA', 'National Council for Occupational Safety'],
    commonQuestions: [
      'What safety standards apply?',
      'How often are workplaces inspected?',
      'Can I report unsafe conditions anonymously?',
    ],
    dailyLifeImpact: 'Affects physical safety and working conditions.',
  },

  'bw_18_discrimination_law': {
    talkingPoints: [
      'Federal law covers race, sex, religion, national origin, etc.',
      'Many states add sexual orientation, gender identity',
      'Some states protect political affiliation, marital status',
      'State agencies may be more responsive than EEOC',
      'Statute of limitations varies',
    ],
    keySourceTypes: ['EEOC', 'State civil rights agency', 'Legal aid organizations'],
    commonQuestions: [
      'What discrimination protections exist?',
      'How do I file a complaint?',
      'Are LGBTQ workers protected?',
    ],
    dailyLifeImpact: 'Affects workplace fairness and protection from discrimination.',
  },

  'bw_19_startup_ease': {
    talkingPoints: [
      'Delaware incorporation remains popular for startups',
      'State startup incentives vary widely',
      'Accelerator and incubator ecosystems differ',
      'Venture capital concentration in select metros',
      'Regulatory sandbox programs for fintech',
    ],
    keySourceTypes: ['State economic development', 'Kauffman Foundation', 'Startup Genome'],
    commonQuestions: [
      'Is this a good place to start a company?',
      'Where should I incorporate?',
      'Are there startup incentives?',
    ],
    dailyLifeImpact: 'Affects entrepreneurs launching new businesses.',
  },

  'bw_20_food_truck': {
    talkingPoints: [
      'Permit requirements and costs vary dramatically',
      'Proximity restrictions near restaurants common',
      'Time limits and location restrictions',
      'Health inspection requirements',
      'Some cities very food truck friendly, others not',
    ],
    keySourceTypes: ['City licensing department', 'Health department', 'Food truck associations'],
    commonQuestions: [
      'How easy is it to operate a food truck?',
      'What permits are needed?',
      'Are there location restrictions?',
    ],
    dailyLifeImpact: 'Affects food entrepreneurs and street food availability.',
  },

  'bw_21_contractor_license': {
    talkingPoints: [
      'Most states require contractor licensing',
      'Thresholds for licensing vary ($500-$30,000+)',
      'Trade-specific licenses (electrical, plumbing)',
      'Testing and insurance requirements',
      'Penalties for unlicensed work',
    ],
    keySourceTypes: ['State contractor board', 'Local building department', 'Trade associations'],
    commonQuestions: [
      'Do contractors need licenses?',
      'Can I do my own work without a license?',
      'How do I verify a contractor is licensed?',
    ],
    dailyLifeImpact: 'Affects home improvement costs and DIY options.',
  },

  'bw_22_health_insurance': {
    talkingPoints: [
      'Federal mandate penalty eliminated in 2019',
      'Some states have individual mandates',
      'Massachusetts, New Jersey, California, DC, Rhode Island',
      'Penalties collected through state taxes',
      'Exemptions for affordability and hardship',
    ],
    keySourceTypes: ['State health exchange', 'State insurance department', 'Healthcare.gov'],
    commonQuestions: [
      'Am I required to have health insurance?',
      'Is there a penalty for being uninsured?',
      'What are the exemptions?',
    ],
    dailyLifeImpact: 'Affects whether going uninsured has financial penalties.',
  },

  'bw_23_tip_credit': {
    talkingPoints: [
      'Federal allows $2.13 tipped minimum wage',
      'Seven states require full minimum for tipped workers',
      'Tip pooling rules vary',
      'Service charges vs tips have different rules',
      'Tip credit abuse enforcement varies',
    ],
    keySourceTypes: ['Department of Labor', 'State labor department', 'Restaurant associations'],
    commonQuestions: [
      'What is the tipped minimum wage?',
      'Can employers take tip credit?',
      'How does tip pooling work?',
    ],
    dailyLifeImpact: 'Critical for restaurant and hospitality workers.',
  },

  'bw_24_banking_access': {
    talkingPoints: [
      'Chexsystems affects account access for past issues',
      'Public banking initiatives emerging',
      'Credit union availability varies',
      'Cannabis industry banking restrictions',
      'Immigrant banking access varies',
    ],
    keySourceTypes: ['FDIC', 'State banking department', 'National Credit Union Administration'],
    commonQuestions: [
      'Can I get a bank account with past issues?',
      'Are there good credit union options?',
      'What about banking for cannabis businesses?',
    ],
    dailyLifeImpact: 'Affects access to basic financial services.',
  },

  'bw_25_crypto_regulation': {
    talkingPoints: [
      'Money transmitter licenses required in most states',
      'Wyoming leads in crypto-friendly legislation',
      'New York BitLicense is most restrictive',
      'SEC vs CFTC jurisdiction still evolving',
      'State taxation of crypto gains varies',
    ],
    keySourceTypes: ['State financial regulator', 'SEC', 'State attorney general'],
    commonQuestions: [
      'How is crypto regulated here?',
      'Do I need special licenses?',
      'How are crypto gains taxed?',
    ],
    dailyLifeImpact: 'Affects crypto investors and businesses.',
  },
};
