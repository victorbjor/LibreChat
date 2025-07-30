import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { TooltipAnchor } from '~/components/ui';
import {
  formatCostDisplay,
  getCostColor,
  useConversationCost,
} from '~/data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function ConversationCost() {
  const { conversationId } = useParams();
  const localize = useLocalize();
  const messages = useRecoilValue(store.messages);

  const { data: costData, isLoading, refetch } = useConversationCost(
    conversationId !== Constants.NEW_CONVO ? conversationId : undefined,
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  );

  // Refetch cost when messages change (after a new message is added)
  useEffect(() => {
    if (conversationId && conversationId !== Constants.NEW_CONVO && messages.length > 0) {
      // Debounce the refetch to avoid too many requests
      const timeoutId = setTimeout(() => {
        refetch();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, conversationId, refetch]);

  // Don't show anything if no cost data or still loading
  if (!costData || isLoading || conversationId === Constants.NEW_CONVO) {
    return null;
  }

  const costColor = getCostColor(costData.totalCostRaw);
  const formattedCost = formatCostDisplay(costData.totalCostRaw);

  const tooltipText = `${localize('com_ui_conversation_cost')}: ${costData.totalCost}
${localize('com_ui_primary_model')}: ${costData.primaryModel}
${localize('com_ui_total_tokens')}: ${costData.totalTokens.toLocaleString()}
${localize('com_ui_last_updated')}: ${new Date(costData.lastUpdated).toLocaleString()}`;

  return (
    <TooltipAnchor
      description={tooltipText}
      render={
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-surface-hover">
          <span className="text-text-tertiary">💰</span>
          <span className={`font-medium ${costColor}`}>{formattedCost}</span>
        </div>
      }
    />
  );
}