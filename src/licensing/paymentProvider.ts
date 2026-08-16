import {
  PaymentConfirmationResult,
  PaymentMethodType,
  PaymentProvider,
  PaymentRequest,
} from './types';

/**
 * ============================================================================
 * PAYMENT PROVIDER ABSTRACTION ARCHITECTURE
 * ============================================================================
 *
 * This layer decouples the application from ANY payment rail or provider.
 *
 * When a payment system is selected in the future (Card, Mobile Money in various
 * African countries, Bank Transfer, Payment Link, etc.), a concrete provider
 * simply implements the `PaymentProvider` interface.
 *
 * The core application logic and UI will ONLY interact with:
 * - `initiatePayment(request)`
 * - `verifyPayment(transactionId)`
 *
 * And receive a standard `PaymentConfirmationResult`.
 */

export class NullPaymentProvider implements PaymentProvider {
  readonly providerId = 'unconfigured';
  readonly displayName = 'Moyen de paiement non configuré';
  readonly supportedMethods: PaymentMethodType[] = [
    'card',
    'mobile_money',
    'bank_transfer',
    'payment_link',
  ];

  async initiatePayment(request: PaymentRequest): Promise<PaymentConfirmationResult> {
    // Intentionally no real payment processing yet
    return {
      status: 'pending',
      errorMessage:
        'Le système de paiement en direct sera disponible prochainement (Mobile Money, Carte, Virement). Vous pouvez activer Premium via une clé de licence ou en mode test.',
    };
  }

  async verifyPayment(_transactionId: string): Promise<PaymentConfirmationResult> {
    return {
      status: 'failed',
      errorMessage: 'Aucun processeur de paiement actif pour le moment.',
    };
  }
}

/**
 * Active payment provider instance
 */
let activePaymentProvider: PaymentProvider = new NullPaymentProvider();

export function registerPaymentProvider(provider: PaymentProvider) {
  activePaymentProvider = provider;
}

export function getActivePaymentProvider(): PaymentProvider {
  return activePaymentProvider;
}
