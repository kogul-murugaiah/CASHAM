import { useState, useEffect } from "react";

export type CurrencyStyle = "symbol" | "text"; // ₹ vs Rs.
export type Language = "en" | "hi";

export interface UserPreferences {
  hideBalance: boolean;
  currencyStyle: CurrencyStyle;
  language: Language;
}

const STORAGE_KEY = "casham_user_prefs";

const DEFAULT_PREFS: UserPreferences = {
  hideBalance: false,
  currencyStyle: "symbol",
  language: "en",
};

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const toggleHideBalance = () => {
    updatePreference("hideBalance", !preferences.hideBalance);
  };

  return {
    ...preferences,
    updatePreference,
    toggleHideBalance,
  };
};
