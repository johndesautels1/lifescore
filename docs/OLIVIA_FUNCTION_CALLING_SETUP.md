# Olivia Function Calling Setup

## Overview

This document explains how to add the `getFieldEvidence` function to the Olivia OpenAI Assistant, allowing her to dynamically fetch source data for any metric.

## API Endpoint

**URL:** `https://clueslifescore.com/api/olivia/field-evidence`
**Method:** POST
**Content-Type:** application/json

### Request Body
```json
{
  "comparisonId": "abc123-def456",
  "metricId": "pf_01_cannabis_legal",
  "city": "Austin"  // Optional - filter to specific city
}
```

### Response
```json
{
  "metricId": "pf_01_cannabis_legal",
  "metricName": "Cannabis Legality",
  "city": "Austin",
  "evidence": [
    {
      "title": "NORML Texas Laws",
      "url": "https://norml.org/laws/texas",
      "snippet": "Texas has decriminalized possession of small amounts...",
      "city": "Austin"
    }
  ],
  "scores": {
    "city1": 45,
    "city2": 78
  }
}
```

---

## OpenAI Assistant Setup

### Step 1: Go to OpenAI Dashboard

1. Go to https://platform.openai.com/assistants
2. Select your Olivia assistant
3. Scroll down to **Tools** section
4. Click **Add function**

### Step 2: Add the Function Definition

Paste this JSON into the function configuration:

```json
{
  "name": "getFieldEvidence",
  "description": "Fetches the source evidence and citations for a specific LIFE SCORE metric from a saved comparison. Use this when a user asks where the data came from, wants to see sources, or asks about a specific metric's evidence.",
  "parameters": {
    "type": "object",
    "properties": {
      "comparisonId": {
        "type": "string",
        "description": "The comparison ID from the current context (found in context.comparison.comparisonId)"
      },
      "metricId": {
        "type": "string",
        "description": "The metric ID to fetch evidence for. Examples: pf_01_cannabis_legal, hp_03_property_tax_rate, bw_10_income_tax",
        "enum": [
          "pf_01_cannabis_legal",
          "pf_02_alcohol_restrictions",
          "pf_03_gambling_legal",
          "pf_04_prostitution_status",
          "pf_05_drug_possession",
          "pf_06_abortion_access",
          "pf_07_lgbtq_rights",
          "pf_08_assisted_dying",
          "pf_09_smoking_restrictions",
          "pf_10_public_drinking",
          "pf_11_helmet_laws",
          "pf_12_seatbelt_laws",
          "pf_13_jaywalking",
          "pf_14_curfew_laws",
          "pf_15_noise_ordinances",
          "hp_01_hoa_prevalence",
          "hp_02_hoa_power",
          "hp_03_property_tax_rate",
          "hp_04_rent_control",
          "hp_05_eviction_protection",
          "hp_06_zoning_restrictions",
          "hp_07_building_permits",
          "hp_08_short_term_rental",
          "hp_09_adu_laws",
          "hp_10_home_business",
          "hp_11_eminent_domain",
          "hp_12_squatter_rights",
          "hp_13_historic_preservation",
          "hp_14_foreign_ownership",
          "hp_15_transfer_tax",
          "hp_16_lawn_maintenance",
          "hp_17_exterior_modifications",
          "hp_18_fence_regulations",
          "hp_19_parking_requirements",
          "hp_20_pet_restrictions",
          "bw_01_business_license",
          "bw_02_occupational_license",
          "bw_03_minimum_wage",
          "bw_04_right_to_work",
          "bw_05_employment_protections",
          "bw_06_paid_leave",
          "bw_07_parental_leave",
          "bw_08_non_compete",
          "bw_09_corporate_tax",
          "bw_10_income_tax",
          "bw_11_sales_tax",
          "bw_12_gig_economy",
          "bw_13_work_visa",
          "bw_14_remote_work",
          "bw_15_overtime_rules",
          "bw_16_union_laws",
          "bw_17_workplace_safety",
          "bw_18_anti_discrimination",
          "bw_19_startup_friendliness",
          "bw_20_food_truck_regs",
          "bw_21_contractor_license",
          "bw_22_health_insurance_mandate",
          "bw_23_tip_credit",
          "bw_24_banking_access",
          "bw_25_crypto_regulations",
          "tr_01_public_transit",
          "tr_02_walkability",
          "tr_03_bike_infrastructure",
          "tr_04_car_dependency",
          "tr_05_rideshare_regs",
          "tr_06_speed_limits",
          "tr_07_traffic_cameras",
          "tr_08_parking_regulations",
          "tr_09_toll_roads",
          "tr_10_vehicle_inspection",
          "tr_11_license_requirements",
          "tr_12_dui_laws",
          "tr_13_electric_vehicles",
          "tr_14_airport_access",
          "tr_15_traffic_congestion",
          "pl_01_incarceration_rate",
          "pl_02_police_per_capita",
          "pl_03_civil_forfeiture",
          "pl_04_mandatory_minimums",
          "pl_05_bail_system",
          "pl_06_police_oversight",
          "pl_07_qualified_immunity",
          "pl_08_legal_costs",
          "pl_09_court_efficiency",
          "pl_10_jury_rights",
          "pl_11_surveillance",
          "pl_12_search_seizure",
          "pl_13_death_penalty",
          "pl_14_prison_conditions",
          "pl_15_expungement",
          "sl_01_free_speech",
          "sl_02_press_freedom",
          "sl_03_internet_freedom",
          "sl_04_hate_speech_laws",
          "sl_05_protest_rights",
          "sl_06_religious_freedom",
          "sl_07_privacy_laws",
          "sl_08_dress_codes",
          "sl_09_cultural_tolerance",
          "sl_10_defamation_laws"
        ]
      },
      "city": {
        "type": "string",
        "description": "Optional: Filter evidence to a specific city name (e.g., 'Austin' or 'Portland')"
      }
    },
    "required": ["comparisonId", "metricId"]
  }
}
```

### Step 3: Add Action (API Call)

Under the function, configure the action:

1. **Type:** API Call
2. **URL:** `https://clueslifescore.com/api/olivia/field-evidence`
3. **Method:** POST
4. **Headers:**
   - `Content-Type: application/json`
5. **Body:** The function parameters will be sent as JSON

---

## How Olivia Uses This

When a user asks something like:
- "Where did you get the cannabis data?"
- "What are your sources for the property tax information?"
- "Show me the evidence for Austin's LGBTQ rights score"

Olivia will:
1. Identify the relevant metric ID from the question
2. Call `getFieldEvidence` with the comparison ID and metric ID
3. Receive the source URLs, titles, and snippets
4. Present the evidence to the user conversationally

---

## Example Conversation

**User:** "Where did you get the data about cannabis legality in Austin?"

**Olivia thinks:** I need to fetch evidence for pf_01_cannabis_legal

**Olivia calls:**
```json
{
  "comparisonId": "current-comparison-id",
  "metricId": "pf_01_cannabis_legal",
  "city": "Austin"
}
```

**API returns:**
```json
{
  "metricId": "pf_01_cannabis_legal",
  "metricName": "Cannabis Legality",
  "evidence": [
    {
      "title": "NORML Texas Cannabis Laws",
      "url": "https://norml.org/laws/texas",
      "snippet": "Texas has not legalized recreational cannabis. Medical cannabis is limited to low-THC products...",
      "city": "Austin"
    },
    {
      "title": "Austin City Policy on Cannabis",
      "url": "https://austintexas.gov/...",
      "snippet": "Austin has deprioritized enforcement of cannabis possession under 4 ounces...",
      "city": "Austin"
    }
  ],
  "scores": {
    "city1": 42,
    "city2": 78
  }
}
```

**Olivia responds:** "The cannabis data for Austin came from NORML and Austin city policy documents. NORML reports that Texas hasn't legalized recreational cannabis, though medical access exists for low-THC products. Interestingly, Austin itself has deprioritized enforcement for possession under four ounces, which is why the enforcement score is a bit higher than you might expect for Texas. The overall score of 42 reflects the legal restrictions at the state level, tempered by Austin's more relaxed local enforcement."

---

## Metric ID Quick Reference

| Category | Prefix | Example |
|----------|--------|---------|
| Personal Freedom | pf_ | pf_01_cannabis_legal |
| Housing & Property | hp_ | hp_03_property_tax_rate |
| Business & Work | bw_ | bw_10_income_tax |
| Transportation | tr_ | tr_01_public_transit |
| Policing & Legal | pl_ | pl_03_civil_forfeiture |
| Speech & Lifestyle | sl_ | sl_07_privacy_laws |
