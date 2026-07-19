#!/bin/bash

# LoadingContext
sed -i 's/import React, { createContext, useContext, useState, ReactNode }/import React, { createContext, useContext, useState, useMemo, ReactNode }/' "/c/Users/wkddb/Desktop/2024-1/test8/src/contexts/LoadingContext.tsx"
sed -i '/const value: LoadingContextType = {/,/};/c\  const value = useMemo<LoadingContextType>(() => ({\n    loading,\n    savingNote,\n    loadingRoomInfo,\n    isSearchingFriends,\n    setLoading,\n    setSavingNote,\n    setLoadingRoomInfo,\n    setIsSearchingFriends,\n  }), [loading, savingNote, loadingRoomInfo, isSearchingFriends]);' "/c/Users/wkddb/Desktop/2024-1/test8/src/contexts/LoadingContext.tsx"

echo "Applied memoization to LoadingContext"
