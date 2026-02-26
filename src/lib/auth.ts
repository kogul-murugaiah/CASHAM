import { api } from "./api";

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    const data = await api.get('/api/auth/user');
    return data?.user || null;
  } catch (error) {
    return null;
  }
};

/**
 * Get the current user ID
 * @returns User ID string or null if not authenticated
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id || null;
};
