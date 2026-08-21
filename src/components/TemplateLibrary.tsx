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
} from 'lucide-react';
import {
  BusinessProfile,
  CalculationInput,
  CalculationResult,
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
  profile: BusinessProfile;
  onUseTemplate: (template: WorkshopTemplate) => void;
  onSaveTemplate: (template: Omit<WorkshopTemplate, 'id'> & { id?: string }) => void;
  onDeleteTemplate: (id: string) => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

type TabFilter = 'all' | 'free' | 'premium' | 'custom';

export function TemplateLibrary({
  templates,
  profile,
  onUseTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const userIsPremium = isPremium(entitlement);

  const [activeFilter, setActiveFilter] = useState<TabFilter>('all');
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<WorkshopTemplate | null>(null);

  // Template to delete confirmation
  const [templateToDelete, setTemplateToDelete] = useState<WorkshopTemplate | null>(null);

  // Template to edit modal
  const [editingTemplate, setEditingTemplate] = useState<WorkshopTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'metal' | 'bois' | 'alu' | 'autre'>('metal');
  const [editDescription, setEditDescription] = useState('');
  const [editWastePercent, setEditWastePercent] = useState(5);
  const [editMarginPercent, setEditMarginPercent] = useState(25);

  const { showSuccess, showError } = useNotification();

  const counts = useMemo(() => {
    const free = templates.filter((t) => !t.isPremiumOnly && !t.isCustom).length;
    const premium = templates.filter((t) => t.isPremiumOnly).length;
    const custom = templates.filter((t) => t.isCustom).length;
    return { all: templates.length, free, premium, custom };
  }, [templates]);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (activeFilter === 'free') return !tpl.isPremiumOnly && !tpl.isCustom;
      if (activeFilter === 'premium') return !!tpl.isPremiumOnly;
      if (activeFilter === 'custom') return !!tpl.isCustom;
      return true;
    });
  }, [templates, activeFilter]);

  const handleDuplicate = (tpl: WorkshopTemplate) => {
    const newName = `${tpl.name} (Copie)`;
    onSaveTemplate({
      name: newName,
      category: tpl.category,
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
    setEditCategory(tpl.category);
    setEditDescription(tpl.description || '');
    setEditWastePercent(tpl.wastePercent || 5);
    setEditMarginPercent(tpl.targetMarginPercent || 25);
    setIsCreateModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setEditName('');
    setEditCategory('metal');
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

    if (editingTemplate) {
      // Update existing custom template
      onSaveTemplate({
        id: editingTemplate.id,
        name: editName.trim(),
        category: editCategory,
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
    } else {
      // Create new template
      onSaveTemplate({
        name: editName.trim(),
        category: editCategory,
        description: editDescription.trim(),
        isPremiumOnly: false,
        isCustom: true,
        defaultMaterials: [
          { name: 'Tube carré 40×40', quantity: 6, unit: 'm', unitPrice: 2000 },
        ],
        defaultLabor: [
          { task: 'Découpe & Soudure métallique', hours: 4, hourlyRate: profile.defaultLaborRate || 2500 },
        ],
        defaultOtherCosts: [],
        wastePercent: editWastePercent,
        targetMarginPercent: editMarginPercent,
        overheadType: 'percent',
        overheadValue: 0,
        pricingMode: 'margin',
        roundingStep: profile.defaultRounding || 'none',
      });
      showSuccess(`✓ Nouveau modèle « ${editName.trim()} » créé dans votre bibliothèque.`);
    }

    setIsCreateModalOpen(false);
    setEditingTemplate(null);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      const name = templateToDelete.name;
      onDeleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
      showSuccess(`✓ Modèle « ${name} » supprimé.`);
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
            Ouvrages prêts à l'emploi (portes, portails, pergolas, escaliers) et modèles personnalisés créés par votre atelier.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Modèle</span>
        </button>
      </div>

      {/* Filter Tabs */}
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

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            {activeFilter === 'custom'
              ? 'Aucun modèle personnalisé pour le moment'
              : 'Aucun modèle dans cette catégorie'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeFilter === 'custom'
              ? 'Vous pouvez créer un modèle à tout moment depuis le calculateur en cliquant sur "Enregistrer comme modèle" ou via le bouton ci-dessous.'
              : 'Modifiez votre filtre pour afficher les autres modèles.'}
          </p>
          {activeFilter === 'custom' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer mon premier modèle</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                          {tpl.category}
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
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
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
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
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
                        <span>Utiliser dans le Calculateur</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Template */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'ouvrage'}
                </h3>
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
                  placeholder="Ex: Porte industrielle 2 vantaux..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="template-edit-category" className="font-bold text-slate-700 block">Catégorie</label>
                  <select
                    id="template-edit-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                  >
                    <option value="metal">Métal / Acier / Inox</option>
                    <option value="bois">Bois / Menuiserie</option>
                    <option value="alu">Aluminium</option>
                    <option value="autre">Autre ouvrage</option>
                  </select>
                </div>

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
              </div>

              <div className="space-y-1">
                <label htmlFor="template-edit-waste" className="font-bold text-slate-700 block">Taux de chutes & pertes (%)</label>
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

              <div className="space-y-1">
                <label htmlFor="template-edit-desc" className="font-bold text-slate-700 block">Description / Notes techniques</label>
                <textarea
                  id="template-edit-desc"
                  rows={3}
                  placeholder="Spécifications (sections des tubes, types de fers, accessoires inclus)..."
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer"
                >
                  {editingTemplate ? 'Mettre à jour' : 'Enregistrer le modèle'}
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
