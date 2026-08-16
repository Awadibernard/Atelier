import {
  LicenseVerificationResult,
  LicenseVerifier,
  UserEntitlement,
} from './types';

/**
 * ============================================================================
 * LICENSE VERIFICATION SYSTEM
 * ============================================================================
 *
 * ARCHITECTURAL NOTICE:
 * 1. For development & local preview, a clear Mock/Test Verifier is provided below.
 * 2. In production, this can be swapped with an Ed25519 cryptographic public-key
 *    signature verifier (offline verification) or a lightweight server verification
 *    endpoint (online verification) WITHOUT modifying the rest of the application.
 * 3. Client-side state alone is NOT treated as a secure anti-piracy guarantee;
 *    the architecture strictly distinguishes between:
 *    - DEVELOPMENT / TEST LICENSES
 *    - PRODUCTION VERIFICATION PLUGINS
 */

export class DevelopmentLicenseVerifier implements LicenseVerifier {
  async verify(licenseKey: string): Promise<LicenseVerificationResult> {
    const cleanKey = licenseKey.trim().toUpperCase();

    if (!cleanKey) {
      return {
        valid: false,
        errorMessage: 'Veuillez saisir une clé de licence valide.',
      };
    }

    // Known test / development patterns
    // e.g., ATELIER-PREM-TEST-2025, PREM-DEMO-*, ATELIER-PRO-*
    const isTestKey =
      cleanKey.startsWith('ATELIER-PREM-') ||
      cleanKey.startsWith('PREM-') ||
      cleanKey.startsWith('ATELIER-PRO-') ||
      cleanKey === 'TEST-PREMIUM-KEY';

    if (isTestKey) {
      const masked = `${cleanKey.slice(0, 4)}-****-****-${cleanKey.slice(-4)}`;
      const isPerpetual = cleanKey.includes('PRO') || cleanKey.includes('LIFETIME');

      const entitlement: UserEntitlement = {
        plan: 'premium',
        status: 'active',
        activationMethod: 'license_key',
        activatedAt: new Date().toISOString(),
        expiresAt: isPerpetual
          ? undefined
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        licenseId: `LIC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        licenseKeyMasked: masked,
        isDevelopmentTest: true,
      };

      return {
        valid: true,
        entitlement,
      };
    }

    // Invalid key response
    return {
      valid: false,
      errorMessage:
        'Clé de licence invalide ou expirée. Pour les tests en développement, utilisez par exemple : ATELIER-PREM-TEST-2025',
    };
  }
}

/**
 * Singleton instance of the active verifier.
 * Can be configured or injected based on runtime environment.
 */
let activeVerifier: LicenseVerifier = new DevelopmentLicenseVerifier();

export function setLicenseVerifier(verifier: LicenseVerifier) {
  activeVerifier = verifier;
}

export function getLicenseVerifier(): LicenseVerifier {
  return activeVerifier;
}

/**
 * Quick helper to verify a license key with the active verifier
 */
export async function verifyLicenseKey(licenseKey: string): Promise<LicenseVerificationResult> {
  return getLicenseVerifier().verify(licenseKey);
}

/**
 * Generates a mock development test entitlement
 */
export function createDevelopmentTestEntitlement(): UserEntitlement {
  return {
    plan: 'premium',
    status: 'active',
    activationMethod: 'development_test',
    activatedAt: new Date().toISOString(),
    expiresAt: undefined, // Lifetime
    licenseId: 'DEV-TEST-PREMIUM',
    licenseKeyMasked: 'TEST-DEV-PREMIUM',
    isDevelopmentTest: true,
  };
}

/**
 * Default Free Entitlement
 */
export function createDefaultFreeEntitlement(): UserEntitlement {
  return {
    plan: 'free',
    status: 'active',
    activationMethod: 'free_tier',
    activatedAt: new Date().toISOString(),
    isDevelopmentTest: false,
  };
}
