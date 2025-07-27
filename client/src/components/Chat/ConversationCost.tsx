import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { TooltipAnchor } from '~/components/ui';
import { useConversationCost } from '~/data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function ConversationCost() {
  const { conversationId } = useParams();
  const localize = useLocalize();
  const latestMessage = useRecoilValue(store.latestMessageFamily(0));
  
  const { data: costData, isLoading, error, refetch } = useConversationCost(
    conversationId !== Constants.NEW_CONVO ? conversationId : undefined,
    {
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  // Refetch when new message is added
  useEffect(() => {
    if (conversationId && conversationId !== Constants.NEW_CONVO && latestMessage) {
      const timeoutId = setTimeout(() => {
        refetch();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [latestMessage?.messageId, conversationId, refetch]);

  // Don't show for new conversations
  if (!conversationId || conversationId === Constants.NEW_CONVO) {
    return null;
  }

  // Don't show while loading or if there's an error
  if (isLoading || error) {
    return null;
  }

  // Don't show if no cost data
  if (!costData || costData.totalCostRaw < 0.0001) {
    return null;
  }

  const tooltipText = `${localize('com_ui_conversation_cost')}: ${costData.totalCost}
${localize('com_ui_primary_model')}: ${costData.primaryModel}
${localize('com_ui_total_tokens')}: ${costData.totalTokens.toLocaleString()}
${localize('com_ui_last_updated')}: ${new Date(costData.lastUpdated).toLocaleTimeString()}`;

  return (
    <TooltipAnchor
      description={tooltipText}
      render={
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-surface-hover">
          <span className="text-text-tertiary">💰</span>
          <span className={`font-medium ${getCostColorClass(costData.totalCostRaw)}`}>
            {costData.totalCost}
          </span>
        </div>
      }
    />
  );
}

function getCostColorClass(cost: number): string {
  if (cost < 0.01) return 'text-green-600 dark:text-green-400';
  if (cost < 0.1) return 'text-yellow-600 dark:text-yellow-400';
  if (cost < 1.0) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}