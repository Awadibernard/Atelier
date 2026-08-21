import { useState, useMemo, FormEvent } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  Check,
  Hammer,
  Clock,
  Filter,
} from 'lucide-react';
import {
  BusinessProfile,
  LaborRateLibraryItem,
  MaterialLibraryItem,
  MaterialUnit,
} from '../types';
import { formatCurrency } from '../utils/formatters';
import { sanitizeNumber } from '../engine/calculator';
import { useNotification } from '../context/NotificationContext';
import { focusAndScrollToField } from '../utils/formValidation';

interface Props {
  materials: MaterialLibraryItem[];
  laborRates: LaborRateLibraryItem[];
  profile: BusinessProfile;
  onSaveMaterial: (item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }) => void;
  onDeleteMaterial: (id: string) => void;
  onSaveLaborRate: (item: Omit<LaborRateLibraryItem, 'id'> & { id?: string }) => void;
  onDeleteLaborRate: (id: string) => void;
}

const CATEGORIES = [
  'Tous',
  'Tubes & Profilés',
  'Tôles & Fers',
  'Soudure & Consommables',
  'Peinture & Finition',
  'Quincaillerie & Accessoires',
  'Bois & Menuiserie',
  'Aluminium',
  'Autre',
];

const COMMON_UNITS = [
  { value: 'm', label: 'Mètre (m)' },
  { value: 'piece', label: 'Pièce (pce)' },
  { value: 'm2', label: 'Mètre carré (m²)' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'l', label: 'Litre (L)' },
  { value: 'barre', label: 'Barre (6m)' },
  { value: 'feuille', label: 'Feuille / Tôle' },
  { value: 'paquet', label: 'Paquet / Boîte' },
  { value: 'm3', label: 'Mètre cube (m³)' },
];

export function MaterialLibrary({
  materials,
  laborRates,
  profile,
  onSaveMaterial,
  onDeleteMaterial,
  onSaveLaborRate,
  onDeleteLaborRate,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const { showSuccess, showError, showInfo } = useNotification();

  const [activeTab, setActiveTab] = useState<'materials' | 'labor'>('materials');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Material editing modal/form
  const [isEditingMaterial, setIsEditingMaterial] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | undefined>(undefined);
  const [matForm, setMatForm] = useState({
    name: '',
    category: 'Tubes & Profilés',
    unit: 'm' as MaterialUnit,
    defaultUnitPrice: 2000,
  });

  // Labor rate editing modal/form
  const [isEditingLabor, setIsEditingLabor] = useState<boolean>(false);
  const [editingLaborId, setEditingLaborId] = useState<string | undefined>(undefined);
  const [laborForm, setLaborForm] = useState({
    task: '',
    defaultRate: 2500,
    description: '',
  });

  // Quick inline price update map
  const [inlinePrices, setInlinePrices] = useState<Record<string, number>>({});

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'Tous' || m.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [materials, searchQuery, selectedCategory]);

  const handleOpenNewMaterial = () => {
    setEditingMaterialId(undefined);
    setMatForm({
      name: '',
      category: selectedCategory !== 'Tous' ? selectedCategory : 'Tubes & Profilés',
      unit: 'm',
      defaultUnitPrice: 2000,
    });
    setIsEditingMaterial(true);
  };

  const handleOpenEditMaterial = (item: MaterialLibraryItem) => {
    setEditingMaterialId(item.id);
    setMatForm({
      name: item.name,
      category: item.category || 'Tubes & Profilés',
      unit: item.unit as MaterialUnit,
      defaultUnitPrice: item.defaultUnitPrice,
    });
    setIsEditingMaterial(true);
  };

  const handleSaveMaterialSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!matForm.name.trim()) {
      showError('Veuillez renseigner le nom du matériau.');
      focusAndScrollToField('material-form-name');
      return;
    }

    if (matForm.defaultUnitPrice < 0) {
      showError('Le prix unitaire ne peut pas être négatif.');
      focusAndScrollToField('material-form-price');
      return;
    }

    onSaveMaterial({
      id: editingMaterialId,
      name: matForm.name.trim(),
      category: matForm.category,
      unit: matForm.unit,
      defaultUnitPrice: sanitizeNumber(matForm.defaultUnitPrice),
    });

    setIsEditingMaterial(false);
    showSuccess(`✓ Matériau « ${matForm.name.trim()} » enregistré.`);
  };

  const handleSaveInlinePrice = (item: MaterialLibraryItem) => {
    const newPrice = inlinePrices[item.id];
    if (newPrice !== undefined && newPrice >= 0) {
      onSaveMaterial({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        defaultUnitPrice: sanitizeNumber(newPrice),
      });
      setInlinePrices((prev) => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      showSuccess(`✓ Prix mis à jour pour « ${item.name} »`);
    }
  };

  // Labor rates
  const handleOpenNewLabor = () => {
    setEditingLaborId(undefined);
    setLaborForm({
      task: '',
      defaultRate: 2500,
      description: '',
    });
    setIsEditingLabor(true);
  };

  const handleOpenEditLabor = (item: LaborRateLibraryItem) => {
    setEditingLaborId(item.id);
    setLaborForm({
      task: item.task,
      defaultRate: item.defaultRate,
      description: item.description || '',
    });
    setIsEditingLabor(true);
  };

  const handleSaveLaborSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!laborForm.task.trim()) {
      showError('Veuillez renseigner l\'intitulé de la tâche.');
      focusAndScrollToField('labor-form-task');
      return;
    }

    if (laborForm.defaultRate < 0) {
      showError('Le taux horaire ne peut pas être négatif.');
      focusAndScrollToField('labor-form-rate');
      return;
    }

    onSaveLaborRate({
      id: editingLaborId,
      task: laborForm.task.trim(),
      defaultRate: sanitizeNumber(laborForm.defaultRate),
      description: laborForm.description,
    });

    setIsEditingLabor(false);
    showSuccess(`✓ Tarif « ${laborForm.task.trim()} » enregistré.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" />
            Bibliothèque de Prix & Matériaux
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Enregistrez les prix unitaires de votre atelier. Ils se chargeront automatiquement lors de vos calculs et devis.
          </p>
        </div>

        {/* Tab Toggle: Materials vs Labor rates */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-200 rounded-lg text-xs font-bold">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'materials'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matériaux ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('labor')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'labor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Taux Horaires ({laborRates.length})
            </button>
          </div>

          {activeTab === 'materials' ? (
            <button
              onClick={handleOpenNewMaterial}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau matériau</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewLabor}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau taux horaire</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'materials' ? (
        <>
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un tube, tôle, peinture, serrure..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-teal-500 shadow-2xs"
              />
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Grid / Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredMaterials.length === 0 ? (
              <div className="text-center py-12 p-6 text-xs text-slate-400">
                Aucun matériau ne correspond à votre recherche.
              </div>
            ) : (
              filteredMaterials.map((mat) => {
                const isModified =
                  inlinePrices[mat.id] !== undefined &&
                  inlinePrices[mat.id] !== mat.defaultUnitPrice;

                return (
                  <div
                    key={mat.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{mat.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          {mat.category || 'Général'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Unité de référence : <strong className="text-slate-700">{mat.unit}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Price editor */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">Prix :</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={
                            inlinePrices[mat.id] !== undefined
                              ? inlinePrices[mat.id]
                              : mat.defaultUnitPrice
                          }
                          onChange={(e) =>
                            setInlinePrices({
                              ...inlinePrices,
                              [mat.id]: sanitizeNumber(e.target.value),
                            })
                          }
                          className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-right text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                        />
                        <span className="text-xs font-bold text-slate-700">{currency}</span>

                        {isModified && (
                          <button
                            onClick={() => handleSaveInlinePrice(mat)}
                            className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                            title="Valider le nouveau prix"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleOpenEditMaterial(mat)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer le matériau "${mat.name}" ?`)) {
                            onDeleteMaterial(mat.id);
                            showInfo(`Matériau « ${mat.name} » supprimé.`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Labor Rates Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {laborRates.length === 0 ? (
            <div className="text-center py-12 p-6 text-xs text-slate-400">
              Aucun taux horaire enregistré.
            </div>
          ) : (
            laborRates.map((rate) => (
              <div
                key={rate.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-sm text-slate-900">{rate.task}</span>
                  </div>
                  {rate.description && (
                    <p className="text-xs text-slate-500">{rate.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono text-base font-black text-slate-900">
                      {formatCurrency(rate.defaultRate, currency)}
                    </span>
                    <span className="text-xs text-slate-500"> / heure</span>
                  </div>

                  <button
                    onClick={() => handleOpenEditLabor(rate)}
                    className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer le tarif "${rate.task}" ?`)) {
                        onDeleteLaborRate(rate.id);
                        showInfo(`Tarif « ${rate.task} » supprimé.`);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Material Modal Form */}
      {isEditingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {editingMaterialId ? 'Modifier le matériau' : 'Ajouter un matériau'}
              </h3>
              <button
                onClick={() => setIsEditingMaterial(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterialSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label htmlFor="material-form-name" className="font-semibold text-slate-700 block mb-1">
                  Nom du matériau *
                </label>
                <input
                  id="material-form-name"
                  type="text"
                  required
                  value={matForm.name}
                  onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                  placeholder="Ex: Tube carré 40×40 (ép. 1.5mm)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="material-form-category" className="font-semibold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    id="material-form-category"
                    value={matForm.category}
                    onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    {CATEGORIES.filter((c) => c !== 'Tous').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="material-form-unit" className="font-semibold text-slate-700 block mb-1">Unité</label>
                  <select
                    id="material-form-unit"
                    value={matForm.unit}
                    onChange={(e) =>
                      setMatForm({ ...matForm, unit: e.target.value as MaterialUnit })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="material-form-price" className="font-semibold text-slate-700 block mb-1">
                  Prix Unitaire par défaut ({currency}) *
                </label>
                <input
                  id="material-form-price"
                  type="number"
                  min="0"
                  required
                  step="100"
                  value={matForm.defaultUnitPrice}
                  onChange={(e) =>
                    setMatForm({ ...matForm, defaultUnitPrice: sanitizeNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMaterial(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Modal Form */}
      {isEditingLabor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {editingLaborId ? 'Modifier le taux horaire' : 'Ajouter un taux horaire'}
              </h3>
              <button
                onClick={() => setIsEditingLabor(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLaborSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label htmlFor="labor-form-task" className="font-semibold text-slate-700 block mb-1">
                  Intitulé de la tâche *
                </label>
                <input
                  id="labor-form-task"
                  type="text"
                  required
                  value={laborForm.task}
                  onChange={(e) => setLaborForm({ ...laborForm, task: e.target.value })}
                  placeholder="Ex: Soudure TIG & Façonnage"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="labor-form-rate" className="font-semibold text-slate-700 block mb-1">
                  Taux horaire ({currency}/h) *
                </label>
                <input
                  id="labor-form-rate"
                  type="number"
                  min="0"
                  required
                  step="100"
                  value={laborForm.defaultRate}
                  onChange={(e) =>
                    setLaborForm({ ...laborForm, defaultRate: sanitizeNumber(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="labor-form-desc" className="font-semibold text-slate-700 block mb-1">
                  Description / Remarques (Optionnel)
                </label>
                <textarea
                  id="labor-form-desc"
                  rows={2}
                  value={laborForm.description}
                  onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })}
                  placeholder="Détails sur l'équipement ou la technicité requise..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingLabor(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
