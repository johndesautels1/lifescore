/**
 * LIFE SCORE™ - Transportation & Daily Movement Metrics (15 Metrics)
 * Category: transportation
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { MetricDefinition } from '../types/metrics';

export const TRANSPORTATION_METRICS: MetricDefinition[] = [
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'World-class transit', score: 100 },
      { level: 4, label: 'Good', description: 'Comprehensive system', score: 80 },
      { level: 3, label: 'Adequate', description: 'Basic coverage', score: 60 },
      { level: 2, label: 'Poor', description: 'Limited service', score: 40 },
      { level: 1, label: 'Very Poor', description: 'Minimal/none', score: 20 }
    ] }
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
    scoringCriteria: { type: 'range', minValue: 0, maxValue: 100 }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'Protected lanes, bike-share', score: 100 },
      { level: 4, label: 'Good', description: 'Good network', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some infrastructure', score: 60 },
      { level: 2, label: 'Poor', description: 'Limited lanes', score: 40 },
      { level: 1, label: 'Very Poor', description: 'Dangerous for cycling', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Car Optional', description: 'Easy car-free life', score: 100 },
      { level: 4, label: 'Low Dependency', description: 'Car helpful not needed', score: 80 },
      { level: 3, label: 'Moderate', description: 'Car often needed', score: 60 },
      { level: 2, label: 'High Dependency', description: 'Car usually required', score: 40 },
      { level: 1, label: 'Car Essential', description: 'Impossible without car', score: 20 }
    ] }
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
    scoringCriteria: { type: 'categorical', options: [
      { value: 'fully_legal', label: 'Fully Legal & Available', score: 100 },
      { value: 'regulated', label: 'Legal with Regulations', score: 80 },
      { value: 'restricted', label: 'Restricted', score: 50 },
      { value: 'limited', label: 'Very Limited', score: 30 },
      { value: 'banned', label: 'Banned/Unavailable', score: 0 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Reasonable', description: 'Appropriate speeds', score: 100 },
      { level: 4, label: 'Reasonable', description: 'Generally fair', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some slow zones', score: 60 },
      { level: 2, label: 'Slow', description: 'Often too slow', score: 40 },
      { level: 1, label: 'Very Slow', description: 'Frustratingly slow', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'None/Banned', description: 'No cameras', score: 100 },
      { level: 4, label: 'Very Few', description: 'Minimal cameras', score: 80 },
      { level: 3, label: 'Some', description: 'Limited use', score: 60 },
      { level: 2, label: 'Many', description: 'Widespread cameras', score: 40 },
      { level: 1, label: 'Extensive', description: 'Heavy surveillance', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Relaxed', description: 'Plentiful, cheap parking', score: 100 },
      { level: 4, label: 'Relaxed', description: 'Easy parking', score: 80 },
      { level: 3, label: 'Moderate', description: 'Standard enforcement', score: 60 },
      { level: 2, label: 'Strict', description: 'Aggressive enforcement', score: 40 },
      { level: 1, label: 'Very Strict', description: 'Expensive, heavy ticketing', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'None', description: 'No tolls', score: 100 },
      { level: 4, label: 'Minimal', description: 'Few toll roads', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some tolls', score: 60 },
      { level: 2, label: 'Many', description: 'Extensive tolls', score: 40 },
      { level: 1, label: 'Extensive', description: 'Heavy toll burden', score: 20 }
    ] }
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
    scoringCriteria: { type: 'categorical', options: [
      { value: 'none', label: 'No Inspection Required', score: 100 },
      { value: 'safety_only', label: 'Safety Only', score: 80 },
      { value: 'emissions_only', label: 'Emissions Only', score: 70 },
      { value: 'both', label: 'Safety + Emissions', score: 50 },
      { value: 'strict', label: 'Strict Requirements', score: 30 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Easy', description: 'Simple test, easy renewal', score: 100 },
      { level: 4, label: 'Easy', description: 'Standard process', score: 80 },
      { level: 3, label: 'Moderate', description: 'Some difficulty', score: 60 },
      { level: 2, label: 'Difficult', description: 'Complex requirements', score: 40 },
      { level: 1, label: 'Very Difficult', description: 'Extensive training/tests', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Reasonable', description: 'Proportionate penalties', score: 100 },
      { level: 4, label: 'Moderate', description: 'Standard penalties', score: 80 },
      { level: 3, label: 'Strict', description: 'Above average penalties', score: 60 },
      { level: 2, label: 'Very Strict', description: 'Harsh penalties', score: 40 },
      { level: 1, label: 'Extreme', description: 'Severe consequences', score: 20 }
    ] }
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
    scoringCriteria: { type: 'categorical', options: [
      { value: 'unrestricted', label: 'Largely Unrestricted', score: 100 },
      { value: 'light_regulation', label: 'Light Regulation', score: 80 },
      { value: 'moderate', label: 'Moderate Rules', score: 60 },
      { value: 'restrictive', label: 'Restrictive', score: 40 },
      { value: 'banned', label: 'Banned/Heavily Restricted', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Excellent', description: 'Major hub, great access', score: 100 },
      { level: 4, label: 'Good', description: 'Good airport, many flights', score: 80 },
      { level: 3, label: 'Adequate', description: 'Decent options', score: 60 },
      { level: 2, label: 'Limited', description: 'Few flights', score: 40 },
      { level: 1, label: 'Poor', description: 'Remote/limited airport', score: 20 }
    ] }
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
    scoringCriteria: { type: 'scale', levels: [
      { level: 5, label: 'Very Light', description: 'Minimal congestion', score: 100 },
      { level: 4, label: 'Light', description: 'Below average', score: 80 },
      { level: 3, label: 'Moderate', description: 'Average traffic', score: 60 },
      { level: 2, label: 'Heavy', description: 'Above average', score: 40 },
      { level: 1, label: 'Severe', description: 'Extreme congestion', score: 20 }
    ] }
  }
];
