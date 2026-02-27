/**
 * LIFE SCORE - Field Knowledge: Personal Freedom
 * 15 metrics (pf_01 through pf_15)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_PERSONAL_FREEDOM: Record<string, FieldKnowledge> = {
  'pf_01_cannabis_legal': {
    talkingPoints: [
      'Recreational vs medical distinction matters for everyday users',
      'Home cultivation rights vary dramatically - some states allow 6+ plants',
      'Possession limits range from 1oz to unlimited for home use',
      'Social consumption venues are the next frontier',
      'Employment protections for off-duty use are rare but growing',
    ],
    keySourceTypes: ['NORML', 'State legislature', 'MPP (Marijuana Policy Project)'],
    commonQuestions: [
      'Can I grow my own cannabis?',
      'What are the possession limits?',
      'Can my employer fire me for using cannabis off-duty?',
      'Are there cannabis lounges or cafes?',
    ],
    dailyLifeImpact: 'Affects whether you can legally purchase, possess, and consume cannabis products without fear of arrest.',
  },

  'pf_02_alcohol_restrictions': {
    talkingPoints: [
      'Blue laws restrict Sunday and holiday sales in many areas',
      'Dry counties still exist - over 500 in the US',
      'State-run liquor stores limit selection and hours',
      'Grocery store wine/beer sales vary by state',
      'Happy hour restrictions affect bar culture',
    ],
    keySourceTypes: ['State ABC (Alcohol Beverage Control)', 'Local ordinances'],
    commonQuestions: [
      'Can I buy alcohol on Sunday?',
      'Are there state-run liquor stores?',
      'Can I buy wine at the grocery store?',
      'What are the bar closing times?',
    ],
    dailyLifeImpact: 'Determines when and where you can purchase alcohol, and affects restaurant/bar culture.',
  },

  'pf_03_gambling_legal': {
    talkingPoints: [
      'Casino gambling vs tribal gaming differences',
      'Sports betting legalization is rapidly expanding',
      'Online gambling restrictions vary widely',
      'Poker home games have different legal status than casinos',
      'State lotteries are nearly universal but other gambling varies',
    ],
    keySourceTypes: ['State gaming commission', 'American Gaming Association'],
    commonQuestions: [
      'Are there casinos nearby?',
      'Can I bet on sports legally?',
      'Is online poker legal?',
      'What about fantasy sports?',
    ],
    dailyLifeImpact: 'Affects entertainment options and whether you can legally participate in various forms of gambling.',
  },

  'pf_04_prostitution_status': {
    talkingPoints: [
      'Only Nevada has legal brothels (in certain counties)',
      'Decriminalization efforts focus on protecting sex workers',
      'Nordic model criminalizes buyers but not sellers',
      'Many cities use "end demand" enforcement approaches',
      'This metric measures legal status, not moral judgment',
    ],
    keySourceTypes: ['State criminal code', 'ACLU reports', 'Local ordinances'],
    commonQuestions: [
      'What is the legal status of sex work?',
      'Are there any legal options?',
      'What are the enforcement priorities?',
    ],
    dailyLifeImpact: 'Reflects broader attitudes toward personal autonomy and victimless crime enforcement.',
  },

  'pf_05_drug_possession': {
    talkingPoints: [
      'Oregon decriminalized all drugs in 2020',
      'Many states have reduced penalties for small amounts',
      'Drug courts offer treatment alternatives',
      'Fentanyl test strip legality varies',
      'Good Samaritan laws protect those calling 911 for overdoses',
    ],
    keySourceTypes: ['State criminal code', 'Drug Policy Alliance', 'SAMHSA'],
    commonQuestions: [
      'What are penalties for possession?',
      'Are there drug courts or diversion programs?',
      'Is harm reduction legal?',
    ],
    dailyLifeImpact: 'Affects risk of arrest and incarceration for drug possession, and access to harm reduction.',
  },

  'pf_06_abortion_access': {
    talkingPoints: [
      'Post-Dobbs landscape varies dramatically by state',
      'Gestational limits range from total bans to no restrictions',
      'Waiting periods and mandatory counseling add barriers',
      'Clinic availability affects practical access',
      'Travel restrictions are emerging in some states',
    ],
    keySourceTypes: ['Guttmacher Institute', 'State health department', 'Planned Parenthood'],
    commonQuestions: [
      'Is abortion legal here?',
      'What are the gestational limits?',
      'Are there waiting periods?',
      'How many clinics are available?',
    ],
    dailyLifeImpact: 'Critical for reproductive autonomy and healthcare access.',
  },

  'pf_07_lgbtq_rights': {
    talkingPoints: [
      'Marriage equality is federal but other protections vary',
      'Employment non-discrimination coverage differs by state',
      'Conversion therapy bans protect minors in some states',
      'Bathroom bills and transgender sports policies vary',
      'Adoption and foster care protections affect families',
    ],
    keySourceTypes: ['HRC State Equality Index', 'Movement Advancement Project', 'State civil rights laws'],
    commonQuestions: [
      'Are LGBTQ+ people protected from discrimination?',
      'Is conversion therapy banned?',
      'What are the adoption rights?',
      'Are there transgender-specific protections?',
    ],
    dailyLifeImpact: 'Affects safety, employment, housing, and family rights for LGBTQ+ individuals.',
  },

  'pf_08_euthanasia_status': {
    talkingPoints: [
      'Medical aid in dying legal in 10+ states plus DC',
      'Requires terminal diagnosis with 6-month prognosis',
      'Multiple physician approvals and waiting periods required',
      'Some states require state residency',
      'Religious and ethical debates continue',
    ],
    keySourceTypes: ['Death with Dignity', 'State health department', 'Medical board'],
    commonQuestions: [
      'Is medical aid in dying legal?',
      'What are the requirements?',
      'Do I need to be a resident?',
    ],
    dailyLifeImpact: 'Affects end-of-life autonomy and options for terminally ill individuals.',
  },

  'pf_09_smoking_regulations': {
    talkingPoints: [
      'Indoor smoking bans are nearly universal now',
      'Outdoor restrictions vary widely - parks, beaches, patios',
      'Smoking age raised to 21 federally in 2019',
      'Vaping regulations often mirror or exceed tobacco',
      'Apartment and condo smoking bans affect housing',
    ],
    keySourceTypes: ['American Lung Association', 'State health department', 'Local ordinances'],
    commonQuestions: [
      'Where can I smoke?',
      'Are vapes treated the same as cigarettes?',
      'Can my landlord ban smoking?',
    ],
    dailyLifeImpact: 'Affects daily smoking habits and where tobacco products can be used.',
  },

  'pf_10_public_drinking': {
    talkingPoints: [
      'Open container laws vary by state and locality',
      'Entertainment districts may allow street drinking',
      'New Orleans, Las Vegas, Savannah allow open containers',
      'Brown bag rules differ from legal drinking',
      'Parks and beaches often have separate rules',
    ],
    keySourceTypes: ['State ABC', 'Local ordinances', 'Tourism boards'],
    commonQuestions: [
      'Can I drink in public?',
      'Are there entertainment districts with open containers?',
      'What about beaches and parks?',
    ],
    dailyLifeImpact: 'Affects social culture and ability to enjoy outdoor events with alcohol.',
  },

  'pf_11_helmet_laws': {
    talkingPoints: [
      'Universal helmet laws cover all riders in 18 states',
      'Partial laws may only cover riders under 18 or 21',
      'Three states have no helmet law at all',
      'Bicycle helmet laws are usually local and for minors',
      'E-bike and scooter helmet requirements vary',
    ],
    keySourceTypes: ['IIHS', 'State DOT', 'NHTSA'],
    commonQuestions: [
      'Do I have to wear a motorcycle helmet?',
      'What about bicycle helmets?',
      'Are e-bike riders required to wear helmets?',
    ],
    dailyLifeImpact: 'Affects personal choice in motorcycle and bicycle safety equipment.',
  },

  'pf_12_seatbelt_enforcement': {
    talkingPoints: [
      'Primary enforcement allows stops solely for seatbelt violations',
      'Secondary enforcement only tickets seatbelts during other stops',
      'New Hampshire has no adult seatbelt law',
      'Rear seat requirements vary significantly',
      'Exemptions exist for certain vehicles and medical conditions',
    ],
    keySourceTypes: ['NHTSA', 'State DOT', 'Governors Highway Safety Association'],
    commonQuestions: [
      'Can I be pulled over just for not wearing a seatbelt?',
      'Do back seat passengers need seatbelts?',
      'Are there any exemptions?',
    ],
    dailyLifeImpact: 'Affects enforcement risk for personal safety choices in vehicles.',
  },

  'pf_13_jaywalking': {
    talkingPoints: [
      'California decriminalized jaywalking in 2023',
      'Many cities de-prioritize jaywalking enforcement',
      'Fines range from warnings to $250+',
      'Enforcement often has racial disparities',
      'Some cities redesigning for pedestrian priority',
    ],
    keySourceTypes: ['Local traffic code', 'City pedestrian plans', 'Police department'],
    commonQuestions: [
      'Can I get a ticket for jaywalking?',
      'How strictly is it enforced?',
      'Are there designated crossing areas?',
    ],
    dailyLifeImpact: 'Affects pedestrian freedom and risk of citations for crossing streets.',
  },

  'pf_14_curfew_laws': {
    talkingPoints: [
      'Most curfews apply only to minors (under 17 or 18)',
      'Typical hours are 11pm-6am on school nights',
      'Emergency curfews can apply to all ages',
      'Enforcement varies dramatically by neighborhood',
      'Some cities have eliminated curfews entirely',
    ],
    keySourceTypes: ['Local municipal code', 'Police department', 'ACLU'],
    commonQuestions: [
      'Is there a curfew for teenagers?',
      'What are the curfew hours?',
      'Are curfews enforced?',
    ],
    dailyLifeImpact: 'Primarily affects families with teenagers and youth freedom of movement.',
  },

  'pf_15_noise_ordinances': {
    talkingPoints: [
      'Quiet hours typically 10pm-7am',
      'Decibel limits vary by zone (residential vs commercial)',
      'Construction noise has separate regulations',
      'Barking dogs are a common noise complaint',
      'Music and party noise enforcement varies by neighbor complaints',
    ],
    keySourceTypes: ['Local municipal code', 'Noise control office', 'Health department'],
    commonQuestions: [
      'What are the quiet hours?',
      'How loud can I play music?',
      'When can construction happen?',
    ],
    dailyLifeImpact: 'Affects ability to host gatherings, play music, and overall neighborhood culture.',
  },
};
