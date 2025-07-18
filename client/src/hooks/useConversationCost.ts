import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';
import { calculateMessageCost, getCostColor, formatCost } from '~/utils/modelPricing';

interface ConversationCostData {
  totalCost: number;
  formattedCost: string;
  costColor: string;
  modelBreakdown: Map<string, { cost: number; count: number }>;
  primaryModel: string;
  totalTokens: number;
}

export function useConversationCost(conversationId?: string): ConversationCostData | null {
  const messages = useRecoilValue(store.messages);
  
  const costData = useMemo(() => {
    if (!conversationId || !messages || messages.length === 0) {
      return null;
    }

    let totalCost = 0;
    let totalTokens = 0;
    const modelBreakdown = new Map<string, { cost: number; count: number }>();

    // Iterate through messages to calculate costs
    messages.forEach((message) => {
      // Skip if no model or no token data
      if (!message.model || !message.tokenCount) {
        return;
      }

      // Extract token counts
      const promptTokens = message.tokenCount?.promptTokens || 0;
      const completionTokens = message.tokenCount?.completionTokens || 0;
      
      // Additional tokens for special models
      const additionalTokens = {
        cacheWriteTokens: message.tokenCount?.cacheWriteTokens,
        cacheReadTokens: message.tokenCount?.cacheReadTokens,
        reasoningTokens: message.tokenCount?.reasoningTokens,
      };

      // Calculate cost for this message
      const messageCost = calculateMessageCost(
        message.model,
        promptTokens,
        completionTokens,
        additionalTokens
      );

      // Update totals
      totalCost += messageCost;
      totalTokens += promptTokens + completionTokens;

      // Update model breakdown
      const existing = modelBreakdown.get(message.model) || { cost: 0, count: 0 };
      modelBreakdown.set(message.model, {
        cost: existing.cost + messageCost,
        count: existing.count + 1,
      });
    });

    // Find primary model (most used)
    let primaryModel = '';
    let maxCount = 0;
    modelBreakdown.forEach((data, model) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        primaryModel = model;
      }
    });

    return {
      totalCost,
      formattedCost: formatCost(totalCost),
      costColor: getCostColor(totalCost),
      modelBreakdown,
      primaryModel,
      totalTokens,
    };
  }, [conversationId, messages]);

  return costData;
}