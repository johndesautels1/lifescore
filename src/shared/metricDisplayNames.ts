/**
 * LIFE SCORE™ Metric Display Names
 * Shared lookup map: raw metric IDs → human-readable display names
 *
 * Used by: gammaService, opusJudge, EvidencePanel, AdvancedVisuals, exportUtils
 * Single source of truth — DO NOT duplicate this map in other files.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

export const METRIC_DISPLAY_NAMES: Record<string, string> = {
  // Personal Freedom (15)
  'pf_01_cannabis_legal': 'Cannabis Legality',
  'pf_02_alcohol_restrictions': 'Alcohol Purchase Restrictions',
  'pf_03_gambling_legal': 'Gambling Legality',
  'pf_04_prostitution_status': 'Sex Work Legal Status',
  'pf_05_drug_possession': 'Drug Possession Penalties',
  'pf_06_abortion_access': 'Abortion Access',
  'pf_07_lgbtq_rights': 'LGBTQ+ Rights',
  'pf_08_euthanasia_status': 'Assisted Dying Laws',
  'pf_09_smoking_regulations': 'Smoking Restrictions',
  'pf_10_public_drinking': 'Public Drinking Laws',
  'pf_11_helmet_laws': 'Helmet Laws',
  'pf_12_seatbelt_enforcement': 'Seatbelt Laws',
  'pf_13_jaywalking': 'Jaywalking Enforcement',
  'pf_14_curfew_laws': 'Curfew Laws',
  'pf_15_noise_ordinances': 'Noise Ordinances',
  // Housing & Property (20)
  'hp_01_hoa_prevalence': 'HOA Prevalence',
  'hp_02_hoa_power': 'HOA Power & Restrictions',
  'hp_03_property_tax_rate': 'Property Tax Rate',
  'hp_04_rent_control': 'Rent Control Laws',
  'hp_05_eviction_protection': 'Tenant Eviction Protections',
  'hp_06_zoning_strictness': 'Zoning Restrictions',
  'hp_07_building_permits': 'Building Permit Requirements',
  'hp_08_short_term_rental': 'Short-Term Rental (Airbnb) Laws',
  'hp_09_adu_laws': 'ADU (Accessory Dwelling) Laws',
  'hp_10_home_business': 'Home Business Restrictions',
  'hp_11_eminent_domain': 'Eminent Domain Protections',
  'hp_12_squatter_rights': 'Squatter/Adverse Possession Rights',
  'hp_13_historic_preservation': 'Historic Preservation Rules',
  'hp_14_foreign_ownership': 'Foreign Property Ownership',
  'hp_15_transfer_taxes': 'Property Transfer Tax',
  'hp_16_lawn_regulations': 'Lawn Maintenance Requirements',
  'hp_17_exterior_colors': 'Exterior Modification Rules',
  'hp_18_fence_rules': 'Fence Regulations',
  'hp_19_vehicle_parking': 'Residential Parking Rules',
  'hp_20_pet_restrictions': 'Pet Ownership Restrictions',
  // Business & Work (25)
  'bw_01_business_license': 'Business License Requirements',
  'bw_02_occupational_licensing': 'Occupational Licensing',
  'bw_03_minimum_wage': 'Minimum Wage Level',
  'bw_04_right_to_work': 'Right to Work Laws',
  'bw_05_at_will_employment': 'Employment Protections',
  'bw_06_paid_leave_mandate': 'Mandatory Paid Leave',
  'bw_07_parental_leave': 'Parental Leave Requirements',
  'bw_08_non_compete': 'Non-Compete Enforceability',
  'bw_09_corporate_tax': 'Corporate Tax Rate',
  'bw_10_income_tax': 'State/Local Income Tax',
  'bw_11_sales_tax': 'Sales Tax Rate',
  'bw_12_freelance_regs': 'Gig Worker Regulations',
  'bw_13_work_visa': 'Work Visa Friendliness',
  'bw_14_remote_work': 'Remote Work Laws',
  'bw_15_overtime_rules': 'Overtime Requirements',
  'bw_16_union_rights': 'Union Rights & Laws',
  'bw_17_workplace_safety': 'Workplace Safety Standards',
  'bw_18_discrimination_law': 'Anti-Discrimination Laws',
  'bw_19_startup_ease': 'Startup Friendliness',
  'bw_20_food_truck': 'Food Truck Regulations',
  'bw_21_contractor_license': 'Contractor Licensing',
  'bw_22_health_insurance': 'Health Insurance Mandate',
  'bw_23_tip_credit': 'Tip Credit Laws',
  'bw_24_banking_access': 'Banking Access',
  'bw_25_crypto_regulation': 'Cryptocurrency Regulations',
  // Transportation (15)
  'tr_01_public_transit_quality': 'Public Transit Quality',
  'tr_02_walkability': 'Walkability Score',
  'tr_03_bike_infrastructure': 'Bike Infrastructure',
  'tr_04_car_dependency': 'Car Dependency Level',
  'tr_05_rideshare_legal': 'Rideshare Regulations',
  'tr_06_speed_limits': 'Speed Limit Enforcement',
  'tr_07_speed_camera': 'Traffic Camera Usage',
  'tr_08_parking_regs': 'Parking Regulations',
  'tr_09_toll_roads': 'Toll Road Prevalence',
  'tr_10_vehicle_inspection': 'Vehicle Inspection Requirements',
  'tr_11_drivers_license': 'Driver License Requirements',
  'tr_12_dui_laws': 'DUI Law Severity',
  'tr_13_scooter_ebike': 'E-Vehicle/E-Bike Laws',
  'tr_14_airport_access': 'Airport Accessibility',
  'tr_15_traffic_congestion': 'Traffic Congestion Level',
  // Policing & Legal (15)
  'pl_01_incarceration_rate': 'Incarceration Rate',
  'pl_02_police_per_capita': 'Police Per Capita',
  'pl_03_civil_forfeiture': 'Civil Asset Forfeiture',
  'pl_04_mandatory_minimum': 'Mandatory Minimum Sentences',
  'pl_05_bail_system': 'Cash Bail System',
  'pl_06_police_accountability': 'Police Oversight',
  'pl_07_qualified_immunity': 'Qualified Immunity Status',
  'pl_08_legal_costs': 'Legal System Costs',
  'pl_09_court_efficiency': 'Court System Efficiency',
  'pl_10_jury_trial': 'Jury Nullification Rights',
  'pl_11_surveillance': 'Government Surveillance',
  'pl_12_search_seizure': 'Search & Seizure Protections',
  'pl_13_death_penalty': 'Death Penalty Status',
  'pl_14_prison_conditions': 'Prison Conditions',
  'pl_15_record_expungement': 'Criminal Record Expungement',
  // Speech & Lifestyle (10)
  'sl_01_free_speech': 'Free Speech Protections',
  'sl_02_press_freedom': 'Press Freedom',
  'sl_03_internet_freedom': 'Internet Freedom',
  'sl_04_hate_speech_laws': 'Hate Speech Laws',
  'sl_05_protest_rights': 'Protest Rights',
  'sl_06_religious_freedom': 'Religious Freedom',
  'sl_07_data_privacy': 'Data Privacy Laws',
  'sl_08_dress_code': 'Dress Code Freedom',
  'sl_09_cultural_tolerance': 'Cultural Tolerance',
  'sl_10_defamation_laws': 'Defamation Laws'
};

/**
 * Convert a raw metric ID to a human-readable display name.
 * Falls back to a cleaned-up version of the ID if not found in the map.
 */
export function getMetricDisplayName(metricId: string): string {
  return METRIC_DISPLAY_NAMES[metricId] || metricId.replace(/_/g, ' ').replace(/^[a-z]{2}_\d{2}_/, '');
}
