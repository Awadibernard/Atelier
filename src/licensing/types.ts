/**
 * Types & Contracts for AtelierDevis Licensing & Entitlement System
 *
 * NOTE: This module defines the domain model and abstraction contracts for
 * entitlements, feature-gating, license verification, and future payment providers.
 * No specific payment gateway (Stripe, Mobile Money, etc.) or authentication provider
 * is hardcoded.
 */

export type UserPlan = 'free' | 'premium';

export type EntitlementStatus = 'active' | 'expired' | 'revoked';

export type ActivationMethod =
  | 'free_tier'
  | 'license_key'
  | 'manual_activation'
  | 'card'
  | 'mobile_money'
  | 'bank_transfer'
  | 'development_test'
  | 'other';

/**
 * Clean internal representation of the installation's entitlement.
 * Independent of any payment provider or user account.
 */
export interface UserEntitlement {
  /** Plan level */
  plan: UserPlan;
  /** Status of current entitlement */
  status: EntitlementStatus;
  /** Method used to activate this entitlement */
  activationMethod: ActivationMethod;
  /** ISO string of when entitlement was created/activated */
  activatedAt: string;
  /** ISO string of expiration date (optional: undefined = perpetual/lifetime) */
  expiresAt?: string;
  /** Identifier of the license or entitlement */
  licenseId?: string;
  /** Masked key for UI display (e.g. ATEL-****-****-89AB) */
  licenseKeyMasked?: string;
  /** Optional customer email/phone attached to license */
  licensedTo?: string;
  /** Explicit flag indicating whether this is a local development/test entitlement */
  isDevelopmentTest?: boolean;
}

/**
 * Centralized feature keys for gating.
 * Any new feature requiring gating must be declared here.
 */
export type FeatureKey =
  | 'unlimited_quotes'        // Free: 15 quotes max; Premium: unlimited
  | 'advanced_templates'       // Complex & specialized industrial blueprints
  | 'custom_branding_logo'     // Full watermark removal & custom PDF styling
  | 'advanced_pdf_styles'      // Pro PDF color palettes and layouts
  | 'csv_excel_export'         // Export quote items & material lists to CSV
  | 'multi_rate_overhead'      // Complex workshop machinery & multi-rate depreciation
  | 'cloud_sync_preview';      // Cloud backup & multi-device sync (future)

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  requiredPlan: UserPlan;
  freeLimit?: number;
  badgeLabel?: string;
  category: 'core' | 'productivity' | 'branding' | 'cloud';
}

/**
 * Verification result contract for license verification
 */
export interface LicenseVerificationResult {
  valid: boolean;
  entitlement?: UserEntitlement;
  errorMessage?: string;
}

/**
 * Verification contract interface.
 * Can be implemented by local mock verifiers (for dev/test) or future
 * cryptographic / server-side verifiers without altering the app.
 */
export interface LicenseVerifier {
  verify(licenseKey: string): Promise<LicenseVerificationResult>;
}

/**
 * =========================================================================
 * FUTURE PAYMENT PROVIDER ABSTRACTION LAYER
 * =========================================================================
 * The core application logic does not know or care which payment provider is used.
 * Providers (Card, Mobile Money in various countries, Bank Transfer, etc.) implement
 * this standard contract and return a standardized result.
 */

export type PaymentMethodType =
  | 'card'
  | 'mobile_money'
  | 'bank_transfer'
  | 'payment_link'
  | 'manual_activation'
  | 'other';

export interface PaymentRequest {
  amount?: number;
  currency?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  paymentMethodType: PaymentMethodType;
  metadata?: Record<string, unknown>;
}

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';

export interface PaymentConfirmationResult {
  status: PaymentStatus;
  transactionId?: string;
  licenseKey?: string;
  activatedEntitlement?: UserEntitlement;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly supportedMethods: PaymentMethodType[];
  initiatePayment(request: PaymentRequest): Promise<PaymentConfirmationResult>;
  verifyPayment(transactionId: string): Promise<PaymentConfirmationResult>;
}
