import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { AIRecommendation } from '../lib/types';

/**
 * AI 추천 일정 TOP3 모달의 상태.
 *
 * aiLoadingMessage 는 제거했습니다. App.tsx 에 대응하는 상태가 없었고,
 * 로딩 문구는 LoadingScreen 컴포넌트가 자체적으로 돌립니다.
 */
interface AIContextType {
  showAIRecommendModal: boolean;
  aiRecommendations: AIRecommendation[];
  setShowAIRecommendModal: React.Dispatch<React.SetStateAction<boolean>>;
  setAiRecommendations: React.Dispatch<React.SetStateAction<AIRecommendation[]>>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  const value = useMemo<AIContextType>(() => ({
    showAIRecommendModal,
    aiRecommendations,
    setShowAIRecommendModal,
    setAiRecommendations,
  }), [showAIRecommendModal, aiRecommendations]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
};
