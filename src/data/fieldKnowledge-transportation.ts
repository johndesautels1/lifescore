/**
 * LIFE SCORE - Field Knowledge: Transportation
 * 15 metrics (tr_01 through tr_15)
 */

import type { FieldKnowledge } from './fieldKnowledge';

export const FIELD_KNOWLEDGE_TRANSPORTATION: Record<string, FieldKnowledge> = {
  'tr_01_public_transit_quality': {
    talkingPoints: [
      'Quality varies from world-class to nonexistent',
      'Heavy rail, light rail, bus rapid transit options',
      'Coverage area and frequency matter most',
      'Last-mile connectivity affects usability',
      'Funding mechanisms affect service stability',
    ],
    keySourceTypes: ['Transit agency', 'American Public Transportation Association', 'Transit scores'],
    commonQuestions: [
      'How good is public transit?',
      'Can I get around without a car?',
      'How often do buses/trains run?',
    ],
    dailyLifeImpact: 'Determines whether car-free living is practical.',
  },

  'tr_02_walkability': {
    talkingPoints: [
      'Walk Score provides standardized measure',
      'Sidewalk coverage and maintenance varies',
      'Pedestrian infrastructure investments differ',
      'Climate affects year-round walkability',
      'Safety and lighting matter for walking',
    ],
    keySourceTypes: ['Walk Score', 'City pedestrian master plan', 'Transportation department'],
    commonQuestions: [
      'How walkable is this area?',
      'Are there good sidewalks?',
      'Is it safe to walk at night?',
    ],
    dailyLifeImpact: 'Affects daily errands and health through walking.',
  },

  'tr_03_bike_infrastructure': {
    talkingPoints: [
      'Protected bike lanes safest option',
      'Bike share programs increase accessibility',
      'E-bike infrastructure expanding rapidly',
      'Bike parking and theft prevention',
      'Climate and terrain affect bikeability',
    ],
    keySourceTypes: ['Bike Score', 'City bike master plan', 'League of American Bicyclists'],
    commonQuestions: [
      'How bike-friendly is this city?',
      'Are there protected bike lanes?',
      'Is there bike share?',
    ],
    dailyLifeImpact: 'Affects commuting and recreation options.',
  },

  'tr_04_car_dependency': {
    talkingPoints: [
      'Many US metros require cars for basic life',
      'Jobs-housing mismatch increases car need',
      'Sprawl development patterns require driving',
      'Parking minimums perpetuate car dependency',
      'One-car or car-free households save significantly',
    ],
    keySourceTypes: ['Census commuting data', 'Transportation surveys', 'Urban planning studies'],
    commonQuestions: [
      'Do I need a car to live here?',
      'Can I get by with one car for a family?',
      'How do most people commute?',
    ],
    dailyLifeImpact: 'Major cost and lifestyle factor.',
  },

  'tr_05_rideshare_legal': {
    talkingPoints: [
      'Uber/Lyft operate in most metros now',
      'Airport and downtown pickup rules vary',
      'Surge pricing regulations in some cities',
      'Driver requirements and background checks',
      'Competition affects pricing and availability',
    ],
    keySourceTypes: ['City transportation department', 'State public utilities commission', 'Rideshare companies'],
    commonQuestions: [
      'Is Uber/Lyft available?',
      'Can I get picked up at the airport?',
      'How reliable is rideshare here?',
    ],
    dailyLifeImpact: 'Affects transportation options without car ownership.',
  },

  'tr_06_speed_limits': {
    talkingPoints: [
      'Speed limits range from 25 mph to 85 mph on highways',
      'Vision Zero initiatives lowering urban speeds',
      'Speed tolerances vary by jurisdiction',
      'School zones have strict enforcement',
      'Rural vs urban speed limit differences',
    ],
    keySourceTypes: ['State DOT', 'IIHS', 'Local traffic code'],
    commonQuestions: [
      'What are typical speed limits?',
      'How strictly enforced are they?',
      'Are there speed cameras?',
    ],
    dailyLifeImpact: 'Affects commute times and ticket risk.',
  },

  'tr_07_speed_camera': {
    talkingPoints: [
      'Red light cameras in many cities, banned in some states',
      'Speed cameras less common, controversial',
      'Privacy concerns vs safety arguments',
      'Camera revenue motivations debated',
      'Ticket processing and appeals vary',
    ],
    keySourceTypes: ['City traffic department', 'IIHS', 'State camera laws'],
    commonQuestions: [
      'Are there red light cameras?',
      'Are there speed cameras?',
      'How do I contest a camera ticket?',
    ],
    dailyLifeImpact: 'Affects driving behavior and ticket exposure.',
  },

  'tr_08_parking_regs': {
    talkingPoints: [
      'Street parking rules vary by zone',
      'Parking meter rates range widely',
      'Residential permit parking protects neighborhoods',
      'Garage parking expensive in dense areas',
      'Parking apps help find and pay for parking',
    ],
    keySourceTypes: ['City parking authority', 'Parking apps', 'Local parking regulations'],
    commonQuestions: [
      'How hard is it to find parking?',
      'How much does parking cost?',
      'Are there resident parking permits?',
    ],
    dailyLifeImpact: 'Daily frustration factor for drivers.',
  },

  'tr_09_toll_roads': {
    talkingPoints: [
      'Toll roads common in some regions, rare in others',
      'Express lanes/HOT lanes use dynamic pricing',
      'Electronic tolling (EZ Pass, etc.) standard',
      'Toll costs can add up significantly',
      'Public-private partnerships controversial',
    ],
    keySourceTypes: ['State DOT', 'Toll authority', 'IBTTA'],
    commonQuestions: [
      'Are there toll roads?',
      'How much do tolls cost?',
      'Do I need a transponder?',
    ],
    dailyLifeImpact: 'Affects commute costs and route choices.',
  },

  'tr_10_vehicle_inspection': {
    talkingPoints: [
      'Safety inspections required in about 15 states',
      'Emissions testing required in many metros',
      'Inspection frequency typically annual',
      'Costs range from free to $100+',
      'Waiver processes for older/low-income vehicles',
    ],
    keySourceTypes: ['State DMV', 'Environmental agency', 'Car Care Council'],
    commonQuestions: [
      'Do I need an inspection?',
      'How often?',
      'What does it cost?',
    ],
    dailyLifeImpact: 'Recurring vehicle ownership requirement.',
  },

  'tr_11_drivers_license': {
    talkingPoints: [
      'Standard vs Real ID requirements',
      'Undocumented immigrant license access varies',
      'Teen licensing graduated programs differ',
      'Senior license renewal requirements',
      'Out-of-state license transfer processes',
    ],
    keySourceTypes: ['State DMV', 'AAA', 'AAMVA'],
    commonQuestions: [
      'What do I need to get a license?',
      'How do I transfer my license?',
      'Are there special requirements for new drivers?',
    ],
    dailyLifeImpact: 'Barrier to entry for driving.',
  },

  'tr_12_dui_laws': {
    talkingPoints: [
      'BAC limit 0.08 nationally, some states stricter',
      'Zero tolerance for under-21 drivers',
      'First offense consequences vary widely',
      'Ignition interlock requirements expanding',
      'DUI checkpoints legal in most states',
    ],
    keySourceTypes: ['State DMV', 'MADD', 'State traffic safety office'],
    commonQuestions: [
      'What is the BAC limit?',
      'What are the penalties for DUI?',
      'Are there DUI checkpoints?',
    ],
    dailyLifeImpact: 'Critical for anyone who drinks and drives.',
  },

  'tr_13_scooter_ebike': {
    talkingPoints: [
      'EV incentives vary by state',
      'Charging infrastructure improving rapidly',
      'E-bike regulations differ from regular bikes',
      'Electric scooter rules vary widely',
      'HOV lane access for EVs in some states',
    ],
    keySourceTypes: ['State energy office', 'PlugShare', 'DOE Alternative Fuels Data Center'],
    commonQuestions: [
      'Are there EV incentives?',
      'How is the charging infrastructure?',
      'Where can I ride an e-bike?',
    ],
    dailyLifeImpact: 'Affects EV adoption practicality.',
  },

  'tr_14_airport_access': {
    talkingPoints: [
      'Distance to major airport varies widely',
      'Public transit connections to airport matter',
      'Regional airports offer alternatives',
      'Airport traffic and parking considerations',
      'Direct flight availability key for travelers',
    ],
    keySourceTypes: ['Airport website', 'Transit agency', 'Flight search tools'],
    commonQuestions: [
      'How far is the airport?',
      'Can I take public transit to the airport?',
      'What destinations have direct flights?',
    ],
    dailyLifeImpact: 'Important for frequent travelers.',
  },

  'tr_15_traffic_congestion': {
    talkingPoints: [
      'Commute times vary dramatically by metro',
      'Peak hour delays quantified by INRIX',
      'Work from home reducing some congestion',
      'Congestion pricing emerging in some cities',
      'Infrastructure investments aim to reduce delays',
    ],
    keySourceTypes: ['INRIX', 'Texas A&M Urban Mobility Report', 'Google Maps traffic'],
    commonQuestions: [
      'How bad is traffic?',
      'What are typical commute times?',
      'When is rush hour?',
    ],
    dailyLifeImpact: 'Daily time and stress factor.',
  },
};
