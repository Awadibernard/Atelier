import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { QuickCalculator } from './components/QuickCalculator';
import { QuoteBuilder } from './components/QuoteBuilder';
import { QuoteHistory } from './components/QuoteHistory';
import { MaterialLibrary } from './components/MaterialLibrary';
import { TemplateLibrary } from './components/TemplateLibrary';
import { SettingsView } from './components/SettingsView';
import { PremiumPresentationModal } from './components/licensing/PremiumPresentationModal';
import {
  AppTab,
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  LaborRateLibraryItem,
  MaterialLibraryItem,
  Quote,
  RecentCalculation,
  UserEntitlement,
  WorkshopTemplate,
} from './types';
import {
  getProfile,
  saveProfile,
  getQuotes,
  saveQuote,
  deleteQuote,
  duplicateQuote,
  getNextQuoteNumber,
  getMaterials,
  saveMaterial,
  deleteMaterial,
  getLaborRates,
  saveLaborRate,
  deleteLaborRate,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getRecentCalculations,
  saveRecentCalculation,
  getEntitlement,
  saveEntitlement,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetToFactoryDefaults,
} from './storage/db';
import { generateId } from './utils/formatters';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Database States
  const [profile, setProfile] = useState<BusinessProfile>(() => getProfile());
  const [quotes, setQuotes] = useState<Quote[]>(() => getQuotes());
  const [materials, setMaterials] = useState<MaterialLibraryItem[]>(() => getMaterials());
  const [laborRates, setLaborRates] = useState<LaborRateLibraryItem[]>(() => getLaborRates());
  const [templates, setTemplates] = useState<WorkshopTemplate[]>(() => getTemplates());
  const [recentCalculations, setRecentCalculations] = useState<RecentCalculation[]>(() =>
    getRecentCalculations()
  );
  const [entitlement, setEntitlement] = useState<UserEntitlement>(() => getEntitlement());

  // Premium modal presentation state
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Workflow Handlers State
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [calculationForQuote, setCalculationForQuote] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WorkshopTemplate | null>(null);

  // Reload all states from storage
  const refreshStorage = useCallback(() => {
    setProfile(getProfile());
    setQuotes(getQuotes());
    setMaterials(getMaterials());
    setLaborRates(getLaborRates());
    setTemplates(getTemplates());
    setRecentCalculations(getRecentCalculations());
    setEntitlement(getEntitlement());
  }, []);

  const handleUpdateEntitlement = (newEntitlement: UserEntitlement) => {
    saveEntitlement(newEntitlement);
    setEntitlement(newEntitlement);
  };


  // Quick Action: New Quote from Scratch
  const handleStartNewQuote = () => {
    setEditingQuote(null);
    setCalculationForQuote(null);
    setActiveTab('quote-builder');
  };

  // Quick Action: Edit Quote
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setCalculationForQuote(null);
    setActiveTab('quote-builder');
  };

  // Quick Action: Duplicate Quote
  const handleDuplicateQuote = (id: string) => {
    const dup = duplicateQuote(id);
    if (dup) {
      refreshStorage();
      setEditingQuote(dup);
      setActiveTab('quote-builder');
    }
  };

  // Quick Action: Delete Quote
  const handleDeleteQuote = (id: string) => {
    deleteQuote(id);
    refreshStorage();
  };

  // Save Quote
  const handleSaveQuote = (quote: Quote) => {
    saveQuote(quote);
    refreshStorage();
  };

  // Quick Action: From Calculator to Quote Builder
  const handleGenerateQuoteFromCalc = (
    input: CalculationInput,
    result: CalculationResult
  ) => {
    setEditingQuote(null);
    setCalculationForQuote({ input, result });
    setActiveTab('quote-builder');
  };

  // Quick Action: Use Template in Calculator
  const handleUseTemplateInCalculator = (template: WorkshopTemplate) => {
    setActiveTemplate(template);
    setActiveTab('calculator');
  };

  // Quick Action: Save Recent Calculation
  const handleSaveCalculation = (title: string, input: CalculationInput, result: CalculationResult) => {
    saveRecentCalculation(title, input, result);
    refreshStorage();
  };

  // Handlers for Materials
  const handleSaveMaterial = (
    item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }
  ) => {
    saveMaterial(item);
    refreshStorage();
  };

  const handleDeleteMaterial = (id: string) => {
    deleteMaterial(id);
    refreshStorage();
  };

  // Handlers for Labor Rates
  const handleSaveLaborRate = (
    item: Omit<LaborRateLibraryItem, 'id'> & { id?: string }
  ) => {
    saveLaborRate(item);
    refreshStorage();
  };

  const handleDeleteLaborRate = (id: string) => {
    deleteLaborRate(id);
    refreshStorage();
  };

  // Handlers for Templates
  const handleSaveTemplate = (
    item: Omit<WorkshopTemplate, 'id'> & { id?: string }
  ) => {
    saveTemplate(item);
    refreshStorage();
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    refreshStorage();
  };

  // Handlers for Profile & Backup
  const handleSaveProfile = (newProfile: BusinessProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
  };

  const handleExportData = () => {
    const json = exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelierdevis-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonString: string) => {
    const res = importDatabaseJSON(jsonString);
    if (res.success) {
      refreshStorage();
    }
    return res;
  };

  const handleResetData = () => {
    resetToFactoryDefaults();
    refreshStorage();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top and Mobile Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'quote-builder') {
            setEditingQuote(null);
            setCalculationForQuote(null);
          }
          setActiveTab(tab);
        }}
        profile={profile}
        entitlement={entitlement}
        onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {activeTab === 'home' && (
          <HomeView
            profile={profile}
            quotes={quotes}
            recentCalculations={recentCalculations}
            templates={templates}
            onNavigate={(tab) => {
              if (tab === 'quote-builder') {
                setEditingQuote(null);
                setCalculationForQuote(null);
              }
              setActiveTab(tab);
            }}
            onNewQuote={handleStartNewQuote}
            onOpenCalculator={() => {
              setActiveTemplate(null);
              setActiveTab('calculator');
            }}
            onUseTemplate={handleUseTemplateInCalculator}
            onSelectQuote={handleEditQuote}
            entitlement={entitlement}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        )}

        {activeTab === 'calculator' && (
          <QuickCalculator
            profile={profile}
            materialLibrary={materials}
            laborLibrary={laborRates}
            initialTemplate={activeTemplate}
            onGenerateQuote={handleGenerateQuoteFromCalc}
            onSaveCalculation={handleSaveCalculation}
          />
        )}

        {activeTab === 'quotes' && (
          <QuoteHistory
            quotes={quotes}
            profile={profile}
            onEditQuote={handleEditQuote}
            onDuplicateQuote={handleDuplicateQuote}
            onDeleteQuote={handleDeleteQuote}
            onNewQuote={handleStartNewQuote}
            entitlement={entitlement}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        )}

        {activeTab === 'quote-builder' && (
          <QuoteBuilder
            profile={profile}
            editingQuote={editingQuote}
            fromCalculation={calculationForQuote}
            onSaveQuote={(savedQuote) => {
              handleSaveQuote(savedQuote);
              setActiveTab('quotes');
            }}
            onCancel={() => setActiveTab('quotes')}
            nextQuoteNumber={getNextQuoteNumber()}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialLibrary
            materials={materials}
            laborRates={laborRates}
            profile={profile}
            onSaveMaterial={handleSaveMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onSaveLaborRate={handleSaveLaborRate}
            onDeleteLaborRate={handleDeleteLaborRate}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateLibrary
            templates={templates}
            profile={profile}
            onUseTemplate={handleUseTemplateInCalculator}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            entitlement={entitlement}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetData={handleResetData}
            entitlement={entitlement}
            onUpdateEntitlement={handleUpdateEntitlement}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
          />
        )}
      </main>

      {/* Global Premium Presentation & License Activation Modal */}
      <PremiumPresentationModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        entitlement={entitlement}
        onUpdateEntitlement={handleUpdateEntitlement}
      />
    </div>
  );
}
