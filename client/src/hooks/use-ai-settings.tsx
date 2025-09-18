import { useQuery } from "@tanstack/react-query";

export interface AISettings {
  value: string;
  updatedAt?: string;
}

/**
 * Custom hook to manage AI settings state across the application
 * Provides centralized access to AI enabled/disabled state
 */
export function useAISettings() {
  // Fetch AI settings
  const { data: aiSettings, isLoading, error, refetch } = useQuery<AISettings>({
    queryKey: ['/api/admin/settings', 'ai-enabled'],
    select: (data) => data || null,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 (auth errors)
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    }
  });

  // Convert string value to boolean with proper coercion
  const isAIEnabled = Boolean(aiSettings?.value === 'true');

  return {
    isAIEnabled,
    isLoading,
    error,
    refetch,
    aiSettings,
    lastUpdated: aiSettings?.updatedAt
  };
}