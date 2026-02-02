/**
 * 200 Major Metropolitan Areas
 * 100 North American + 100 European cities
 *
 * These are dropdown options - the LLM evaluates metrics using its knowledge
 */

export interface Metro {
  city: string;
  country: string;
  region?: string;
}

// ============================================================================
// NORTH AMERICAN METROS (100)
// ============================================================================

export const NORTH_AMERICAN_METROS: Metro[] = [
  // United States - Major Markets
  { city: "New York", country: "USA", region: "New York" },
  { city: "Los Angeles", country: "USA", region: "California" },
  { city: "Chicago", country: "USA", region: "Illinois" },
  { city: "Houston", country: "USA", region: "Texas" },
  { city: "Phoenix", country: "USA", region: "Arizona" },
  { city: "Philadelphia", country: "USA", region: "Pennsylvania" },
  { city: "San Antonio", country: "USA", region: "Texas" },
  { city: "San Diego", country: "USA", region: "California" },
  { city: "Dallas", country: "USA", region: "Texas" },
  { city: "San Jose", country: "USA", region: "California" },
  { city: "Austin", country: "USA", region: "Texas" },
  { city: "Jacksonville", country: "USA", region: "Florida" },
  { city: "Fort Worth", country: "USA", region: "Texas" },
  { city: "Columbus", country: "USA", region: "Ohio" },
  { city: "Charlotte", country: "USA", region: "North Carolina" },
  { city: "San Francisco", country: "USA", region: "California" },
  { city: "Indianapolis", country: "USA", region: "Indiana" },
  { city: "Seattle", country: "USA", region: "Washington" },
  { city: "Denver", country: "USA", region: "Colorado" },
  { city: "Boston", country: "USA", region: "Massachusetts" },
  { city: "El Paso", country: "USA", region: "Texas" },
  { city: "Nashville", country: "USA", region: "Tennessee" },
  { city: "Detroit", country: "USA", region: "Michigan" },
  { city: "Portland", country: "USA", region: "Oregon" },
  { city: "Las Vegas", country: "USA", region: "Nevada" },
  { city: "Memphis", country: "USA", region: "Tennessee" },
  { city: "Louisville", country: "USA", region: "Kentucky" },
  { city: "Baltimore", country: "USA", region: "Maryland" },
  { city: "Milwaukee", country: "USA", region: "Wisconsin" },
  { city: "Albuquerque", country: "USA", region: "New Mexico" },
  { city: "Tucson", country: "USA", region: "Arizona" },
  { city: "Fresno", country: "USA", region: "California" },
  { city: "Sacramento", country: "USA", region: "California" },
  { city: "Mesa", country: "USA", region: "Arizona" },
  { city: "Atlanta", country: "USA", region: "Georgia" },
  { city: "Kansas City", country: "USA", region: "Missouri" },
  { city: "Colorado Springs", country: "USA", region: "Colorado" },
  { city: "Miami", country: "USA", region: "Florida" },
  { city: "Raleigh", country: "USA", region: "North Carolina" },
  { city: "Omaha", country: "USA", region: "Nebraska" },
  { city: "Long Beach", country: "USA", region: "California" },
  { city: "Virginia Beach", country: "USA", region: "Virginia" },
  { city: "Oakland", country: "USA", region: "California" },
  { city: "Minneapolis", country: "USA", region: "Minnesota" },
  { city: "Tampa", country: "USA", region: "Florida" },
  { city: "Tulsa", country: "USA", region: "Oklahoma" },
  { city: "Arlington", country: "USA", region: "Texas" },
  { city: "New Orleans", country: "USA", region: "Louisiana" },
  { city: "Wichita", country: "USA", region: "Kansas" },
  { city: "Cleveland", country: "USA", region: "Ohio" },
  { city: "Bakersfield", country: "USA", region: "California" },
  { city: "Aurora", country: "USA", region: "Colorado" },
  { city: "Anaheim", country: "USA", region: "California" },
  { city: "Honolulu", country: "USA", region: "Hawaii" },
  { city: "Santa Ana", country: "USA", region: "California" },
  { city: "Riverside", country: "USA", region: "California" },
  { city: "Corpus Christi", country: "USA", region: "Texas" },
  { city: "Lexington", country: "USA", region: "Kentucky" },
  { city: "Henderson", country: "USA", region: "Nevada" },
  { city: "Stockton", country: "USA", region: "California" },
  { city: "Saint Paul", country: "USA", region: "Minnesota" },
  { city: "Cincinnati", country: "USA", region: "Ohio" },
  { city: "St. Louis", country: "USA", region: "Missouri" },
  { city: "Pittsburgh", country: "USA", region: "Pennsylvania" },
  { city: "Greensboro", country: "USA", region: "North Carolina" },
  { city: "Lincoln", country: "USA", region: "Nebraska" },
  { city: "Anchorage", country: "USA", region: "Alaska" },
  { city: "Plano", country: "USA", region: "Texas" },
  { city: "Orlando", country: "USA", region: "Florida" },
  { city: "Irvine", country: "USA", region: "California" },
  { city: "Newark", country: "USA", region: "New Jersey" },
  { city: "Durham", country: "USA", region: "North Carolina" },
  { city: "Chula Vista", country: "USA", region: "California" },
  { city: "Toledo", country: "USA", region: "Ohio" },
  { city: "Fort Wayne", country: "USA", region: "Indiana" },
  { city: "St. Petersburg", country: "USA", region: "Florida" },
  { city: "Laredo", country: "USA", region: "Texas" },
  { city: "Jersey City", country: "USA", region: "New Jersey" },
  { city: "Chandler", country: "USA", region: "Arizona" },
  { city: "Madison", country: "USA", region: "Wisconsin" },
  { city: "Lubbock", country: "USA", region: "Texas" },
  { city: "Scottsdale", country: "USA", region: "Arizona" },
  { city: "Reno", country: "USA", region: "Nevada" },
  { city: "Buffalo", country: "USA", region: "New York" },
  { city: "Gilbert", country: "USA", region: "Arizona" },
  { city: "Glendale", country: "USA", region: "Arizona" },
  { city: "North Las Vegas", country: "USA", region: "Nevada" },
  { city: "Winston-Salem", country: "USA", region: "North Carolina" },
  // Canada
  { city: "Toronto", country: "Canada", region: "Ontario" },
  { city: "Montreal", country: "Canada", region: "Quebec" },
  { city: "Vancouver", country: "Canada", region: "British Columbia" },
  { city: "Calgary", country: "Canada", region: "Alberta" },
  { city: "Edmonton", country: "Canada", region: "Alberta" },
  { city: "Ottawa", country: "Canada", region: "Ontario" },
  { city: "Winnipeg", country: "Canada", region: "Manitoba" },
  { city: "Quebec City", country: "Canada", region: "Quebec" },
  { city: "Hamilton", country: "Canada", region: "Ontario" },
  { city: "Halifax", country: "Canada", region: "Nova Scotia" },
  { city: "Victoria", country: "Canada", region: "British Columbia" },
  { city: "Saskatoon", country: "Canada", region: "Saskatchewan" },
];

// ============================================================================
// EUROPEAN METROS (100)
// ============================================================================

export const EUROPEAN_METROS: Metro[] = [
  // United Kingdom
  { city: "London", country: "UK" },
  { city: "Birmingham", country: "UK" },
  { city: "Manchester", country: "UK" },
  { city: "Glasgow", country: "UK" },
  { city: "Liverpool", country: "UK" },
  { city: "Bristol", country: "UK" },
  { city: "Edinburgh", country: "UK" },
  { city: "Leeds", country: "UK" },
  { city: "Sheffield", country: "UK" },
  { city: "Newcastle", country: "UK" },
  { city: "Belfast", country: "UK" },
  { city: "Cardiff", country: "UK" },
  // Ireland
  { city: "Dublin", country: "Ireland" },
  { city: "Cork", country: "Ireland" },
  { city: "Galway", country: "Ireland" },
  // Germany
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Frankfurt", country: "Germany" },
  { city: "Cologne", country: "Germany" },
  { city: "Düsseldorf", country: "Germany" },
  { city: "Stuttgart", country: "Germany" },
  { city: "Leipzig", country: "Germany" },
  { city: "Dresden", country: "Germany" },
  { city: "Hanover", country: "Germany" },
  // France
  { city: "Paris", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Toulouse", country: "France" },
  { city: "Nice", country: "France" },
  { city: "Nantes", country: "France" },
  { city: "Strasbourg", country: "France" },
  { city: "Bordeaux", country: "France" },
  { city: "Lille", country: "France" },
  { city: "Montpellier", country: "France" },
  // Spain
  { city: "Madrid", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Valencia", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Bilbao", country: "Spain" },
  { city: "Malaga", country: "Spain" },
  { city: "Zaragoza", country: "Spain" },
  // Portugal
  { city: "Lisbon", country: "Portugal" },
  { city: "Porto", country: "Portugal" },
  { city: "Braga", country: "Portugal" },
  // Italy
  { city: "Rome", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Naples", country: "Italy" },
  { city: "Turin", country: "Italy" },
  { city: "Florence", country: "Italy" },
  { city: "Bologna", country: "Italy" },
  { city: "Venice", country: "Italy" },
  { city: "Genoa", country: "Italy" },
  // Netherlands
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Rotterdam", country: "Netherlands" },
  { city: "The Hague", country: "Netherlands" },
  { city: "Utrecht", country: "Netherlands" },
  { city: "Eindhoven", country: "Netherlands" },
  // Belgium
  { city: "Brussels", country: "Belgium" },
  { city: "Antwerp", country: "Belgium" },
  { city: "Ghent", country: "Belgium" },
  // Austria
  { city: "Vienna", country: "Austria" },
  { city: "Salzburg", country: "Austria" },
  { city: "Graz", country: "Austria" },
  // Switzerland
  { city: "Zurich", country: "Switzerland" },
  { city: "Geneva", country: "Switzerland" },
  { city: "Basel", country: "Switzerland" },
  { city: "Bern", country: "Switzerland" },
  // Nordic Countries
  { city: "Stockholm", country: "Sweden" },
  { city: "Gothenburg", country: "Sweden" },
  { city: "Malmö", country: "Sweden" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Aarhus", country: "Denmark" },
  { city: "Oslo", country: "Norway" },
  { city: "Bergen", country: "Norway" },
  { city: "Helsinki", country: "Finland" },
  { city: "Tampere", country: "Finland" },
  { city: "Reykjavik", country: "Iceland" },
  // Poland
  { city: "Warsaw", country: "Poland" },
  { city: "Krakow", country: "Poland" },
  { city: "Wroclaw", country: "Poland" },
  { city: "Gdansk", country: "Poland" },
  { city: "Poznan", country: "Poland" },
  // Czech Republic
  { city: "Prague", country: "Czech Republic" },
  { city: "Brno", country: "Czech Republic" },
  // Hungary
  { city: "Budapest", country: "Hungary" },
  // Greece
  { city: "Athens", country: "Greece" },
  { city: "Thessaloniki", country: "Greece" },
  // Other
  { city: "Bucharest", country: "Romania" },
  { city: "Sofia", country: "Bulgaria" },
  { city: "Zagreb", country: "Croatia" },
  { city: "Ljubljana", country: "Slovenia" },
  { city: "Bratislava", country: "Slovakia" },
  { city: "Tallinn", country: "Estonia" },
  { city: "Riga", country: "Latvia" },
  { city: "Vilnius", country: "Lithuania" },
  { city: "Luxembourg City", country: "Luxembourg" },
  { city: "Monaco", country: "Monaco" },
  // Additional Mediterranean
  { city: "Valletta", country: "Malta" },
  { city: "Nicosia", country: "Cyprus" },
];

// ============================================================================
// COMBINED & UTILITIES
// ============================================================================

export const ALL_METROS: Metro[] = [...NORTH_AMERICAN_METROS, ...EUROPEAN_METROS];

/**
 * Format metro for display
 */
export function formatMetro(metro: Metro): string {
  if (metro.region) {
    return `${metro.city}, ${metro.region}, ${metro.country}`;
  }
  return `${metro.city}, ${metro.country}`;
}

/**
 * Get metros sorted alphabetically by city name
 */
export function getMetrosSorted(metros: Metro[] = ALL_METROS): Metro[] {
  return [...metros].sort((a, b) => a.city.localeCompare(b.city));
}

/**
 * Search metros by name
 */
export function searchMetros(query: string, metros: Metro[] = ALL_METROS): Metro[] {
  const q = query.toLowerCase().trim();
  if (!q) return metros;

  return metros.filter(m =>
    m.city.toLowerCase().includes(q) ||
    m.country.toLowerCase().includes(q) ||
    (m.region && m.region.toLowerCase().includes(q))
  );
}

/**
 * Get metros grouped by country
 */
export function getMetrosByCountry(metros: Metro[] = ALL_METROS): Record<string, Metro[]> {
  const grouped: Record<string, Metro[]> = {};

  for (const metro of metros) {
    if (!grouped[metro.country]) {
      grouped[metro.country] = [];
    }
    grouped[metro.country].push(metro);
  }

  // Sort cities within each country
  for (const country of Object.keys(grouped)) {
    grouped[country].sort((a, b) => a.city.localeCompare(b.city));
  }

  return grouped;
}
