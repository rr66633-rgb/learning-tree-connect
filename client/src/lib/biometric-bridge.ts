/**
 * Biometric Authentication Bridge
 * Uses capacitor-native-biometric plugin pattern for Face ID / Touch ID
 */
import { registerPlugin } from '@capacitor/core';

export interface BiometricResult {
  isAvailable: boolean;
  biometryType?: number;
}

export interface BiometricPlugin {
  isAvailable(): Promise<BiometricResult>;
  authenticate(options: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    useFallback?: boolean;
    fallbackTitle?: string;
  }): Promise<void>;
}

/**
 * NativeBiometric plugin - registered via Capacitor's plugin system.
 * On iOS, this maps to the LocalAuthentication framework (Face ID / Touch ID).
 * The native Swift plugin must be added to the Xcode project.
 */
export const NativeBiometric = registerPlugin<BiometricPlugin>('NativeBiometric', {
  web: () => import('./biometric-web').then((m) => new m.BiometricWeb()),
});
