const { logger } = require('~/config');

/**
 * Model pricing configuration with historical data
 * Prices are in USD per 1M tokens
 * 
 * Format:
 * - Each model has an array of pricing periods
 * - Periods are sorted by effectiveFrom date (newest first)
 * - effectiveTo is optional (null means current pricing)
 */
const PRICING_DATA = {
  // OpenAI Models
  'gpt-4o': [
    {
      effectiveFrom: new Date('2024-05-13'),
      prompt: 5.0,
      completion: 15.0,
    },
  ],
  'gpt-4o-mini': [
    {
      effectiveFrom: new Date('2024-07-18'),
      prompt: 0.15,
      completion: 0.6,
    },
  ],
  'gpt-4-turbo': [
    {
      effectiveFrom: new Date('2024-04-09'),
      prompt: 10.0,
      completion: 30.0,
    },
  ],
  'gpt-4': [
    {
      effectiveFrom: new Date('2024-01-01'),
      prompt: 30.0,
      completion: 60.0,
    },
  ],
  'gpt-3.5-turbo': [
    {
      effectiveFrom: new Date('2024-01-25'),
      prompt: 0.5,
      completion: 1.5,
    },
    {
      effectiveFrom: new Date('2023-11-06'),
      effectiveTo: new Date('2024-01-24'),
      prompt: 1.0,
      completion: 2.0,
    },
  ],
  'o1': [
    {
      effectiveFrom: new Date('2024-12-05'),
      prompt: 15.0,
      completion: 60.0,
      reasoning: 15.0,
    },
  ],
  'o1-mini': [
    {
      effectiveFrom: new Date('2024-09-12'),
      prompt: 3.0,
      completion: 12.0,
      reasoning: 3.0,
    },
  ],
  'o1-preview': [
    {
      effectiveFrom: new Date('2024-09-12'),
      prompt: 15.0,
      completion: 60.0,
      reasoning: 15.0,
    },
  ],

  // Anthropic Models
  'claude-3-5-sonnet': [
    {
      effectiveFrom: new Date('2024-06-20'),
      prompt: 3.0,
      completion: 15.0,
      cacheWrite: 3.75,
      cacheRead: 0.3,
    },
  ],
  'claude-3.5-sonnet': [
    {
      effectiveFrom: new Date('2024-06-20'),
      prompt: 3.0,
      completion: 15.0,
      cacheWrite: 3.75,
      cacheRead: 0.3,
    },
  ],
  'claude-3-5-haiku': [
    {
      effectiveFrom: new Date('2024-11-01'),
      prompt: 0.8,
      completion: 4.0,
      cacheWrite: 1.0,
      cacheRead: 0.08,
    },
  ],
  'claude-3.5-haiku': [
    {
      effectiveFrom: new Date('2024-11-01'),
      prompt: 0.8,
      completion: 4.0,
      cacheWrite: 1.0,
      cacheRead: 0.08,
    },
  ],
  'claude-3-opus': [
    {
      effectiveFrom: new Date('2024-03-04'),
      prompt: 15.0,
      completion: 75.0,
    },
  ],
  'claude-3-sonnet': [
    {
      effectiveFrom: new Date('2024-03-04'),
      prompt: 3.0,
      completion: 15.0,
    },
  ],
  'claude-3-haiku': [
    {
      effectiveFrom: new Date('2024-03-04'),
      prompt: 0.25,
      completion: 1.25,
      cacheWrite: 0.3,
      cacheRead: 0.03,
    },
  ],

  // Google Models
  'gemini-1.5-pro': [
    {
      effectiveFrom: new Date('2024-02-15'),
      prompt: 2.5,
      completion: 10.0,
    },
  ],
  'gemini-1.5-flash': [
    {
      effectiveFrom: new Date('2024-05-14'),
      prompt: 0.15,
      completion: 0.6,
    },
  ],
  'gemini-1.5-flash-8b': [
    {
      effectiveFrom: new Date('2024-10-03'),
      prompt: 0.075,
      completion: 0.3,
    },
  ],

  // Add more models as needed
};

/**
 * Get pricing for a model at a specific date
 * @param {string} model - Model identifier
 * @param {Date} [date] - Date to get pricing for (defaults to now)
 * @returns {Object|null} Pricing data or null if not found
 */
function getModelPricing(model, date = new Date()) {
  const modelPricing = PRICING_DATA[model];
  if (!modelPricing) {
    logger.warn(`No pricing data found for model: ${model}`);
    return null;
  }

  // Find the pricing period that was effective at the given date
  for (const period of modelPricing) {
    if (date >= period.effectiveFrom && (!period.effectiveTo || date <= period.effectiveTo)) {
      return period;
    }
  }

  // If no exact match, return the earliest pricing as fallback
  return modelPricing[modelPricing.length - 1];
}

/**
 * Calculate cost for token usage
 * @param {string} model - Model identifier
 * @param {Object} usage - Token usage object
 * @param {number} [usage.promptTokens] - Number of prompt tokens
 * @param {number} [usage.completionTokens] - Number of completion tokens
 * @param {number} [usage.cacheWriteTokens] - Number of cache write tokens
 * @param {number} [usage.cacheReadTokens] - Number of cache read tokens
 * @param {number} [usage.reasoningTokens] - Number of reasoning tokens
 * @param {Date} [date] - Date for pricing calculation (defaults to now)
 * @returns {Object} Cost breakdown
 */
function calculateTokenCost(model, usage, date = new Date()) {
  const pricing = getModelPricing(model, date);
  if (!pricing) {
    return {
      prompt: 0,
      completion: 0,
      cacheWrite: 0,
      cacheRead: 0,
      reasoning: 0,
      total: 0,
      error: 'No pricing data available',
    };
  }

  const costs = {
    prompt: 0,
    completion: 0,
    cacheWrite: 0,
    cacheRead: 0,
    reasoning: 0,
  };

  // Calculate each cost component (convert from per million to actual cost)
  if (usage.promptTokens) {
    costs.prompt = (usage.promptTokens / 1_000_000) * pricing.prompt;
  }

  if (usage.completionTokens) {
    costs.completion = (usage.completionTokens / 1_000_000) * pricing.completion;
  }

  if (usage.cacheWriteTokens && pricing.cacheWrite) {
    costs.cacheWrite = (usage.cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  }

  if (usage.cacheReadTokens && pricing.cacheRead) {
    costs.cacheRead = (usage.cacheReadTokens / 1_000_000) * pricing.cacheRead;
  }

  if (usage.reasoningTokens && pricing.reasoning) {
    costs.reasoning = (usage.reasoningTokens / 1_000_000) * pricing.reasoning;
  }

  // Calculate total
  costs.total = costs.prompt + costs.completion + costs.cacheWrite + costs.cacheRead + costs.reasoning;

  return costs;
}

/**
 * Get all supported models
 * @returns {string[]} Array of model identifiers
 */
function getSupportedModels() {
  return Object.keys(PRICING_DATA);
}

/**
 * Get model provider from model name
 * @param {string} model - Model identifier
 * @returns {string} Provider name
 */
function getModelProvider(model) {
  if (model.includes('gpt') || model.includes('o1')) {
    return 'OpenAI';
  }
  if (model.includes('claude')) {
    return 'Anthropic';
  }
  if (model.includes('gemini')) {
    return 'Google';
  }
  if (model.includes('mistral')) {
    return 'Mistral';
  }
  if (model.includes('command')) {
    return 'Cohere';
  }
  return 'Unknown';
}

module.exports = {
  getModelPricing,
  calculateTokenCost,
  getSupportedModels,
  getModelProvider,
  PRICING_DATA,
};