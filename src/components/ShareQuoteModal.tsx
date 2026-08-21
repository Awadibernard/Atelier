import { useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Share2,
  Download,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { BusinessProfile, Quote, UserEntitlement } from '../types';
import {
  ShareFormat,
  shareQuoteAsPDF,
  shareQuoteAsImage,
  shareQuoteAsText,
  buildQuoteTextSummary,
  createQuotePdfFile,
  createQuoteImageFile,
  triggerFileDownload,
} from '../utils/quoteSharing';
import { useNotification } from '../context/NotificationContext';

interface Props {
  isOpen: boolean;
  quote: Quote;
  profile: BusinessProfile;
  entitlement?: UserEntitlement;
  onClose: () => void;
}

export function ShareQuoteModal({
  isOpen,
  quote,
  profile,
  entitlement,
  onClose,
}: Props) {
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>('pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useNotification();

  if (!isOpen) return null;

  const handleShare = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (selectedFormat === 'pdf') {
        setProcessingMessage('Préparation du document PDF...');
        const result = await shareQuoteAsPDF(quote, profile, entitlement);
        if (result.success) {
          showSuccess(result.message);
        } else if (result.message) {
          // Cancelled or informational
          console.info(result.message);
        }
      } else if (selectedFormat === 'image') {
        setProcessingMessage("Génération de l'image haute qualité...");
        const result = await shareQuoteAsImage(quote, profile, entitlement);
        if (result.success) {
          showSuccess(result.message);
        } else if (result.message) {
          console.info(result.message);
        }
      } else {
        setProcessingMessage('Préparation du texte...');
        const result = await shareQuoteAsText(quote, profile);
        if (result.success) {
          showSuccess(result.message);
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du partage:', err);
      const friendlyMsg = err?.message || "Une erreur est survenue lors de l'opération de partage.";
      setErrorMessage(friendlyMsg);
      showError(friendlyMsg);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  const handleDownloadOrCopy = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (selectedFormat === 'pdf') {
        setProcessingMessage('Téléchargement du PDF...');
        const { file, filename } = createQuotePdfFile(quote, profile, entitlement);
        triggerFileDownload(file, filename);
        showSuccess('Fichier PDF téléchargé avec succès.');
      } else if (selectedFormat === 'image') {
        setProcessingMessage("Génération de l'image PNG...");
        const { file, filename } = await createQuoteImageFile(quote, profile, entitlement);
        triggerFileDownload(file, filename);
        showSuccess('Image PNG téléchargée avec succès.');
      } else {
        const text = buildQuoteTextSummary(quote, profile);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showSuccess('Texte du devis copié dans le presse-papier !');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err: any) {
      console.error('Erreur téléchargement / copie:', err);
      const friendlyMsg = err?.message || 'Échec lors du téléchargement ou de la copie.';
      setErrorMessage(friendlyMsg);
      showError(friendlyMsg);
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Partager le devis</h3>
              <p className="text-xs text-slate-400">
                Devis N° {quote.quoteNumber} • {quote.customer.name || 'Client'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Format de partage
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Sélectionnez la façon dont vous souhaitez transmettre votre devis :
            </p>
          </div>

          {/* Format selection cards */}
          <div className="space-y-3">
            {/* PDF Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedFormat('pdf');
                setErrorMessage(null);
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all relative ${
                selectedFormat === 'pdf'
                  ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-600/30'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 transition-colors ${
                  selectedFormat === 'pdf'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    Document PDF (A4)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-100/90 px-2.5 py-0.5 rounded-full shrink-0">
                    <Sparkles className="w-3 h-3" /> Recommandé
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Fichier officiel imprimable et signable avec mise en page complète et logo.
                </p>
              </div>
            </button>

            {/* Image Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedFormat('image');
                setErrorMessage(null);
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all relative ${
                selectedFormat === 'image'
                  ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-600/30'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 transition-colors ${
                  selectedFormat === 'image'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    Image (PNG Haute Qualité)
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                    Messagerie & Galerie
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Capture visuelle haute résolution du devis pour lecture directe sur smartphone.
                </p>
              </div>
            </button>

            {/* Text Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedFormat('text');
                setErrorMessage(null);
              }}
              className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all relative ${
                selectedFormat === 'text'
                  ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-600/30'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
              }`}
            >
              <div
                className={`p-3 rounded-xl shrink-0 transition-colors ${
                  selectedFormat === 'text'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    Texte Structuré
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0">
                    SMS / Chat
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Résumé textuel complet avec liste des prestations, montants et coordonnées.
                </p>
              </div>
            </button>
          </div>

          {/* Error display if any */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong>Erreur :</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Informational hint */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Le bouton <strong>Partager maintenant</strong> ouvre le menu système pour envoyer vers WhatsApp, Telegram, Email, etc.
            </span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Secondary Action */}
          <div className="order-2 sm:order-1 flex items-center gap-2">
            {selectedFormat === 'text' ? (
              <button
                type="button"
                onClick={handleDownloadOrCopy}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Texte copié !' : 'Copier le texte'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadOrCopy}
                disabled={isProcessing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                title={selectedFormat === 'pdf' ? 'Télécharger le fichier PDF' : "Télécharger l'image PNG"}
              >
                <Download className="w-4 h-4" />
                <span>
                  {selectedFormat === 'pdf' ? 'Télécharger PDF' : 'Télécharger Image'}
                </span>
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={isProcessing}
            className="order-1 sm:order-2 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{processingMessage || 'Génération en cours...'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Partager maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
