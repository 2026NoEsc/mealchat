/**
 * Application Configuration & API Keys
 * Centralized location for environment variables and API/Server configurations.
 */

export const ENV = {
  // Supabase Configuration
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Third-Party API Keys
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  KAKAO_REST_API_KEY: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '',

  // API Base URLs & Endpoints
  KAKAO_LOCAL_API_URL: 'https://dapi.kakao.com/v2/local/search/keyword.json',
  GEMINI_GENERATE_CONTENT_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
} as const;

/**
 * Validates whether essential environment variables are set.
 * Logs a warning in development mode if critical variables are missing.
 */
export function validateConfig(): boolean {
  const missing: string[] = [];

  if (!ENV.SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!ENV.SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Config Warning] Missing essential environment variables: ${missing.join(', ')}`);
    }
    return false;
  }

  return true;
}

// Automatically validate config on import
validateConfig();
