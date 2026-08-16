import { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  FileText,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowDownToLine,
  Crown,
} from 'lucide-react';
import { BusinessProfile, Quote, UserEntitlement } from '../types';
import { formatCurrency, formatDateFrench, formatDateShort } from '../utils/formatters';
import { downloadQuotePDF, printQuotePDF } from '../utils/pdfGenerator';
import { buildWhatsAppMessage, shareOnWhatsApp, shareNative } from '../utils/whatsappShare';
import { isPremium } from '../licensing/features';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  profile: BusinessProfile;
  onEdit?: () => void;
  entitlement?: UserEntitlement;
}

export function QuotePreviewModal({
  isOpen,
  onClose,
  quote,
  profile,
  onEdit,
  entitlement,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const currency = profile.currencySymbol || 'FCFA';
  const userIsPremium = isPremium(entitlement);

  const handleCopyText = () => {
    const text = buildWhatsAppMessage(quote, profile);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      downloadQuotePDF(quote, profile, entitlement);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const handlePrint = () => {
    printQuotePDF(quote, profile, entitlement);
  };


  const handleWhatsApp = () => {
    shareOnWhatsApp(quote, profile);
  };

  const handleNativeShare = async () => {
    const shared = await shareNative(quote, profile);
    if (!shared) {
      handleWhatsApp();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span className="font-bold text-sm sm:text-base">
              Aperçu du Devis N° {quote.quoteNumber}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/80 text-teal-300 font-medium border border-teal-700/50">
              {quote.status}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
              title="Télécharger le PDF"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{downloading ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
              title="Envoyer par WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              title="Imprimer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Copier le résumé texte"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Print Sheet Simulation) */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center">
          <div className="w-full max-w-[210mm] min-h-[297mm] bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-10 flex flex-col justify-between text-slate-800 font-sans">
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div className="space-y-1">
                  {profile.logoUrl && (
                    <img
                      src={profile.logoUrl}
                      alt="Logo"
                      className="h-12 w-auto max-w-[160px] object-contain mb-2"
                    />
                  )}
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {profile.name}
                  </h1>
                  {profile.tagline && (
                    <p className="text-xs text-slate-600 italic">{profile.tagline}</p>
                  )}
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="text-2xl font-black text-teal-800 tracking-wide">
                    DEVIS
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    N° {quote.quoteNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date : <span className="font-medium text-slate-700">{formatDateFrench(quote.createdAt)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Validité : <span className="font-medium text-slate-700">{formatDateShort(quote.validUntil)}</span>
                  </div>
                </div>
              </div>

              {/* Contacts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs border-b border-slate-200">
                {/* Workshop */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-700" />
                    ÉMETTEUR
                  </div>
                  {profile.phone && <div><strong>Tél :</strong> {profile.phone}</div>}
                  {profile.whatsapp && <div><strong>WhatsApp :</strong> {profile.whatsapp}</div>}
                  {profile.email && <div><strong>Email :</strong> {profile.email}</div>}
                  {(profile.address || profile.city) && (
                    <div><strong>Adresse :</strong> {profile.address}, {profile.city} ({profile.country})</div>
                  )}
                  {profile.taxId && <div><strong>RCCM / NIF :</strong> {profile.taxId}</div>}
                </div>

                {/* Customer */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    DESTINATAIRE
                  </div>
                  <div className="text-sm font-bold text-slate-900">{quote.customer.name || 'Client particulier'}</div>
                  {quote.customer.phone && <div><strong>Tél :</strong> {quote.customer.phone}</div>}
                  {quote.customer.email && <div><strong>Email :</strong> {quote.customer.email}</div>}
                  {(quote.customer.address || quote.customer.city) && (
                    <div><strong>Adresse :</strong> {quote.customer.address} {quote.customer.city && `- ${quote.customer.city}`}</div>
                  )}
                </div>
              </div>

              {/* Project Title */}
              <div className="py-4">
                <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200/80">
                  <div className="text-xs font-bold text-teal-900">
                    OBJET : {quote.projectTitle}
                  </div>
                  {quote.projectDescription && (
                    <div className="text-xs text-teal-800 mt-1 whitespace-pre-line">
                      {quote.projectDescription}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-2 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <th className="py-2.5 px-3 rounded-l-md">Désignation / Prestation</th>
                      <th className="py-2.5 px-2 text-center w-16">Qté</th>
                      <th className="py-2.5 px-2 text-center w-20">Unité</th>
                      <th className="py-2.5 px-3 text-right w-28">Prix Unit.</th>
                      <th className="py-2.5 px-3 text-right rounded-r-md w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {quote.lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 font-mono">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          {formatCurrency(item.unitPrice, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary & Signatures */}
            <div className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* Notes & Payment terms */}
                <div className="text-xs space-y-2 text-slate-600">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Modalités de règlement & Notes
                  </div>
                  {quote.paymentTerms && (
                    <p className="p-2 bg-slate-50 rounded border border-slate-200">
                      <strong>Paiement :</strong> {quote.paymentTerms}
                    </p>
                  )}
                  {quote.notes && (
                    <p className="italic text-slate-500">
                      {quote.notes}
                    </p>
                  )}
                  {profile.footerNotes && (
                    <p className="text-[11px] text-slate-400">
                      {profile.footerNotes}
                    </p>
                  )}
                </div>

                {/* Financial Totals */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total :</span>
                    <span className="font-mono">{formatCurrency(quote.subtotal, currency)}</span>
                  </div>

                  {quote.discountAmount && quote.discountAmount > 0 ? (
                    <div className="flex justify-between text-red-600">
                      <span>Remise ({quote.discountPercent}%) :</span>
                      <span className="font-mono">- {formatCurrency(quote.discountAmount, currency)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center py-2 px-3 bg-slate-900 text-white rounded font-bold text-sm">
                    <span>TOTAL NET :</span>
                    <span className="font-mono text-base text-teal-300">
                      {formatCurrency(quote.finalTotal, currency)}
                    </span>
                  </div>

                  {quote.depositAmount > 0 && (
                    <>
                      <div className="flex justify-between text-teal-800 font-semibold pt-1 border-t border-slate-200">
                        <span>Acompte demandé ({quote.depositConfig.type === 'percent' ? `${quote.depositConfig.value}%` : 'Fixe'}) :</span>
                        <span className="font-mono">{formatCurrency(quote.depositAmount, currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Solde restant à la livraison :</span>
                        <span className="font-mono font-medium">{formatCurrency(quote.balanceAmount, currency)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
                <div className="space-y-12">
                  <div>
                    <span className="font-bold text-slate-800">Pour {profile.name}</span>
                    <p className="text-[11px] text-slate-500">Cachet & signature</p>
                  </div>
                  <div className="border-b border-dashed border-slate-300 w-4/5"></div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="font-bold text-slate-800">Le Client</span>
                    <p className="text-[11px] text-slate-500">Mention manuscrite "Bon pour accord", date et signature</p>
                  </div>
                  <div className="border-b border-dashed border-slate-300 w-4/5"></div>
                </div>
              </div>

              {/* Attribution footer */}
              <div className="pt-4 text-center border-t border-slate-100 text-[10px] text-slate-400">
                {userIsPremium ? (
                  <span>Document officiel d'atelier certifié conforme • {profile.name}</span>
                ) : (
                  <span>Document généré avec AtelierDevis (Version Gratuite) • www.atelierdevis.app</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors"
            >
              Modifier ce devis
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
