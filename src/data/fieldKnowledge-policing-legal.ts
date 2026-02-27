/**
 * LIFE SCORE - Field Knowledge: Policing & Legal
 * 15 metrics (pl_01 through pl_15)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_POLICING_LEGAL: Record<string, FieldKnowledge> = {
  'pl_01_incarceration_rate': {
    talkingPoints: [
      'US has highest incarceration rate globally',
      'Rates vary 3x+ between states',
      'Racial disparities significant in all states',
      'Prison population declining from peak',
      'Pre-trial detention drives much incarceration',
    ],
    keySourceTypes: ['Prison Policy Initiative', 'Bureau of Justice Statistics', 'Vera Institute'],
    commonQuestions: [
      'What is the incarceration rate?',
      'How does it compare to other states?',
      'Are there racial disparities?',
    ],
    dailyLifeImpact: 'Reflects criminal justice system harshness.',
  },

  'pl_02_police_per_capita': {
    talkingPoints: [
      'Police staffing varies from 1 to 6+ per 1000',
      'Higher numbers dont always mean more safety',
      'Community policing vs enforcement models differ',
      'Funding debates ongoing post-2020',
      'Sheriff vs police department jurisdictions',
    ],
    keySourceTypes: ['FBI UCR data', 'Police department', 'Bureau of Justice Statistics'],
    commonQuestions: [
      'How many police officers are there?',
      'What is the police approach to community?',
      'How quick is police response?',
    ],
    dailyLifeImpact: 'Affects police presence and response times.',
  },

  'pl_03_civil_forfeiture': {
    talkingPoints: [
      'Police can seize property without conviction',
      'Some states require criminal conviction',
      'Federal equitable sharing bypasses state limits',
      'Burden of proof varies significantly',
      'Institute for Justice grades state policies',
    ],
    keySourceTypes: ['Institute for Justice', 'State forfeiture laws', 'ACLU'],
    commonQuestions: [
      'Can police seize my property without charges?',
      'How do I get seized property back?',
      'What protections exist?',
    ],
    dailyLifeImpact: 'Risk of property loss without due process.',
  },

  'pl_04_mandatory_minimum': {
    talkingPoints: [
      'Mandatory minimums remove judicial discretion',
      'Drug offenses often have harsh minimums',
      'Three strikes laws in some states',
      'Reform efforts reducing some minimums',
      'Federal vs state minimum differences',
    ],
    keySourceTypes: ['Families Against Mandatory Minimums', 'State sentencing commission', 'Sentencing Project'],
    commonQuestions: [
      'Are there mandatory minimum sentences?',
      'What crimes have mandatories?',
      'Is there judicial discretion?',
    ],
    dailyLifeImpact: 'Affects potential consequences of criminal charges.',
  },

  'pl_05_bail_system': {
    talkingPoints: [
      'Cash bail keeps poor people in jail pre-trial',
      'Some jurisdictions eliminated cash bail',
      'Risk assessment tools increasingly used',
      'Bail reform efforts ongoing nationwide',
      'Bail bond industry opposes reform',
    ],
    keySourceTypes: ['Bail Project', 'Pretrial Justice Institute', 'State court rules'],
    commonQuestions: [
      'How does bail work here?',
      'Can I be held without bail?',
      'Are there bail reform efforts?',
    ],
    dailyLifeImpact: 'Affects pre-trial freedom and economic burden.',
  },

  'pl_06_police_accountability': {
    talkingPoints: [
      'Civilian oversight boards vary in power',
      'Subpoena power for investigations important',
      'Police union contracts limit oversight',
      'Body camera policies and access vary',
      'Transparency in misconduct records differs',
    ],
    keySourceTypes: ['NACOLE', 'State POST commission', 'ACLU'],
    commonQuestions: [
      'Is there civilian oversight of police?',
      'Can I access misconduct records?',
      'Are body cameras required?',
    ],
    dailyLifeImpact: 'Affects police accountability.',
  },

  'pl_07_qualified_immunity': {
    talkingPoints: [
      'Federal doctrine protects officers from lawsuits',
      'Some states have limited qualified immunity',
      'Colorado first state to restrict in 2020',
      'Reform efforts ongoing in Congress',
      'Affects ability to sue for civil rights violations',
    ],
    keySourceTypes: ['Institute for Justice', 'State civil rights laws', 'ACLU'],
    commonQuestions: [
      'What is qualified immunity?',
      'Can I sue police for misconduct?',
      'Has the state limited qualified immunity?',
    ],
    dailyLifeImpact: 'Affects ability to seek justice for police misconduct.',
  },

  'pl_08_legal_costs': {
    talkingPoints: [
      'Public defender caseloads often excessive',
      'Private attorney costs vary by region',
      'Court fees and fines add up',
      'Civil legal aid availability varies',
      'Debt from legal system common',
    ],
    keySourceTypes: ['State bar association', 'Legal aid organizations', 'Brennan Center'],
    commonQuestions: [
      'How much do lawyers cost?',
      'Is there good public defense?',
      'What court fees apply?',
    ],
    dailyLifeImpact: 'Affects access to justice.',
  },

  'pl_09_court_efficiency': {
    talkingPoints: [
      'Case backlogs vary dramatically',
      'COVID increased backlogs in many courts',
      'Online court options expanding',
      'Small claims court thresholds differ',
      'Alternative dispute resolution availability',
    ],
    keySourceTypes: ['State court system', 'National Center for State Courts', 'Court statistics'],
    commonQuestions: [
      'How long do cases take?',
      'Are there big backlogs?',
      'Can I handle matters online?',
    ],
    dailyLifeImpact: 'Affects time to resolve legal matters.',
  },

  'pl_10_jury_trial': {
    talkingPoints: [
      'Jury nullification is legal but judges dont inform',
      'Fully informed jury movements advocate awareness',
      'Jury selection processes vary',
      'Jury compensation typically minimal',
      'Juror privacy protections differ',
    ],
    keySourceTypes: ['FIJA', 'State court rules', 'Bar association'],
    commonQuestions: [
      'Can juries nullify bad laws?',
      'How are jurors selected?',
      'What is jury compensation?',
    ],
    dailyLifeImpact: 'Affects jury service and trial outcomes.',
  },

  'pl_11_surveillance': {
    talkingPoints: [
      'Facial recognition bans in some cities',
      'License plate readers widespread',
      'Social media monitoring by police varies',
      'Stingray/cell site simulator use',
      'Transparency in surveillance spending differs',
    ],
    keySourceTypes: ['EFF', 'ACLU surveillance map', 'State privacy laws'],
    commonQuestions: [
      'Does police use facial recognition?',
      'Is there surveillance transparency?',
      'What are my privacy rights?',
    ],
    dailyLifeImpact: 'Affects privacy in public spaces.',
  },

  'pl_12_search_seizure': {
    talkingPoints: [
      'Fourth Amendment provides federal baseline',
      'Some state constitutions provide more protection',
      'Vehicle search rules vary',
      'Digital privacy protections emerging',
      'No-knock warrant policies differ',
    ],
    keySourceTypes: ['State constitution', 'ACLU', 'State court decisions'],
    commonQuestions: [
      'What are my search and seizure rights?',
      'Can police search my car?',
      'What about digital devices?',
    ],
    dailyLifeImpact: 'Affects protection from unreasonable searches.',
  },

  'pl_13_death_penalty': {
    talkingPoints: [
      '27 states have death penalty on books',
      'Many have moratoriums or no executions',
      'California has most death row inmates',
      'Federal death penalty separately administered',
      'Methods vary: injection, electrocution, etc.',
    ],
    keySourceTypes: ['Death Penalty Information Center', 'State corrections', 'ACLU'],
    commonQuestions: [
      'Is there a death penalty?',
      'When was the last execution?',
      'Are there moratoriums?',
    ],
    dailyLifeImpact: 'Reflects criminal justice philosophy.',
  },

  'pl_14_prison_conditions': {
    talkingPoints: [
      'Overcrowding common in many systems',
      'Private prisons operate in many states',
      'Healthcare quality varies significantly',
      'Solitary confinement practices differ',
      'Visitation and communication policies vary',
    ],
    keySourceTypes: ['Prison Policy Initiative', 'State DOC', 'ACLU'],
    commonQuestions: [
      'What are prison conditions like?',
      'Are there private prisons?',
      'What is healthcare like in prison?',
    ],
    dailyLifeImpact: 'Relevant for those with incarcerated loved ones.',
  },

  'pl_15_record_expungement': {
    talkingPoints: [
      'Expungement and sealing eligibility varies widely',
      'Automatic expungement emerging in some states',
      'Clean slate laws gaining momentum',
      'Waiting periods differ significantly',
      'Costs and complexity of process vary',
    ],
    keySourceTypes: ['State criminal law', 'Clean Slate Initiative', 'Legal aid'],
    commonQuestions: [
      'Can I get my record expunged?',
      'Is it automatic or do I have to apply?',
      'How long do I have to wait?',
    ],
    dailyLifeImpact: 'Critical for those with criminal records seeking fresh start.',
  },
};
