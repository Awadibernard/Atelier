import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  Calculator,
  History,
  Package,
  BookmarkCheck,
  Settings,
  Crown,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AppTab } from '../types';

export interface TourStep {
  id: AppTab | 'premium';
  tab?: AppTab;
  targetSelector: string;
  title: string;
  subtitle: string;
  icon: typeof Home;
  badge: string;
  badgeColor: string;
  description: string;
  highlights: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'home',
    tab: 'home',
    targetSelector: '#tour-home-banner',
    title: 'Tableau de Bord & Accueil',
    subtitle: 'Votre point de départ au quotidien',
    icon: Home,
    badge: 'Étape 1/7',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    description:
      'Retrouvez en un clin d’œil l’activité de votre atelier : les indicateurs clés de chiffre d’affaires, les devis récents et les raccourcis vers un chiffrage rapide.',
    highlights: [
      'Indicateurs d\'activité (devis acceptés, volume émis)',
      'Accès instantané aux devis récents et calculs sauvegardés',
      'Raccourcis pour démarrer un nouveau devis ou calcul express',
    ],
  },
  {
    id: 'calculator',
    tab: 'calculator',
    targetSelector: '#tour-calculator-summary',
    title: 'Calculateur de Coûts & Marge',
    subtitle: 'Chiffrage précis et sans erreur',
    icon: Calculator,
    badge: 'Étape 2/7',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    description:
      'Déterminez le coût de revient réel de vos fabrications en combinant matériaux bruts, chutes d\'atelier, heures de main-d\'œuvre et frais annexes avec votre marge garantie.',
    highlights: [
      'Calcul automatique des pertes et chutes de matière',
      'Gestion précise des taux de marge ou coefficient multiplicateur',
      'Transformation directe du résultat en devis client complet',
    ],
  },
  {
    id: 'quotes',
    tab: 'quotes',
    targetSelector: '#tour-quotes-list',
    title: 'Devis & Suivi Commercial',
    subtitle: 'Édition, impression PDF et partage',
    icon: History,
    badge: 'Étape 3/7',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    description:
      'Générez des devis soignés prêts pour vos clients. Personnalisez les acomptes, mettez à jour le statut en un clic et exportez au format PDF A4 professionnel ou partage WhatsApp.',
    highlights: [
      'Documents PDF A4 élégants avec votre logo et vos conditions',
      'Changement rapide de statut (Brouillon, Envoyé, Accepté, Terminé)',
      'Partage direct par message WhatsApp ou impression A4',
    ],
  },
  {
    id: 'materials',
    tab: 'materials',
    targetSelector: '#tour-materials-catalog',
    title: 'Bibliothèque de Matériaux',
    subtitle: 'Vos prix d’achat toujours à jour',
    icon: Package,
    badge: 'Étape 4/7',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description:
      'Centralisez les fournitures de votre atelier (tubes, tôles, bois, profilés, quincaillerie...) avec leurs unités de mesure et tarifs d\'achat actualisés.',
    highlights: [
      'Organisation par catégories personnalisables',
      'Mise à jour rapide des prix unitaires récurrents',
      'Tarifs horaires d\'atelier et qualification de la main-d\'œuvre',
    ],
  },
  {
    id: 'templates',
    tab: 'templates',
    targetSelector: '#tour-templates-catalog',
    title: 'Modèles d’Ouvrages',
    subtitle: 'Gagnez du temps sur vos fabrications',
    icon: BookmarkCheck,
    badge: 'Étape 5/7',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    description:
      'Profitez de modèles prêts à l’emploi (portails, grilles, portes, tables...) ou enregistrez vos propres ouvrages types pour chiffrer en quelques secondes.',
    highlights: [
      'Modèles standards pour métal, bois et aluminium',
      'Création et personnalisation de vos propres modèles d\'atelier',
      'Chargement instantané de toutes les fournitures dans le calculateur',
    ],
  },
  {
    id: 'settings',
    tab: 'settings',
    targetSelector: '#tour-settings-profile',
    title: 'Paramètres & Données d’Atelier',
    subtitle: 'Identité d’entreprise et sécurité',
    icon: Settings,
    badge: 'Étape 6/7',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description:
      'Configurez les informations officielles de votre atelier, insérez votre logo avec recadrage et exportez des sauvegardes sécurisées de vos données.',
    highlights: [
      'Coordonnées d\'atelier, logo officiel et devises (FCFA, EUR, USD...)',
      'Sauvegarde et restauration sélective de vos données',
      'Fonctionnement 100% hors-ligne et autonome sur votre appareil',
    ],
  },
  {
    id: 'premium',
    tab: 'settings',
    targetSelector: '#tour-premium-card',
    title: 'AtelierDevis Premium',
    subtitle: 'Capacités illimitées pour professionnels',
    icon: Crown,
    badge: 'Étape 7/7',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    description:
      'Pour les ateliers en pleine croissance, la version Premium débloque le stockage illimité de devis, l\'exportation tableur Excel/CSV et des modèles exclusifs.',
    highlights: [
      'Historique de devis illimité sans plafond de stockage',
      'Exportation automatique vers Excel / tableurs CSV',
      'Modèles d\'ouvrages avancés et assistance prioritaire',
    ],
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: AppTab) => void;
}

export function GuidedTourModal({ isOpen, onClose, onNavigateTab }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<number | null>(null);

  const step = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Track window resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset to step 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Target element resolution, smooth scroll & measurement
  const updateTargetPosition = useCallback(() => {
    if (!step || !isOpen) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (element) {
      const rect = element.getBoundingClientRect();
      // Only record valid bounding rect
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
        return true;
      }
    }
    return false;
  }, [step, isOpen]);

  // When step changes, navigate if needed and locate target with retries
  useEffect(() => {
    if (!isOpen || !step) return;

    // Trigger tab navigation if necessary
    if (step.tab && onNavigateTab) {
      onNavigateTab(step.tab);
    }

    setTargetRect(null);

    let attempts = 0;
    const maxAttempts = 18; // Try up to ~900ms
    const interval = 50;

    const findAndScrollTarget = () => {
      const element = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (element) {
        // Element found! Smoothly bring into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        // Give smooth scroll 160ms to position, then measure
        setTimeout(() => {
          updateTargetPosition();
        }, 160);
      } else if (attempts < maxAttempts) {
        attempts += 1;
        retryTimerRef.current = window.setTimeout(findAndScrollTarget, interval);
      } else {
        // Fallback: target not found, keep targetRect null to show centered presentation
        setTargetRect(null);
      }
    };

    retryTimerRef.current = window.setTimeout(findAndScrollTarget, 80);

    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [currentStepIndex, isOpen, onNavigateTab, step, updateTargetPosition]);

  // Update target rect on scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateTargetPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          onClose();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep]);

  if (!isOpen || !step) return null;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const StepIcon = step.icon;
  const isMobile = windowSize.width < 768;

  // Calculate desktop tooltip position relative to spotlight target
  const padding = 8;
  const tooltipWidth = 420;
  const approxTooltipHeight = 310;

  let tooltipStyle: React.CSSProperties = {};
  let pointerPlacement: 'top' | 'bottom' | 'left' | 'right' | 'none' = 'none';

  if (!isMobile && targetRect) {
    const spaceBelow = windowSize.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = windowSize.width - targetRect.right;
    const spaceLeft = targetRect.left;

    // Prefer below if enough room
    if (spaceBelow >= approxTooltipHeight + 20) {
      const topPos = targetRect.bottom + padding + 12;
      const leftPos = Math.max(
        16,
        Math.min(
          windowSize.width - tooltipWidth - 16,
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        )
      );
      tooltipStyle = {
        position: 'fixed',
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: `${tooltipWidth}px`,
      };
      pointerPlacement = 'top';
    } else if (spaceAbove >= approxTooltipHeight + 20) {
      // Place above target
      const topPos = targetRect.top - approxTooltipHeight - padding - 12;
      const leftPos = Math.max(
        16,
        Math.min(
          windowSize.width - tooltipWidth - 16,
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2
        )
      );
      tooltipStyle = {
        position: 'fixed',
        top: `${Math.max(16, topPos)}px`,
        left: `${leftPos}px`,
        width: `${tooltipWidth}px`,
      };
      pointerPlacement = 'bottom';
    } else if (spaceRight >= tooltipWidth + 24) {
      // Place right
      const topPos = Math.max(
        16,
        Math.min(
          windowSize.height - approxTooltipHeight - 16,
          targetRect.top + targetRect.height / 2 - approxTooltipHeight / 2
        )
      );
      tooltipStyle = {
        position: 'fixed',
        top: `${topPos}px`,
        left: `${targetRect.right + padding + 12}px`,
        width: `${tooltipWidth}px`,
      };
      pointerPlacement = 'left';
    } else if (spaceLeft >= tooltipWidth + 24) {
      // Place left
      const topPos = Math.max(
        16,
        Math.min(
          windowSize.height - approxTooltipHeight - 16,
          targetRect.top + targetRect.height / 2 - approxTooltipHeight / 2
        )
      );
      tooltipStyle = {
        position: 'fixed',
        top: `${topPos}px`,
        left: `${targetRect.left - tooltipWidth - padding - 12}px`,
        width: `${tooltipWidth}px`,
      };
      pointerPlacement = 'right';
    } else {
      // Fallback: smart centered positioning
      tooltipStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${tooltipWidth}px`,
      };
      pointerPlacement = 'none';
    }
  }

  return (
    <div className="fixed inset-0 z-50 select-none">
      {/* Spotlight SVG Mask (Desktop and Mobile) */}
      {targetRect ? (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none z-40 transition-all duration-200"
          style={{ width: '100vw', height: '100vh' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                ry="14"
                fill="black"
              />
            </mask>
          </defs>

          {/* Dimmed surrounding page */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.76)"
            mask="url(#spotlight-mask)"
          />

          {/* Glowing teal spotlight contour around the target element */}
          <rect
            x={Math.max(0, targetRect.left - padding)}
            y={Math.max(0, targetRect.top - padding)}
            width={targetRect.width + padding * 2}
            height={targetRect.height + padding * 2}
            rx="14"
            ry="14"
            fill="none"
            stroke="#0d9488"
            strokeWidth="3"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        </svg>
      ) : (
        /* Fallback dimmed backdrop if target element is loading or unavailable */
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 transition-opacity"
          onClick={handleSkip}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div
        ref={tooltipRef}
        style={!isMobile && targetRect ? tooltipStyle : undefined}
        className={`z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden transition-all duration-200 ${
          isMobile
            ? 'fixed bottom-3 left-3 right-3 max-h-[48vh] overflow-y-auto'
            : !targetRect
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg mx-auto'
            : ''
        }`}
      >
        {/* Pointer indicator arrow on desktop */}
        {!isMobile && targetRect && pointerPlacement === 'top' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45" />
        )}
        {!isMobile && targetRect && pointerPlacement === 'bottom' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45" />
        )}
        {!isMobile && targetRect && pointerPlacement === 'left' && (
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white border-b border-l border-slate-200 transform rotate-45" />
        )}
        {!isMobile && targetRect && pointerPlacement === 'right' && (
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border-t border-r border-slate-200 transform rotate-45" />
        )}

        {/* Card Header */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${step.badgeColor}`}
                >
                  {step.badge}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {currentStepIndex + 1} sur {totalSteps}
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mt-0.5 tracking-tight">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer la visite guidée"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 pt-3 sm:pt-4 space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {step.description}
          </p>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 sm:p-3 space-y-1.5">
            {step.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                <span className="leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card Footer with Controls */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {/* Step dots */}
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-5 bg-teal-600'
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Aller à l'étape ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Passer
            </button>

            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Précédent</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>{isLastStep ? 'Terminer' : 'Suivant'}</span>
              {isLastStep ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
