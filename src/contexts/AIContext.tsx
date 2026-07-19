import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { AIRecommendation } from '../lib/types';

interface AIContextType {
  showAIRecommendModal: boolean;
  aiRecommendations: AIRecommendation[];
  aiLoadingMessage: string;
  setShowAIRecommendModal: (show: boolean) => void;
  setAiRecommendations: (recommendations: AIRecommendation[]) => void;
  setAiLoadingMessage: (message: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showAIRecommendModal, setShowAIRecommendModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('');

  const value = useMemo<AIContextType>(() => ({
    showAIRecommendModal,
    aiRecommendations,
    aiLoadingMessage,
    setShowAIRecommendModal,
    setAiRecommendations,
    setAiLoadingMessage,
  }), [showAIRecommendModal, aiRecommendations, aiLoadingMessage]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
};
