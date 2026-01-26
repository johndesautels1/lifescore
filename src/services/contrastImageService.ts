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

// Prompt templates for key metrics
// These cover the most commonly discussed differences
const METRIC_TEMPLATES: MetricPromptTemplate[] = [
  // ════════════════════════════════════════════════════════════════
  // PERSONAL FREEDOM (PF)
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
    metricId: 'pf_02_alcohol_purchase',
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
    metricId: 'pf_04_prostitution',
    topic: 'Adult Services',
    category: 'Personal Freedom',
    positiveContext: 'Well-lit, regulated entertainment district with safety measures visible',
    negativeContext: 'Dark alley with danger signs, underground feeling',
    positiveCaption: 'Regulated adult services',
    negativeCaption: 'Unregulated restrictions',
  },
  {
    metricId: 'pf_05_gun_rights',
    topic: 'Gun Rights',
    category: 'Personal Freedom',
    positiveContext: 'Responsible gun owner at a professional shooting range, safety equipment, training',
    negativeContext: 'Empty gun store with permit requirements posted, bureaucratic process',
    positiveCaption: 'Protected gun rights',
    negativeCaption: 'Strict gun control',
  },
  {
    metricId: 'pf_06_speech_freedom',
    topic: 'Free Speech',
    category: 'Personal Freedom',
    positiveContext: 'Peaceful protest with diverse signs, public square, democratic expression',
    negativeContext: 'Empty public square with surveillance cameras, restricted gathering',
    positiveCaption: 'Protected free speech',
    negativeCaption: 'Speech restrictions',
  },
  {
    metricId: 'pf_07_religious_freedom',
    topic: 'Religious Freedom',
    category: 'Personal Freedom',
    positiveContext: 'Diverse houses of worship on same street, mosque, church, temple together',
    negativeContext: 'Single state-approved religious building, uniform architecture',
    positiveCaption: 'Religious diversity',
    negativeCaption: 'Religious restrictions',
  },
  {
    metricId: 'pf_08_lgbtq_rights',
    topic: 'LGBTQ Rights',
    category: 'Personal Freedom',
    positiveContext: 'Pride celebration with rainbow flags, happy couples, inclusive community',
    negativeContext: 'Plain street with no visible LGBTQ representation, muted colors',
    positiveCaption: 'LGBTQ acceptance',
    negativeCaption: 'Limited LGBTQ rights',
  },

  // ════════════════════════════════════════════════════════════════
  // HOMEOWNER FREEDOM (HP)
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'hp_01_hoa_prevalence',
    topic: 'HOA Freedom',
    category: 'Homeowner Freedom',
    positiveContext: 'Colorful, unique homes with personality, gardens, creative landscaping',
    negativeContext: 'Identical cookie-cutter homes in strict HOA community, no variation',
    positiveCaption: 'Freedom from HOA rules',
    negativeCaption: 'Strict HOA regulations',
  },
  {
    metricId: 'hp_02_zoning_flexibility',
    topic: 'Zoning Freedom',
    category: 'Homeowner Freedom',
    positiveContext: 'Mixed-use neighborhood with home offices, small shops, live-work spaces',
    negativeContext: 'Strictly separated residential zone, no commercial allowed signs',
    positiveCaption: 'Flexible zoning',
    negativeCaption: 'Strict zoning laws',
  },
  {
    metricId: 'hp_03_rental_freedom',
    topic: 'Rental Income Freedom',
    category: 'Homeowner Freedom',
    positiveContext: 'Airbnb-friendly apartment building, tourists with luggage, vacation vibes',
    negativeContext: 'No short-term rentals sign, strict building rules posted',
    positiveCaption: 'Rental freedom',
    negativeCaption: 'Rental restrictions',
  },
  {
    metricId: 'hp_04_property_tax',
    topic: 'Property Tax Burden',
    category: 'Homeowner Freedom',
    positiveContext: 'Family moving into affordable home, happy homeowners, manageable costs',
    negativeContext: 'Stressed homeowner looking at large tax bill, worried expression',
    positiveCaption: 'Low property taxes',
    negativeCaption: 'High property tax burden',
  },

  // ════════════════════════════════════════════════════════════════
  // ECONOMIC FREEDOM (EF)
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'ef_01_income_tax',
    topic: 'Income Tax',
    category: 'Economic Freedom',
    positiveContext: 'Professional keeping more of their paycheck, simple tax filing, financial freedom',
    negativeContext: 'Person overwhelmed by complex tax forms, high tax rate visible',
    positiveCaption: 'Low income taxes',
    negativeCaption: 'High income taxes',
  },
  {
    metricId: 'ef_02_sales_tax',
    topic: 'Sales Tax',
    category: 'Economic Freedom',
    positiveContext: 'Happy shopper at checkout with no sales tax, affordable prices',
    negativeContext: 'Shopper surprised by high sales tax added at register',
    positiveCaption: 'No/low sales tax',
    negativeCaption: 'High sales tax',
  },
  {
    metricId: 'ef_03_business_friendly',
    topic: 'Business Climate',
    category: 'Economic Freedom',
    positiveContext: 'Entrepreneur opening new business, ribbon cutting, supportive community',
    negativeContext: 'Closed storefronts, for lease signs, difficult business environment',
    positiveCaption: 'Business-friendly climate',
    negativeCaption: 'Difficult for business',
  },
  {
    metricId: 'ef_04_minimum_wage',
    topic: 'Labor Market Freedom',
    category: 'Economic Freedom',
    positiveContext: 'Flexible job market, freelancer working from cafe, gig economy',
    negativeContext: 'Regulated workplace, strict labor rules posted, limited flexibility',
    positiveCaption: 'Flexible labor market',
    negativeCaption: 'Regulated labor market',
  },
  {
    metricId: 'ef_05_crypto_friendly',
    topic: 'Crypto Adoption',
    category: 'Economic Freedom',
    positiveContext: 'Bitcoin accepted sign in shop window, modern digital payment',
    negativeContext: 'Cash only signs, traditional banking only, no crypto',
    positiveCaption: 'Crypto-friendly',
    negativeCaption: 'Crypto restrictions',
  },

  // ════════════════════════════════════════════════════════════════
  // QUALITY OF LIFE (QL)
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'ql_01_cost_of_living',
    topic: 'Cost of Living',
    category: 'Quality of Life',
    positiveContext: 'Family enjoying spacious home with yard, affordable lifestyle, comfortable living',
    negativeContext: 'Cramped expensive apartment, high rent signs, stressed budgeting',
    positiveCaption: 'Affordable living',
    negativeCaption: 'High cost of living',
  },
  {
    metricId: 'ql_02_healthcare_access',
    topic: 'Healthcare Access',
    category: 'Quality of Life',
    positiveContext: 'Modern hospital with short wait times, accessible healthcare',
    negativeContext: 'Crowded emergency room, long wait time signs',
    positiveCaption: 'Good healthcare access',
    negativeCaption: 'Limited healthcare',
  },
  {
    metricId: 'ql_03_education_quality',
    topic: 'Education Quality',
    category: 'Quality of Life',
    positiveContext: 'Modern school with engaged students, quality education visible',
    negativeContext: 'Underfunded school, overcrowded classroom, limited resources',
    positiveCaption: 'Quality education',
    negativeCaption: 'Education challenges',
  },
  {
    metricId: 'ql_04_safety',
    topic: 'Public Safety',
    category: 'Quality of Life',
    positiveContext: 'Safe neighborhood at night, well-lit streets, people walking comfortably',
    negativeContext: 'Person looking cautiously on dimly lit street, security concerns',
    positiveCaption: 'Safe community',
    negativeCaption: 'Safety concerns',
  },
  {
    metricId: 'ql_05_climate',
    topic: 'Climate',
    category: 'Quality of Life',
    positiveContext: 'Perfect weather day, people enjoying outdoor activities, sunshine',
    negativeContext: 'Extreme weather conditions, people bundled up or seeking shelter',
    positiveCaption: 'Pleasant climate',
    negativeCaption: 'Challenging weather',
  },

  // ════════════════════════════════════════════════════════════════
  // LIFESTYLE (LS)
  // ════════════════════════════════════════════════════════════════
  {
    metricId: 'ls_01_nightlife',
    topic: 'Nightlife',
    category: 'Lifestyle',
    positiveContext: 'Vibrant nightlife district, clubs and bars open late, entertainment',
    negativeContext: 'Quiet streets at night, early closing times, limited options',
    positiveCaption: 'Active nightlife',
    negativeCaption: 'Limited nightlife',
  },
  {
    metricId: 'ls_02_food_scene',
    topic: 'Food Scene',
    category: 'Lifestyle',
    positiveContext: 'Diverse restaurant row with cuisines from around the world, food culture',
    negativeContext: 'Limited restaurant options, chain restaurants only',
    positiveCaption: 'Diverse food scene',
    negativeCaption: 'Limited dining options',
  },
  {
    metricId: 'ls_03_outdoor_recreation',
    topic: 'Outdoor Recreation',
    category: 'Lifestyle',
    positiveContext: 'Beautiful parks, hiking trails, beaches, outdoor activities',
    negativeContext: 'Urban concrete jungle, limited green space, no nature access',
    positiveCaption: 'Great outdoors',
    negativeCaption: 'Limited outdoor options',
  },
  {
    metricId: 'ls_04_cultural_scene',
    topic: 'Arts & Culture',
    category: 'Lifestyle',
    positiveContext: 'Vibrant arts district, museums, galleries, street art',
    negativeContext: 'Minimal cultural offerings, closed theater, no museums',
    positiveCaption: 'Rich cultural scene',
    negativeCaption: 'Limited culture',
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
  const response = await fetch('/api/olivia/contrast-images', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
