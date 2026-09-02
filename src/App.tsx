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
import { GuidedTourModal } from './components/GuidedTourModal';
import { NotificationProvider } from './context/NotificationContext';
import {
  AppTab,
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  LaborRateLibraryItem,
  MaterialCategory,
  MaterialLibraryItem,
  Quote,
  QuoteStatus,
  RecentCalculation,
  UserEntitlement,
  WorkshopTemplate,
  TemplateCategory,
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
  getTemplateCategories,
  saveTemplateCategory,
  renameTemplateCategory,
  toggleTemplateCategoryEnabled,
  deleteTemplateCategory,
  getMaterialCategories,
  saveMaterialCategory,
  renameMaterialCategory,
  toggleMaterialCategoryEnabled,
  deleteMaterialCategory,
  getRecentCalculations,
  saveRecentCalculation,
  getEntitlement,
  saveEntitlement,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetToFactoryDefaults,
  clearDraftCalculation,
  clearDraftQuote,
  hasCompletedOnboarding,
  setOnboardingCompleted,
} from './storage/db';
import { generateId } from './utils/formatters';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // PROBLEM 1: Automatically reset scroll position to top when navigating to a new view/section
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Database States
  const [profile, setProfile] = useState<BusinessProfile>(() => getProfile());
  const [quotes, setQuotes] = useState<Quote[]>(() => getQuotes());
  const [materials, setMaterials] = useState<MaterialLibraryItem[]>(() => getMaterials());
  const [laborRates, setLaborRates] = useState<LaborRateLibraryItem[]>(() => getLaborRates());
  const [templates, setTemplates] = useState<WorkshopTemplate[]>(() => getTemplates());
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>(() =>
    getTemplateCategories()
  );
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>(() =>
    getMaterialCategories()
  );
  const [recentCalculations, setRecentCalculations] = useState<RecentCalculation[]>(() =>
    getRecentCalculations()
  );
  const [entitlement, setEntitlement] = useState<UserEntitlement>(() => getEntitlement());

  // Premium modal presentation state
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // First-time onboarding guided tour state
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => !hasCompletedOnboarding());

  // Workflow Handlers State
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [calculationForQuote, setCalculationForQuote] = useState<{
    input: CalculationInput;
    result: CalculationResult;
  } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WorkshopTemplate | null>(null);
  const [templateCreationContext, setTemplateCreationContext] = useState<{
    name: string;
    categoryId: string;
    description?: string;
  } | null>(null);

  // Reload all states from storage
  const refreshStorage = useCallback(() => {
    setProfile(getProfile());
    setQuotes(getQuotes());
    setMaterials(getMaterials());
    setLaborRates(getLaborRates());
    setTemplates(getTemplates());
    setTemplateCategories(getTemplateCategories());
    setMaterialCategories(getMaterialCategories());
    setRecentCalculations(getRecentCalculations());
    setEntitlement(getEntitlement());
  }, []);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setOnboardingCompleted(true);
  };

  const handleRestartTour = () => {
    setIsTourOpen(true);
  };

  const handleUpdateQuoteStatus = (id: string, newStatus: QuoteStatus) => {
    const existing = quotes.find((q) => q.id === id);
    if (existing) {
      saveQuote({
        ...existing,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      refreshStorage();
    }
  };

  const handleUpdateEntitlement = (newEntitlement: UserEntitlement) => {
    saveEntitlement(newEntitlement);
    setEntitlement(newEntitlement);
  };

  // Quick Action: New Quote from Scratch
  const handleStartNewQuote = () => {
    setEditingQuote(null);
    setCalculationForQuote(null);
    setActiveTemplate(null);
    setTemplateCreationContext(null);
    clearDraftQuote();
    clearDraftCalculation();
    setActiveTab('calculator');
  };

  // Quick Action: Edit Quote
  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    if (quote.calculationInput && quote.calculationResult) {
      setCalculationForQuote({
        input: quote.calculationInput,
        result: quote.calculationResult,
      });
    } else {
      setCalculationForQuote(null);
    }
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
    clearDraftQuote();
    clearDraftCalculation();
    setCalculationForQuote(null);
    setActiveTemplate(null);
    setEditingQuote(null);
    refreshStorage();
  };

  // Quick Action: From Calculator to Quote Builder
  const handleGenerateQuoteFromCalc = (
    input: CalculationInput,
    result: CalculationResult
  ) => {
    clearDraftQuote();
    setEditingQuote(null);
    setCalculationForQuote({ input, result });
    setActiveTab('quote-builder');
  };

  // Quick Action: Update calculation for existing quote
  const handleUpdateQuoteCalculation = (
    input: CalculationInput,
    result: CalculationResult,
    quote: Quote
  ) => {
    // If the quote already contains a service line from calculation, update its unitPrice and total
    const updatedLineItems = (quote.lineItems || []).map((item) => {
      if (item.itemType === 'service') {
        const qty = item.quantity || 1;
        const newUnitPrice = result.roundedSellingPrice;
        return {
          ...item,
          unitPrice: newUnitPrice,
          total: Math.round(qty * newUnitPrice),
        };
      }
      return item;
    });

    const updated: Quote = {
      ...quote,
      lineItems: updatedLineItems,
      calculationInput: input,
      calculationResult: result,
    };
    setEditingQuote(updated);
    setCalculationForQuote({ input, result });
    setActiveTab('quote-builder');
  };

  // Quick Action: Return from QuoteBuilder to Calculator
  const handleBackToCalculation = (currentQuote: Quote) => {
    setEditingQuote(currentQuote);
    if (currentQuote.calculationInput && currentQuote.calculationResult) {
      setCalculationForQuote({
        input: currentQuote.calculationInput,
        result: currentQuote.calculationResult,
      });
    }
    setActiveTab('calculator');
  };

  // Quick Action: Use Template in Calculator (Creates a fresh new calculation session)
  const handleUseTemplateInCalculator = (template: WorkshopTemplate) => {
    setEditingQuote(null);
    setCalculationForQuote(null);
    setTemplateCreationContext(null);
    clearDraftCalculation();
    setActiveTemplate({
      ...template,
      _sessionTimestamp: Date.now(),
    });
    setActiveTab('calculator');
  };

  // Quick Action: Start Creating New Template in Calculator
  const handleStartCreateTemplate = (info: {
    name: string;
    categoryId: string;
    description?: string;
  }) => {
    setEditingQuote(null);
    setCalculationForQuote(null);
    setActiveTemplate(null);
    clearDraftQuote();
    clearDraftCalculation();
    setTemplateCreationContext(info);
    setActiveTab('calculator');
  };

  const handleCancelTemplateCreation = () => {
    setTemplateCreationContext(null);
  };

  const handleFinishTemplateCreation = () => {
    setTemplateCreationContext(null);
    setActiveTab('templates');
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

  // Handlers for Template Categories
  const handleSaveTemplateCategory = (cat: { id?: string; name: string }) => {
    saveTemplateCategory(cat);
    refreshStorage();
  };

  const handleRenameTemplateCategory = (id: string, newName: string) => {
    renameTemplateCategory(id, newName);
    refreshStorage();
  };

  const handleToggleTemplateCategoryEnabled = (id: string, enabled?: boolean) => {
    toggleTemplateCategoryEnabled(id, enabled);
    refreshStorage();
  };

  const handleDeleteTemplateCategory = (id: string, reassignToCategoryId: string) => {
    deleteTemplateCategory(id, reassignToCategoryId);
    refreshStorage();
  };

  // Handlers for Material Categories
  const handleSaveMaterialCategory = (cat: { id?: string; name: string }) => {
    saveMaterialCategory(cat);
    refreshStorage();
  };

  const handleRenameMaterialCategory = (id: string, newName: string) => {
    renameMaterialCategory(id, newName);
    refreshStorage();
  };

  const handleToggleMaterialCategoryEnabled = (id: string, enabled?: boolean) => {
    toggleMaterialCategoryEnabled(id, enabled);
    refreshStorage();
  };

  const handleDeleteMaterialCategory = (id: string, reassignToCategoryId: string) => {
    deleteMaterialCategory(id, reassignToCategoryId);
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
    <NotificationProvider>
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
              templates={templates}
              categories={templateCategories}
              initialCalculation={calculationForQuote?.input || editingQuote?.calculationInput}
              initialTemplate={activeTemplate}
              templateCreationContext={templateCreationContext}
              onCancelTemplateCreation={handleCancelTemplateCreation}
              onFinishTemplateCreation={handleFinishTemplateCreation}
              onConsumeTemplate={() => setActiveTemplate(null)}
              editingQuote={editingQuote}
              onGenerateQuote={handleGenerateQuoteFromCalc}
              onUpdateQuoteCalculation={handleUpdateQuoteCalculation}
              onCancelEditQuote={() => setActiveTab('quote-builder')}
              onSaveCalculation={handleSaveCalculation}
              onResetToNew={() => {
                setEditingQuote(null);
                setCalculationForQuote(null);
                setActiveTemplate(null);
                setTemplateCreationContext(null);
              }}
              onSaveTemplate={handleSaveTemplate}
              entitlement={entitlement}
              onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
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
              onUpdateQuoteStatus={handleUpdateQuoteStatus}
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
              onBackToCalculation={handleBackToCalculation}
              nextQuoteNumber={getNextQuoteNumber()}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialLibrary
              materials={materials}
              categories={materialCategories}
              laborRates={laborRates}
              profile={profile}
              onSaveMaterial={handleSaveMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onSaveLaborRate={handleSaveLaborRate}
              onDeleteLaborRate={handleDeleteLaborRate}
              onSaveCategory={handleSaveMaterialCategory}
              onRenameCategory={handleRenameMaterialCategory}
              onToggleCategoryEnabled={handleToggleMaterialCategoryEnabled}
              onDeleteCategory={handleDeleteMaterialCategory}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateLibrary
              templates={templates}
              categories={templateCategories}
              profile={profile}
              onUseTemplate={handleUseTemplateInCalculator}
              onCreateTemplateInCalculator={handleStartCreateTemplate}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onSaveCategory={handleSaveTemplateCategory}
              onRenameCategory={handleRenameTemplateCategory}
              onToggleCategoryEnabled={handleToggleTemplateCategoryEnabled}
              onDeleteCategory={handleDeleteTemplateCategory}
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
              onNavigate={(tab) => setActiveTab(tab)}
              onRestartTour={handleRestartTour}
            />
          )}
        </main>

        {/* First-time Onboarding & Interactive Guided Tour Modal */}
        <GuidedTourModal
          isOpen={isTourOpen}
          onClose={handleCloseTour}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* Global Premium Presentation & License Activation Modal */}
        <PremiumPresentationModal
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)}
          entitlement={entitlement}
          onUpdateEntitlement={handleUpdateEntitlement}
        />
      </div>
    </NotificationProvider>
  );
}
