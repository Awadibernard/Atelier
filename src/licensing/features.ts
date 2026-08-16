import {
  FeatureDefinition,
  FeatureKey,
  UserEntitlement,
  UserPlan,
} from './types';

/**
 * Free tier generous quote capacity
 */
export const FREE_QUOTES_LIMIT = 15;

/**
 * Centralized feature registry
 * All feature boundaries are configured here in one single place.
 */
export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  unlimited_quotes: {
    key: 'unlimited_quotes',
    name: 'Historique de Devis Illimité',
    description: `La version Gratuite inclut jusqu'à ${FREE_QUOTES_LIMIT} devis stockés localement. La version Premium offre un stockage illimité sans suppression.`,
    requiredPlan: 'premium',
    freeLimit: FREE_QUOTES_LIMIT,
    badgeLabel: 'Illimité',
    category: 'core',
  },
  advanced_templates: {
    key: 'advanced_templates',
    name: 'Modèles Ouvrages Spécialisés & Industriels',
    description: 'Accédez à la bibliothèque de modèles avancés : garde-corps Inox, pergolas bioclimatiques, charpentes industrielles et verrières sur mesure.',
    requiredPlan: 'premium',
    badgeLabel: 'Pro',
    category: 'productivity',
  },
  custom_branding_logo: {
    key: 'custom_branding_logo',
    name: 'Branding Atelier & Suppression Mention',
    description: 'Personnalisez entièrement l\'en-tête de vos devis PDF et supprimez la mention standard "Version Gratuite".',
    requiredPlan: 'premium',
    badgeLabel: 'Pro',
    category: 'branding',
  },
  advanced_pdf_styles: {
    key: 'advanced_pdf_styles',
    name: 'Styles & Thèmes PDF Professionnels',
    description: 'Choisissez parmi plusieurs palettes et mises en page de devis (Contemporain, Industriel, Élégant).',
    requiredPlan: 'premium',
    badgeLabel: 'Pro',
    category: 'branding',
  },
  csv_excel_export: {
    key: 'csv_excel_export',
    name: 'Export Tableur (CSV / Excel)',
    description: 'Exportez instantanément la liste détaillée des matériaux, découpes et devis vers un tableur Excel ou CSV.',
    requiredPlan: 'premium',
    badgeLabel: 'Pro',
    category: 'productivity',
  },
  multi_rate_overhead: {
    key: 'multi_rate_overhead',
    name: 'Calcul Frais Généraux Avancés & Amortissement',
    description: 'Modélisation fine de l\'usure des machines d\'atelier (postes à souder, découpeuses plasma) et frais fixes.',
    requiredPlan: 'premium',
    badgeLabel: 'Pro',
    category: 'productivity',
  },
  cloud_sync_preview: {
    key: 'cloud_sync_preview',
    name: 'Synchronisation Cloud & Multi-Appareils',
    description: 'Sauvegardez vos devis dans le cloud et retrouvez votre atelier sur smartphone, tablette et ordinateur.',
    requiredPlan: 'premium',
    badgeLabel: 'Bientôt',
    category: 'cloud',
  },
};

/**
 * Checks if current entitlement is active Premium
 */
export function isPremium(entitlement?: UserEntitlement | null): boolean {
  if (!entitlement) return false;
  if (entitlement.status !== 'active') return false;
  if (entitlement.plan !== 'premium') return false;

  // Check expiration if present
  if (entitlement.expiresAt) {
    const expiry = new Date(entitlement.expiresAt).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a specific feature can be used by the given entitlement
 */
export function canUseFeature(
  entitlement: UserEntitlement | undefined | null,
  featureKey: FeatureKey
): boolean {
  const feature = FEATURE_DEFINITIONS[featureKey];
  if (!feature) return true; // Default allow if unrecognized

  if (feature.requiredPlan === 'free') return true;
  return isPremium(entitlement);
}

/**
 * Returns current plan representation
 */
export function getCurrentPlan(entitlement?: UserEntitlement | null): UserPlan {
  return isPremium(entitlement) ? 'premium' : 'free';
}

/**
 * Helper to check quote creation quota for Free users
 */
export function checkQuoteQuota(
  entitlement: UserEntitlement | undefined | null,
  currentQuoteCount: number
): {
  canCreate: boolean;
  isUnlimited: boolean;
  limit: number;
  current: number;
  remaining: number;
} {
  const premium = isPremium(entitlement);
  if (premium) {
    return {
      canCreate: true,
      isUnlimited: true,
      limit: Infinity,
      current: currentQuoteCount,
      remaining: Infinity,
    };
  }

  const remaining = Math.max(0, FREE_QUOTES_LIMIT - currentQuoteCount);
  return {
    canCreate: currentQuoteCount < FREE_QUOTES_LIMIT,
    isUnlimited: false,
    limit: FREE_QUOTES_LIMIT,
    current: currentQuoteCount,
    remaining,
  };
}
