/**
 * Web fallback for biometric authentication.
 * On web, biometrics are not available - this provides a no-op implementation.
 */
import type { BiometricPlugin, BiometricResult } from './biometric-bridge';

export class BiometricWeb implements BiometricPlugin {
  async isAvailable(): Promise<BiometricResult> {
    return { isAvailable: false };
  }

  async authenticate(): Promise<void> {
    // On web, biometric auth is not available
    // The app should fall back to password/PIN
    throw new Error('Biometric authentication is not available on web');
  }
}
