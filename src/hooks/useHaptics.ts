import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useHaptics = () => {
  const triggerLightHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if not supported (e.g., on web)
    }
  };

  const triggerMediumHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Ignore
    }
  };

  const triggerHeavyHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      // Ignore
    }
  };

  return { triggerLightHaptic, triggerMediumHaptic, triggerHeavyHaptic };
};
