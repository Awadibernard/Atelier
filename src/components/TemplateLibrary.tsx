import { useState, useMemo, type FormEvent } from 'react';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  Copy,
  Edit,
  Play,
  Hammer,
  ArrowRight,
  Sparkles,
  X,
  FileText,
  Crown,
  Lock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Layers,
  Percent,
  FolderCog,
  Tag,
  Check,
  Edit2,
  EyeOff,
  Eye,
  Settings,
} from 'lucide-react';
import {
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  TemplateCategory,
  UserEntitlement,
  WorkshopTemplate,
} from '../types';
import { calculateQuote } from '../engine/calculator';
import { formatCurrency, generateId } from '../utils/formatters';
import { isPremium } from '../licensing/features';
import { PremiumBadge } from './licensing/PremiumBadge';
import { PremiumGateModal } from './licensing/PremiumGateModal';
import { useNotification } from '../context/NotificationContext';
import { focusAndScrollToField } from '../utils/formValidation';

interface Props {
  templates: WorkshopTemplate[];
  categories?: TemplateCategory[];
  profile: BusinessProfile;
  onUseTemplate: (template: WorkshopTemplate) => void;
  onCreateTemplateInCalculator?: (info: {
    name: string;
    categoryId: string;
    description?: string;
  }) => void;
  onSaveTemplate: (template: Omit<WorkshopTemplate, 'id'> & { id?: string }) => void;
  onDeleteTemplate: (id: string) => void;
  onSaveCategory?: (cat: { id?: string; name: string }) => void;
  onRenameCategory?: (id: string, newName: string) => void;
  onToggleCategoryEnabled?: (id: string, enabled?: boolean) => void;
  onDeleteCategory?: (id: string, reassignToCategoryId: string) => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

type TabFilter = 'all' | 'free' | 'premium' | 'custom';

export function TemplateLibrary({
  templates,
  categories = [],
  profile,
  onUseTemplate,
  onCreateTemplateInCalculator,
  onSaveTemplate,
  onDeleteTemplate,
  onSaveCategory,
  onRenameCategory,
  onToggleCategoryEnabled,
  onDeleteCategory,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const userIsPremium = isPremium(entitlement);

  const [activeFilter, setActiveFilter] = useState<TabFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<WorkshopTemplate | null>(null);

  // Template to delete confirmation
  const [templateToDelete, setTemplateToDelete] = useState<WorkshopTemplate | null>(null);

  // Template to edit modal
  const [editingTemplate, setEditingTemplate] = useState<WorkshopTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Category Management modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<TemplateCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('autre');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string>('metal');
  const [editDescription, setEditDescription] = useState('');
  const [editWastePercent, setEditWastePercent] = useState(5);
  const [editMarginPercent, setEditMarginPercent] = useState(25);

  const { showSuccess, showError } = useNotification();

  // Helper map for category name resolution
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    // Default system fallbacks
    map.set('metal', 'Métallerie / Serrurerie');
    map.set('bois', 'Menuiserie Bois');
    map.set('alu', 'Menuiserie Aluminium');
    map.set('autre', 'Autre structure / Spécialisé');
    // Actual categories from DB
    categories.forEach((cat) => {
      map.set(cat.id, cat.name);
    });
    return map;
  }, [categories]);

  // Independent visibility flags
  const showSysTemplates =
    profile.showSystemTemplates !== false && profile.showPredefinedTemplates !== false;
  const showSysTemplateCategories =
    profile.showSystemTemplateCategories !== false &&
    profile.showPredefinedTemplateCategories !== false;

  // Determine templates visible according to showSystemTemplates setting
  const visibleTemplates = useMemo(() => {
    if (!showSysTemplates) {
      return templates.filter((t) => t.isCustom);
    }
    return templates;
  }, [templates, showSysTemplates]);

  // Determine categories visible according to showSystemTemplateCategories setting
  const visibleCategories = useMemo(() => {
    if (!showSysTemplateCategories) {
      return categories.filter((c) => !c.isDefault);
    }
    return categories;
  }, [categories, showSysTemplateCategories]);

  const formSelectCategories = useMemo(() => {
    if (!showSysTemplateCategories) {
      const customOnly = categories.filter((c) => !c.isDefault);
      return customOnly.length > 0 ? customOnly : categories;
    }
    return categories;
  }, [categories, showSysTemplateCategories]);

  const counts = useMemo(() => {
    const free = visibleTemplates.filter((t) => !t.isPremiumOnly && !t.isCustom).length;
    const premium = visibleTemplates.filter((t) => t.isPremiumOnly).length;
    const custom = visibleTemplates.filter((t) => t.isCustom).length;
    return { all: visibleTemplates.length, free, premium, custom };
  }, [visibleTemplates]);

  // Count templates per category (among visible)
  const categoryCounts = useMemo(() => {
    const countsMap = new Map<string, number>();
    visibleTemplates.forEach((tpl) => {
      const catId = tpl.categoryId || tpl.category || 'autre';
      countsMap.set(catId, (countsMap.get(catId) || 0) + 1);
    });
    return countsMap;
  }, [visibleTemplates]);

  // Filtered and sorted list
  // Priority: 1. My Custom Templates -> 2. Premium/System -> 3. Free/System
  // Within each group: alphabetical by name
  const filteredTemplates = useMemo(() => {
    const list = visibleTemplates.filter((tpl) => {
      // Type Filter
      if (activeFilter === 'free' && (tpl.isPremiumOnly || tpl.isCustom)) return false;
      if (activeFilter === 'premium' && !tpl.isPremiumOnly) return false;
      if (activeFilter === 'custom' && !tpl.isCustom) return false;

      // Category Filter
      if (selectedCategoryId !== 'all') {
        const catId = tpl.categoryId || tpl.category || 'autre';
        if (catId !== selectedCategoryId) return false;
      }

      return true;
    });

    const getPriority = (tpl: WorkshopTemplate): number => {
      if (tpl.isCustom) return 1;
      if (tpl.isPremiumOnly) return 2;
      return 3;
    };

    return list.sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) {
        return pA - pB;
      }
      return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base', numeric: true });
    });
  }, [visibleTemplates, activeFilter, selectedCategoryId]);

  const handleDuplicate = (tpl: WorkshopTemplate) => {
    const newName = `${tpl.name} (Copie)`;
    const catId = tpl.categoryId || tpl.category || 'autre';
    onSaveTemplate({
      name: newName,
      categoryId: catId,
      category: (['metal', 'bois', 'alu', 'autre'].includes(catId) ? catId : 'autre') as any,
      description: tpl.description,
      isPremiumOnly: false,
      isCustom: true,
      defaultMaterials: tpl.defaultMaterials.map((m) => ({ ...m })),
      defaultLabor: tpl.defaultLabor.map((l) => ({ ...l })),
      defaultOtherCosts: tpl.defaultOtherCosts.map((o) => ({ ...o })),
      wastePercent: tpl.wastePercent || 5,
      targetMarginPercent: tpl.targetMarginPercent || 25,
      overheadType: tpl.overheadType || 'percent',
      overheadValue: tpl.overheadValue || 0,
      pricingMode: tpl.pricingMode || 'margin',
      roundingStep: tpl.roundingStep || 'none',
    });
    showSuccess(`✓ Modèle « ${newName} » dupliqué dans votre bibliothèque.`);
  };

  const handleAttemptUseTemplate = (tpl: WorkshopTemplate) => {
    if (tpl.isPremiumOnly && !userIsPremium) {
      setSelectedPremiumTemplate(tpl);
      setGateModalOpen(true);
      return;
    }
    onUseTemplate(tpl);
  };

  const openEditModal = (tpl: WorkshopTemplate) => {
    setEditingTemplate(tpl);
    setEditName(tpl.name);
    setEditCategoryId(tpl.categoryId || tpl.category || (categories[0]?.id || 'autre'));
    setEditDescription(tpl.description || '');
    setEditWastePercent(tpl.wastePercent || 5);
    setEditMarginPercent(tpl.targetMarginPercent || 25);
    setIsCreateModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setEditName('');
    setEditCategoryId(formSelectCategories[0]?.id || 'autre');
    setEditDescription('');
    setEditWastePercent(profile.defaultWastePercent ?? 5);
    setEditMarginPercent(profile.defaultMarginPercent ?? 25);
    setIsCreateModalOpen(true);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showError('Veuillez saisir un nom pour le modèle.');
      focusAndScrollToField('template-edit-name');
      return;
    }

    const legacyCategory = (['metal', 'bois', 'alu', 'autre'].includes(editCategoryId)
      ? editCategoryId
      : 'autre') as any;

    if (editingTemplate) {
      if (editMarginPercent < 0 || editMarginPercent >= 100) {
        showError('La marge cible doit être comprise entre 0% et 99%.');
        focusAndScrollToField('template-edit-margin');
        return;
      }

      if (editWastePercent < 0) {
        showError('Le taux de chutes et pertes ne peut pas être négatif.');
        focusAndScrollToField('template-edit-waste');
        return;
      }

      // Update existing custom template
      onSaveTemplate({
        id: editingTemplate.id,
        name: editName.trim(),
        categoryId: editCategoryId,
        category: legacyCategory,
        description: editDescription.trim(),
        isPremiumOnly: editingTemplate.isPremiumOnly ?? false,
        isCustom: editingTemplate.isCustom ?? true,
        defaultMaterials: editingTemplate.defaultMaterials,
        defaultLabor: editingTemplate.defaultLabor,
        defaultOtherCosts: editingTemplate.defaultOtherCosts,
        wastePercent: editWastePercent,
        targetMarginPercent: editMarginPercent,
        overheadType: editingTemplate.overheadType || 'percent',
        overheadValue: editingTemplate.overheadValue || 0,
        pricingMode: editingTemplate.pricingMode || 'margin',
        roundingStep: editingTemplate.roundingStep || 'none',
      });
      showSuccess(`✓ Modèle « ${editName.trim()} » mis à jour avec succès.`);
      setIsCreateModalOpen(false);
      setEditingTemplate(null);
    } else {
      // NEW TEMPLATE CREATION WORKFLOW:
      // Open the Calculator with fresh blank calculation and template creation context
      if (onCreateTemplateInCalculator) {
        onCreateTemplateInCalculator({
          name: editName.trim(),
          categoryId: editCategoryId,
          description: editDescription.trim(),
        });
      }
      setIsCreateModalOpen(false);
    }
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      const name = templateToDelete.name;
      onDeleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
      showSuccess(`✓ Modèle « ${name} » supprimé.`);
    }
  };

  // Category management actions
  const handleCreateCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showError('Veuillez saisir un nom pour la catégorie.');
      return;
    }
    if (onSaveCategory) {
      onSaveCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      showSuccess(`✓ Catégorie « ${newCategoryName.trim()} » créée.`);
    }
  };

  const handleStartRenameCategory = (cat: TemplateCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveRenameCategory = (catId: string) => {
    if (!editingCatName.trim()) {
      showError('Le nom de catégorie ne peut pas être vide.');
      return;
    }
    if (onRenameCategory) {
      onRenameCategory(catId, editingCatName.trim());
      setEditingCatId(null);
      setEditingCatName('');
      showSuccess(`✓ Catégorie renommée.`);
    }
  };

  const handleToggleCategoryEnabled = (cat: TemplateCategory) => {
    if (onToggleCategoryEnabled) {
      const nextState = cat.enabled === false ? true : false;
      onToggleCategoryEnabled(cat.id, nextState);
      showSuccess(
        nextState
          ? `✓ Catégorie « ${cat.name} » réactivée.`
          : `✓ Catégorie « ${cat.name} » désactivée.`
      );
    }
  };

  const handlePromptDeleteCategory = (cat: TemplateCategory) => {
    setCategoryToDelete(cat);
    // Select first visible category that is not the one being deleted, with fallback to any available category
    const otherCat = formSelectCategories.find((c) => c.id !== cat.id) || categories.find((c) => c.id !== cat.id);
    setReassignTargetId(otherCat ? otherCat.id : 'autre');
  };

  const handleConfirmDeleteCategory = () => {
    if (categoryToDelete && onDeleteCategory) {
      const name = categoryToDelete.name;
      onDeleteCategory(categoryToDelete.id, reassignTargetId);
      if (selectedCategoryId === categoryToDelete.id) {
        setSelectedCategoryId('all');
      }
      setCategoryToDelete(null);
      showSuccess(`✓ Catégorie « ${name} » supprimée. Les modèles ont été réassignés.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-teal-600" />
            Bibliothèque de Modèles d'Ouvrages
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ouvrages prêts à l'emploi et modèles personnalisés organisés par catégories personnalisables.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <FolderCog className="w-4 h-4 text-slate-500" />
            <span>Gérer les catégories</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Modèle</span>
          </button>
        </div>
      </div>

      {/* Predefined templates notice when hidden */}
      {profile.showPredefinedTemplates === false && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <EyeOff className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Modèles prédéfinis masqués :</strong> Seuls vos modèles personnalisés d'atelier sont affichés.
            </span>
          </div>
          <span className="text-[11px] text-amber-800 shrink-0">
            Modifiable dans Paramètres
          </span>
        </div>
      )}

      {/* Filter Tabs & Category Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tous les modèles</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-semibold">
              {counts.all}
            </span>
          </button>

          {profile.showPredefinedTemplates !== false && (
            <>
              <button
                type="button"
                onClick={() => setActiveFilter('free')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'free'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gratuits</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                  {counts.free}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('premium')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'premium'
                    ? 'bg-white text-amber-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Premium Pro</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-semibold">
                  {counts.premium}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveFilter('custom')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'custom'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Mes Modèles Atelier</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-semibold">
              {counts.custom}
            </span>
          </button>
        </div>

        {/* Categories Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Catégories :</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Toutes ({visibleTemplates.length})
          </button>

          {visibleCategories
            .filter((cat) => cat.enabled !== false || selectedCategoryId === cat.id)
            .map((cat) => {
              const count = categoryCounts.get(cat.id) || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.enabled === false && (
                    <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-semibold">
                      Désactivée
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      selectedCategoryId === cat.id
                        ? 'bg-teal-800 text-teal-100'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            {activeFilter === 'custom' || !showSysTemplates
              ? 'Aucun modèle personnalisé disponible'
              : 'Aucun modèle dans cette sélection'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {!showSysTemplates
              ? 'Vous avez masqué les modèles prédéfinis. Vous pouvez créer vos propres modèles sur mesure ou réactiver les modèles dans les paramètres.'
              : 'Modifiez vos filtres ou créez un nouveau modèle sur mesure pour votre atelier.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un modèle</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            // Pre-calculate sample price for this template
            const calcInput: CalculationInput = {
              materials: tpl.defaultMaterials.map((m) => ({ ...m, id: generateId() })),
              wastePercent: tpl.wastePercent || 5,
              labor: tpl.defaultLabor.map((l) => ({ ...l, id: generateId() })),
              otherCosts: tpl.defaultOtherCosts.map((o) => ({ ...o, id: generateId() })),
              overheadType: tpl.overheadType || 'percent',
              overheadValue: tpl.overheadValue || 0,
              pricingMode: tpl.pricingMode || 'margin',
              targetProfitPercent: tpl.targetMarginPercent || 25,
              roundingStep: tpl.roundingStep || 'none',
            };
            const previewResult = calculateQuote(calcInput);
            const isGated = tpl.isPremiumOnly && !userIsPremium;
            const categoryName = categoryMap.get(tpl.categoryId || tpl.category) || 'Autre';

            return (
              <div
                key={tpl.id}
                className={`rounded-xl border shadow-2xs p-5 flex flex-col justify-between space-y-4 transition-all ${
                  tpl.isPremiumOnly
                    ? 'bg-gradient-to-br from-white to-amber-50/30 border-amber-300/80 hover:border-amber-400'
                    : tpl.isCustom
                    ? 'bg-gradient-to-br from-white to-teal-50/20 border-teal-200 hover:border-teal-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          tpl.isPremiumOnly
                            ? 'bg-amber-100 text-amber-800'
                            : tpl.isCustom
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tpl.isPremiumOnly ? (
                          <Crown className="w-5 h-5 text-amber-600" />
                        ) : tpl.isCustom ? (
                          <Sparkles className="w-5 h-5 text-teal-600" />
                        ) : (
                          <Hammer className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900">{tpl.name}</h3>
                          {tpl.isPremiumOnly && (
                            <PremiumBadge label="Pro" size="xs" variant="gold" />
                          )}
                          {tpl.isCustom && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
                              Mon Modèle
                            </span>
                          )}
                          {!tpl.isPremiumOnly && !tpl.isCustom && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              Gratuit
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase tracking-wider inline-block mt-0.5">
                          {categoryName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-semibold">Prix Indicatif</span>
                      <span className="font-mono text-sm font-black text-slate-900">
                        {formatCurrency(previewResult.roundedSellingPrice, currency)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{tpl.description}</p>

                  {/* Items preview pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      📦 {tpl.defaultMaterials.length} matériaux
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      ⏱️ {tpl.defaultLabor.reduce((s, l) => s + l.hours, 0)}h main d'œuvre
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold">
                      🎯 {tpl.targetMarginPercent}% marge
                    </span>
                    {tpl.wastePercent !== undefined && tpl.wastePercent > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold">
                        ✂️ {tpl.wastePercent}% chutes
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1">
                    {tpl.isCustom && (
                      <button
                        type="button"
                        onClick={() => openEditModal(tpl)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="Modifier ce modèle personnalisé"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDuplicate(tpl)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Dupliquer comme nouveau modèle dans ma bibliothèque"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {tpl.isCustom && (
                      <button
                        type="button"
                        onClick={() => setTemplateToDelete(tpl)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer ce modèle personnalisé de ma bibliothèque"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAttemptUseTemplate(tpl)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
                      isGated
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    {isGated ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Ouvrir (Modèle Pro)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span><span className="inline sm:hidden">Utiliser</span><span className="hidden sm:inline">Utiliser dans le Calculateur</span></span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Manage Categories */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderCog className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Catégories d'ouvrages
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Organisez vos modèles selon les spécialités de votre atelier.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
              {/* Add category form */}
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nouvelle catégorie (ex: Escaliers & Rampes, Stores & Pergolas)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </form>

              {/* Notice if system categories are hidden */}
              {!showSysTemplateCategories && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 shadow-2xs">
                  <EyeOff className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Les catégories de modèles par défaut du système sont masquées (activables dans Paramètres).</span>
                </div>
              )}

              {/* Categories list */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Catégories existantes</label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {visibleCategories.map((cat) => {
                    const count = categoryCounts.get(cat.id) || 0;
                    const isEditing = editingCatId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 bg-white flex items-center justify-between gap-3"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 border border-teal-500 rounded-md focus:outline-hidden text-xs font-medium"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameCategory(cat.id)}
                              className="p-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 cursor-pointer"
                              title="Enregistrer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Annuler"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Tag className={`w-4 h-4 shrink-0 ${cat.enabled === false ? 'text-slate-300' : 'text-slate-400'}`} />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-bold block truncate ${cat.enabled === false ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    {cat.name}
                                  </span>
                                  {cat.enabled === false && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                      Désactivée
                                    </span>
                                  )}
                                  {cat.isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                      Par défaut
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {count} modèle(s)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleCategoryEnabled(cat)}
                                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  cat.enabled === false
                                    ? 'text-amber-600 hover:bg-amber-50 bg-amber-50/50'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                }`}
                                title={cat.enabled === false ? 'Réactiver la catégorie' : 'Désactiver la catégorie'}
                              >
                                {cat.enabled === false ? (
                                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {!cat.isDefault && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartRenameCategory(cat)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Renommer la catégorie"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePromptDeleteCategory(cat)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Supprimer la catégorie"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCatId(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Category Confirmation with Reassignment */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Supprimer la catégorie « {categoryToDelete.name} » ?
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sécurité garantie : aucun modèle ne sera supprimé.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reassign-category-select" className="font-bold text-slate-700 block">
                Réassigner les modèles de cette catégorie vers :
              </label>
              <select
                id="reassign-category-select"
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium bg-white"
              >
                {formSelectCategories
                  .filter((c) => c.id !== categoryToDelete.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
              >
                Supprimer et réassigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Template */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'ouvrage'}
                  </h3>
                  {!editingTemplate && (
                    <p className="text-[11px] text-slate-500 font-normal">
                      Étape 1/2 : Définissez le nom, puis configurez le calcul dans l'atelier.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTemplate(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="template-edit-name" className="font-bold text-slate-700 block">Nom du modèle *</label>
                <input
                  id="template-edit-name"
                  type="text"
                  required
                  placeholder="Ex: Porte industrielle 2 vantaux, Grille de défense..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="template-edit-category" className="font-bold text-slate-700 block">Catégorie d'ouvrage</label>
                <select
                  id="template-edit-category"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                >
                  {formSelectCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {editingTemplate && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="template-edit-margin" className="font-bold text-slate-700 block">Marge cible (%)</label>
                    <input
                      id="template-edit-margin"
                      type="number"
                      min="0"
                      max="100"
                      value={editMarginPercent}
                      onChange={(e) => setEditMarginPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="template-edit-waste" className="font-bold text-slate-700 block">Chutes & pertes (%)</label>
                    <input
                      id="template-edit-waste"
                      type="number"
                      min="0"
                      max="50"
                      value={editWastePercent}
                      onChange={(e) => setEditWastePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="template-edit-desc" className="font-bold text-slate-700 block">Description / Notes techniques (optionnel)</label>
                <textarea
                  id="template-edit-desc"
                  rows={3}
                  placeholder="Spécifications (sections des profilés, accessoires inclus, finitions)..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {editingTemplate ? (
                    'Mettre à jour'
                  ) : (
                    <>
                      <span>Continuer vers le calculateur</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-red-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Supprimer ce modèle ?</h3>
                <p className="text-xs text-slate-500">{templateToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Cette action retirera le modèle de votre bibliothèque. Vos devis et calculs déjà créés à partir de ce modèle ne seront <strong>pas modifiés</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Gate Modal */}
      <PremiumGateModal
        isOpen={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        featureKey="advanced_templates"
        customTitle={`Modèle Professionnel Spécialisé : ${selectedPremiumTemplate?.name || 'Ouvrage Pro'}`}
        customDescription={`Ce modèle avancé (${selectedPremiumTemplate?.name}) intègre les nomenclatures et débits complets réservés aux membres AtelierDevis Premium. Tous les 4 modèles standards restent 100% gratuits.`}
        onOpenPremiumInfo={() => {
          if (onOpenPremiumModal) {
            onOpenPremiumModal();
          }
        }}
      />
    </div>
  );
}
