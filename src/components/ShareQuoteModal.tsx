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
  Eye,
  ChevronLeft,
  ChevronRight,
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
  QuoteImageResult,
} from '../utils/quoteSharing';
import { getQuotePageCount } from '../utils/printQuote';
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
  const [previewResult, setPreviewResult] = useState<QuoteImageResult | null>(null);
  const [previewPageIdx, setPreviewPageIdx] = useState(0);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  if (!isOpen) return null;

  const estimatedPages = getQuotePageCount(quote);

  const handleOpenImagePreview = async () => {
    setIsPreviewLoading(true);
    setErrorMessage(null);
    try {
      const res = await createQuoteImageFile(quote, profile, entitlement);
      setPreviewResult(res);
      setPreviewPageIdx(0);
      setShowPreviewModal(true);
    } catch (err: any) {
      console.error("Erreur aperçu de l'image:", err);
      const msg = err?.message || "Impossible de générer l'aperçu A4";
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

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
          console.info(result.message);
        }
      } else if (selectedFormat === 'image') {
        setProcessingMessage("Génération du document A4 haute définition...");
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
        setProcessingMessage("Génération du document PNG A4...");
        const { file, filename } = await createQuoteImageFile(quote, profile, entitlement);
        triggerFileDownload(file, filename);
        showSuccess('Image A4 PNG téléchargée avec succès.');
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

  const handleDownloadSinglePage = (pageIdx: number) => {
    if (!previewResult) return;
    const pageDataUrl = previewResult.pageDataUrls[pageIdx] || previewResult.dataUrl;
    const rawCustomer = quote.customer.name?.trim() || 'client';
    const safeCustomer = rawCustomer.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pageFilename = `Devis_${quote.quoteNumber}_${safeCustomer}_Page_${pageIdx + 1}.png`;

    // Convert dataUrl to blob and download
    fetch(pageDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        triggerFileDownload(blob, pageFilename);
        showSuccess(`Page ${pageIdx + 1} téléchargée avec succès !`);
      })
      .catch((err) => {
        console.error('Erreur téléchargement page:', err);
        showError('Impossible de télécharger cette page.');
      });
  };

  return (
    <>
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
              <div
                onClick={() => {
                  setSelectedFormat('image');
                  setErrorMessage(null);
                }}
                className={`w-full flex flex-col p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                  selectedFormat === 'image'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-600/30'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-slate-900">
                        Image A4 (PNG Haute Définition)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full shrink-0">
                          Format A4 (210:297)
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          {estimatedPages === 1 ? '1 page' : `${estimatedPages} pages`}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                      Capture nette et fidèle du document A4 complet. Idéal pour transmission immédiate via WhatsApp, messageries et galeries photos.
                    </p>

                    {selectedFormat === 'image' && (
                      <div className="mt-3 pt-3 border-t border-teal-200/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-teal-800 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          Rapport 210:297 • Haute résolution
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenImagePreview();
                          }}
                          disabled={isPreviewLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 bg-white hover:bg-teal-100/60 border border-teal-300 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isPreviewLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>Aperçu A4</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Texte copié !' : 'Copier le texte'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadOrCopy}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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

      {/* A4 Image Preview Dialog */}
      {showPreviewModal && previewResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-lg">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">
                    Aperçu Image A4 • Devis N° {quote.quoteNumber}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ratio officiel A4 (210:297) • Rendu haute définition (1588 × 2246 px)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Fermer l'aperçu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pagination bar if multi-page */}
            {previewResult.totalPages > 1 && (
              <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs text-slate-300 shrink-0">
                <span className="font-medium text-slate-200">
                  Page {previewPageIdx + 1} sur {previewResult.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewPageIdx((prev) => Math.max(0, prev - 1))}
                    disabled={previewPageIdx === 0}
                    className="p-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 transition-colors text-white cursor-pointer"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-semibold text-teal-400">
                    {previewPageIdx + 1} / {previewResult.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPageIdx((prev) => Math.min(previewResult.totalPages - 1, prev + 1))}
                    disabled={previewPageIdx === previewResult.totalPages - 1}
                    className="p-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 transition-colors text-white cursor-pointer"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Document Image Viewport */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex items-center justify-center bg-slate-950/60">
              <div className="relative shadow-2xl rounded-sm overflow-hidden border border-slate-700/60 bg-white max-w-full max-h-[70vh]">
                <img
                  src={
                    previewResult.pageDataUrls && previewResult.pageDataUrls[previewPageIdx]
                      ? previewResult.pageDataUrls[previewPageIdx]
                      : previewResult.dataUrl
                  }
                  alt={`Aperçu A4 Devis N° ${quote.quoteNumber} Page ${previewPageIdx + 1}`}
                  className="w-auto h-auto max-h-[70vh] object-contain block mx-auto"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>PNG 210 × 297 mm</span>
                {previewResult.totalPages > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePage(previewPageIdx)}
                    className="text-teal-400 hover:text-teal-300 underline font-medium cursor-pointer"
                  >
                    Télécharger cette page ({previewPageIdx + 1})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerFileDownload(previewResult.file, previewResult.filename);
                    showSuccess('Document PNG complet téléchargé avec succès !');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {previewResult.totalPages > 1 ? 'Télécharger Tout (PNG)' : 'Télécharger PNG'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleShare();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager cette image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

