const { calculateTokenCost, getModelProvider } = require('./ModelPricing');
const { logger } = require('~/config');

/**
 * Calculate the total cost of a conversation from messages
 * @param {Array} messages - Array of message objects
 * @returns {Object|null} Cost summary or null if no messages
 */
function calculateConversationCostFromMessages(messages) {
  try {
    if (!messages || messages.length === 0) {
      return null;
    }

    // Initialize cost tracking
    const costBreakdown = {
      prompt: 0,
      completion: 0,
      cacheWrite: 0,
      cacheRead: 0,
      reasoning: 0,
    };

    const tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      reasoningTokens: 0,
    };

    const modelBreakdown = new Map();
    let lastUpdated = new Date(0);

    // Process each message
    messages.forEach((message) => {
      // Skip messages without model or token info
      if (!message.model || (!message.tokenCount && !message.tokens && !message.usage)) {
        return;
      }

      const messageDate = new Date(message.createdAt || message.timestamp || Date.now());
      if (messageDate > lastUpdated) {
        lastUpdated = messageDate;
      }

      const model = message.model;

      // Initialize model breakdown if not exists
      if (!modelBreakdown.has(model)) {
        modelBreakdown.set(model, {
          model,
          provider: getModelProvider(model),
          cost: 0,
          tokenUsage: {
            promptTokens: 0,
            completionTokens: 0,
            cacheWriteTokens: 0,
            cacheReadTokens: 0,
            reasoningTokens: 0,
          },
          messageCount: 0,
        });
      }

      const modelData = modelBreakdown.get(model);
      modelData.messageCount++;

      // Extract token counts from message
      let currentTokenUsage = {};
      
      // Check different possible token count formats
      if (message.usage) {
        // OpenAI format: { prompt_tokens, completion_tokens }
        currentTokenUsage.promptTokens = message.usage.prompt_tokens || 0;
        currentTokenUsage.completionTokens = message.usage.completion_tokens || 0;
        currentTokenUsage.reasoningTokens = message.usage.reasoning_tokens || 0;
      } else if (message.tokens) {
        // Alternative format
        currentTokenUsage.promptTokens = message.tokens.prompt || message.tokens.input || 0;
        currentTokenUsage.completionTokens = message.tokens.completion || message.tokens.output || 0;
      } else if (message.tokenCount) {
        // Simple token count - assume it's completion tokens for assistant messages
        if (message.role === 'assistant') {
          currentTokenUsage.completionTokens = message.tokenCount;
        } else {
          currentTokenUsage.promptTokens = message.tokenCount;
        }
      }

      // Handle cache tokens if present
      if (message.cacheTokens) {
        currentTokenUsage.cacheWriteTokens = message.cacheTokens.write || 0;
        currentTokenUsage.cacheReadTokens = message.cacheTokens.read || 0;
      }

      // Calculate cost using historical pricing
      const cost = calculateTokenCost(model, currentTokenUsage, messageDate);
      
      if (!cost.error) {
        // Add to overall breakdown
        costBreakdown.prompt += cost.prompt;
        costBreakdown.completion += cost.completion;
        costBreakdown.cacheWrite += cost.cacheWrite;
        costBreakdown.cacheRead += cost.cacheRead;
        costBreakdown.reasoning += cost.reasoning;

        // Add to model breakdown
        modelData.cost += cost.total;
        
        // Update token usage
        for (const [key, value] of Object.entries(currentTokenUsage)) {
          modelData.tokenUsage[key] += value;
          tokenUsage[key] += value;
        }
      } else {
        logger.warn(`Could not calculate cost for model ${model}: ${cost.error}`);
      }
    });

    // Calculate total cost
    const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);

    // Convert model breakdown to array
    const modelBreakdownArray = Array.from(modelBreakdown.values())
      .sort((a, b) => b.cost - a.cost);

    return {
      totalCost: Math.round(totalCost * 100000) / 100000, // Round to 5 decimal places
      costBreakdown: {
        prompt: Math.round(costBreakdown.prompt * 100000) / 100000,
        completion: Math.round(costBreakdown.completion * 100000) / 100000,
        cacheWrite: Math.round(costBreakdown.cacheWrite * 100000) / 100000,
        cacheRead: Math.round(costBreakdown.cacheRead * 100000) / 100000,
        reasoning: Math.round(costBreakdown.reasoning * 100000) / 100000,
      },
      tokenUsage,
      modelBreakdown: modelBreakdownArray,
      lastUpdated,
    };
  } catch (error) {
    logger.error('Error calculating conversation cost from messages:', error);
    return null;
  }
}

/**
 * Get simplified cost display for UI from messages
 * @param {Array} messages - Array of message objects
 * @returns {Object|null} Simplified cost data for UI display
 */
function getConversationCostDisplayFromMessages(messages) {
  try {
    const costSummary = calculateConversationCostFromMessages(messages);
    if (!costSummary) {
      return null;
    }

    // Format cost for display
    const formatCost = (cost) => {
      if (cost < 0.001) {
        return '<$0.001';
      }
      if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
      }
      if (cost < 1) {
        return `$${cost.toFixed(3)}`;
      }
      return `$${cost.toFixed(2)}`;
    };

    return {
      totalCost: formatCost(costSummary.totalCost),
      totalCostRaw: costSummary.totalCost,
      primaryModel: costSummary.modelBreakdown[0]?.model || 'Unknown',
      totalTokens: costSummary.tokenUsage.promptTokens + costSummary.tokenUsage.completionTokens,
      lastUpdated: costSummary.lastUpdated,
    };
  } catch (error) {
    logger.error('Error getting conversation cost display from messages:', error);
    return null;
  }
}

module.exports = {
  calculateConversationCostFromMessages,
  getConversationCostDisplayFromMessages,
};