import { useState, useEffect } from 'react';
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
  Layers,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { AppTab } from '../types';

interface StepData {
  id: AppTab | 'premium';
  tab?: AppTab;
  title: string;
  subtitle: string;
  icon: typeof Home;
  badge: string;
  badgeColor: string;
  description: string;
  highlights: string[];
}

const TOUR_STEPS: StepData[] = [
  {
    id: 'home',
    tab: 'home',
    title: 'Tableau de Bord & Accueil',
    subtitle: 'Votre point de départ au quotidien',
    icon: Home,
    badge: 'Étape 1/7',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    description:
      'Retrouvez en un clin d’œil l’activité de votre atelier : les indicateurs clés de chiffre d’affaires, les devis récemment créés et vos derniers calculs d’ouvrages.',
    highlights: [
      'Indicateurs d\'activité (devis acceptés, volume émis)',
      'Accès instantané aux devis récents et calculs sauvegardés',
      'Raccourcis pour démarrer un nouveau devis ou calcul express',
    ],
  },
  {
    id: 'calculator',
    tab: 'calculator',
    title: 'Calculateur de Coûts & Marge',
    subtitle: 'Chiffrage précis et sans erreur',
    icon: Calculator,
    badge: 'Étape 2/7',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    description:
      'Déterminez le coût de revient réel de vos fabrications en combinant matériaux bruts, chutes d\'atelier, heures de main-d\'œuvre et frais annexes.',
    highlights: [
      'Calcul automatique des pertes et chutes de matière',
      'Gestion précise des taux de marge ou coefficient multiplicateur',
      'Transformation directe du résultat en devis client complet',
    ],
  },
  {
    id: 'quotes',
    tab: 'quotes',
    title: 'Devis & Suivi Commercial',
    subtitle: 'Édition, impression PDF et partage',
    icon: History,
    badge: 'Étape 3/7',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    description:
      'Générez des devis soignés prêts pour vos clients. Personnalisez les acomptes, mettez à jour le statut en un clic et exportez au format PDF A4 ou WhatsApp.',
    highlights: [
      'Documents PDF A4 élégants avec votre logo et vos conditions',
      'Changement rapide de statut (Brouillon, Envoyé, Accepté, Terminé)',
      'Partage direct par message WhatsApp ou impression A4',
    ],
  },
  {
    id: 'materials',
    tab: 'materials',
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
    title: 'Paramètres & Données d’Atelier',
    subtitle: 'Identité d’entreprise et sécurité',
    icon: Settings,
    badge: 'Étape 6/7',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description:
      'Configurez les informations officielles de votre atelier, insérez votre logo avec recadrage circulaire ou arrondi et exportez des sauvegardes JSON.',
    highlights: [
      'Coordonnées d\'atelier, logo officiel et devises (FCFA, EUR, USD...)',
      'Sauvegarde et restauration sélective de vos données',
      'Fonctionnement 100% hors-ligne et autonome sur votre appareil',
    ],
  },
  {
    id: 'premium',
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: AppTab) => void;
}

export function GuidedTourModal({ isOpen, onClose, onNavigateTab }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset to step 0 when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const step = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

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
  }, [isOpen, currentStepIndex, isLastStep, isFirstStep]);

  if (!isOpen || !step) return null;

  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const nextStep = TOUR_STEPS[nextIndex];
      if (nextStep.tab && onNavigateTab) {
        onNavigateTab(nextStep.tab);
      }
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      const prevStep = TOUR_STEPS[prevIndex];
      if (prevStep.tab && onNavigateTab) {
        onNavigateTab(prevStep.tab);
      }
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="bg-teal-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-2 sm:pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                step.id === 'premium'
                  ? 'bg-amber-100 text-amber-700 shadow-xs'
                  : 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
              }`}
            >
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.badgeColor}`}>
                  {step.badge}
                </span>
                <span className="text-xs text-slate-400 font-medium">Visite guidée</span>
              </div>
              <h2 id="tour-modal-title" className="text-base sm:text-lg font-black text-slate-900 mt-0.5 tracking-tight">
                {step.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Fermer la visite (Échap)"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {step.description}
          </p>

          {/* Highlights Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:p-4 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Points clés :</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              {step.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  const targetStep = TOUR_STEPS[idx];
                  if (targetStep.tab && onNavigateTab) {
                    onNavigateTab(targetStep.tab);
                  }
                }}
                className={`transition-all ${
                  idx === currentStepIndex
                    ? 'w-6 h-2 bg-teal-600 rounded-full'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400 rounded-full'
                }`}
                title={`Aller à l'étape ${idx + 1}`}
                aria-label={`Étape ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleSkip}
            className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            Passer la visite
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 sm:px-5 py-2 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 ${
                isLastStep
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              <span>{isLastStep ? 'Terminer la visite' : 'Suivant'}</span>
              {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
