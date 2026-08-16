import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Download,
  Share2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Crown,
  Sparkles,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { BusinessProfile, Quote, QuoteStatus, UserEntitlement } from '../types';
import { formatCurrency, formatDateFrench, formatDateShort } from '../utils/formatters';
import { downloadQuotePDF } from '../utils/pdfGenerator';
import { shareOnWhatsApp } from '../utils/whatsappShare';
import { exportQuotesToCSV } from '../utils/csvExport';
import { QuotePreviewModal } from './QuotePreviewModal';
import { checkQuoteQuota, isPremium, FREE_QUOTES_LIMIT } from '../licensing/features';
import { PremiumBadge } from './licensing/PremiumBadge';
import { PremiumGateModal } from './licensing/PremiumGateModal';

interface Props {
  quotes: Quote[];
  profile: BusinessProfile;
  onEditQuote: (quote: Quote) => void;
  onDuplicateQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onNewQuote: () => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

export function QuoteHistory({
  quotes,
  profile,
  onEditQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onNewQuote,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const userIsPremium = isPremium(entitlement);
  const quota = checkQuoteQuota(entitlement, quotes.length);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewingQuote, setPreviewingQuote] = useState<Quote | null>(null);

  // Gating modals
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [gatedFeatureTitle, setGatedFeatureTitle] = useState('');
  const [gatedFeatureDesc, setGatedFeatureDesc] = useState('');

  const handleCreateNewQuoteAttempt = () => {
    if (!quota.canCreate) {
      setGatedFeatureTitle('Limite de 15 devis atteinte');
      setGatedFeatureDesc(
        `La version Gratuite inclut jusqu'à ${FREE_QUOTES_LIMIT} devis enregistrés. Pour en créer de nouveaux, vous pouvez supprimer d'anciens devis ou débloquer l'historique illimité avec AtelierDevis Premium.`
      );
      setGateModalOpen(true);
      return;
    }
    onNewQuote();
  };

  const handleDuplicateQuoteAttempt = (id: string) => {
    if (!quota.canCreate) {
      setGatedFeatureTitle('Limite de 15 devis atteinte');
      setGatedFeatureDesc(
        `La version Gratuite inclut jusqu'à ${FREE_QUOTES_LIMIT} devis enregistrés. Pour dupliquer ce devis, supprimez un devis existant ou passez à la version Premium pour un stockage illimité.`
      );
      setGateModalOpen(true);
      return;
    }
    onDuplicateQuote(id);
  };

  const handleExportCSVAttempt = () => {
    if (!userIsPremium) {
      setGatedFeatureTitle('Export Tableur (CSV / Excel)');
      setGatedFeatureDesc(
        'L\'exportation automatique vers Excel et tableurs CSV est une fonctionnalité incluse dans la version AtelierDevis Premium.'
      );
      setGateModalOpen(true);
      return;
    }
    exportQuotesToCSV(quotes, profile);
  };


  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.customer.name && q.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.projectTitle && q.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = quotes.length;
    const totalAmount = quotes.reduce((sum, q) => sum + (q.finalTotal || 0), 0);
    const acceptedCount = quotes.filter((q) => q.status === 'Accepté' || q.status === 'Terminé').length;
    const acceptedAmount = quotes
      .filter((q) => q.status === 'Accepté' || q.status === 'Terminé')
      .reduce((sum, q) => sum + (q.finalTotal || 0), 0);

    return { totalCount, totalAmount, acceptedCount, acceptedAmount };
  }, [quotes]);

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'Accepté':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Accepté
          </span>
        );
      case 'Terminé':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 className="w-3 h-3" />
            Terminé & Livré
          </span>
        );
      case 'Envoyé':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3" />
            Envoyé
          </span>
        );
      case 'Refusé':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3" />
            Refusé
          </span>
        );
      case 'Brouillon':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Brouillon
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 space-y-6 animate-in fade-in duration-200">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-600" />
            Historique des Devis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gérez, dupliquez, imprimez ou partagez tous les devis créés dans votre atelier.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {quotes.length > 0 && (
            <button
              onClick={handleExportCSVAttempt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-2xs"
              title="Exporter vers Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
              {!userIsPremium && (
                <PremiumBadge label="Pro" size="xs" variant="gold" className="ml-1" />
              )}
            </button>
          )}

          <button
            onClick={handleCreateNewQuoteAttempt}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Devis</span>
          </button>
        </div>
      </div>

      {/* Quota / Storage Banner */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              userIsPremium ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {userIsPremium ? (
              <InfinityIcon className="w-4 h-4 text-amber-600" />
            ) : (
              <FileText className="w-4 h-4 text-slate-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {userIsPremium
                  ? 'Historique Illimité'
                  : `Quota : ${quotes.length} / ${FREE_QUOTES_LIMIT} devis enregistrés`}
              </span>
              {userIsPremium ? (
                <PremiumBadge label="Premium" size="xs" variant="gold" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                  Version Gratuite
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[11px]">
              {userIsPremium
                ? 'Tous vos devis sont conservés sans limite de capacité.'
                : `La version gratuite conserve vos ${FREE_QUOTES_LIMIT} devis récents sur cet appareil.`}
            </p>
          </div>
        </div>

        {!userIsPremium && onOpenPremiumModal && (
          <button
            onClick={onOpenPremiumModal}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-2xs flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Passer en illimité avec Premium</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Total Devis</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
              {stats.totalCount}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Volume Émis</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-0.5 truncate">
              {formatCurrency(stats.totalAmount, currency)}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-800 uppercase">Devis Acceptés</div>
            <div className="text-xl font-extrabold text-emerald-900 font-mono mt-0.5">
              {stats.acceptedCount}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-800 uppercase">Chiffre Gagné</div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-900 font-mono mt-0.5 truncate">
              {formatCurrency(stats.acceptedAmount, currency)}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par n° de devis, client, projet..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-teal-500 shadow-2xs"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'Brouillon', label: 'Brouillons' },
            { id: 'Envoyé', label: 'Envoyés' },
            { id: 'Accepté', label: 'Acceptés' },
            { id: 'Terminé', label: 'Terminés' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucun devis trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Aucun résultat ne correspond à vos filtres actuels.'
              : 'Vous n’avez pas encore créé de devis. Commencez dès maintenant !'}
          </p>
          <button
            onClick={onNewQuote}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer un devis</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {quote.quoteNumber}
                  </span>
                  {getStatusBadge(quote.status)}
                  <span className="text-[11px] text-slate-400">
                    {formatDateFrench(quote.createdAt)}
                  </span>
                </div>

                <div className="font-bold text-sm text-slate-900 truncate">
                  {quote.customer.name || 'Client sans nom'}
                  {quote.customer.phone && (
                    <span className="text-xs font-normal text-slate-500 ml-2">
                      ({quote.customer.phone})
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 font-medium truncate">
                  {quote.projectTitle}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                  <span>{quote.lineItems.length} ligne(s) de prestation</span>
                  {quote.depositAmount > 0 && (
                    <span className="text-teal-700 font-medium">
                      Acompte : {formatCurrency(quote.depositAmount, currency)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Totals & Quick Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="text-base sm:text-lg font-black font-mono text-slate-900">
                    {formatCurrency(quote.finalTotal, currency)}
                  </div>
                  {quote.balanceAmount > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Solde : {formatCurrency(quote.balanceAmount, currency)}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewingQuote(quote)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Aperçu du devis"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => downloadQuotePDF(quote, profile)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Télécharger PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => shareOnWhatsApp(quote, profile)}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Partager sur WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicateQuoteAttempt(quote.id)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Dupliquer ce devis"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onEditQuote(quote)}
                    className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Modifier ce devis"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer définitivement le devis ${quote.quoteNumber} ?`)) {
                        onDeleteQuote(quote.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote Preview Modal */}
      {previewingQuote && (
        <QuotePreviewModal
          isOpen={Boolean(previewingQuote)}
          onClose={() => setPreviewingQuote(null)}
          quote={previewingQuote}
          profile={profile}
          onEdit={() => {
            onEditQuote(previewingQuote);
            setPreviewingQuote(null);
          }}
        />
      )}

      {/* Feature Gate Modal */}
      <PremiumGateModal
        isOpen={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        customTitle={gatedFeatureTitle}
        customDescription={gatedFeatureDesc}
        onOpenPremiumInfo={() => {
          if (onOpenPremiumModal) {
            onOpenPremiumModal();
          }
        }}
      />
    </div>
  );
}

