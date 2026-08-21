import { Quote, BusinessProfile } from '../types';
import { formatCurrency, formatDateShort } from './formatters';

/**
 * Generates and downloads a CSV spreadsheet of quotes
 */
export function exportQuotesToCSV(quotes: Quote[], profile: BusinessProfile): void {
  const currency = profile.currencySymbol || 'FCFA';

  const headers = [
    'Numéro Devis',
    'Date Création',
    'Validité',
    'Client',
    'Téléphone Client',
    'Email Client',
    'Titre du Projet',
    'Statut',
    `Sous-total (${currency})`,
    `Remise (%)`,
    `Total Final (${currency})`,
    `Acompte (${currency})`,
    `Solde (${currency})`,
    'Modalités de Paiement',
  ];

  const rows = quotes.map((q) => {
    const sanitizeText = (txt?: string) => `"${(txt || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;

    return [
      `"${q.quoteNumber}"`,
      `"${formatDateShort(q.createdAt)}"`,
      `"${formatDateShort(q.validUntil)}"`,
      sanitizeText(q.customer.name),
      sanitizeText(q.customer.phone),
      sanitizeText(q.customer.email),
      sanitizeText(q.projectTitle),
      `"${q.status}"`,
      q.subtotal,
      q.discountPercent || 0,
      q.finalTotal,
      q.depositAmount || 0,
      q.balanceAmount || 0,
      sanitizeText(q.paymentTerms),
    ];
  });


  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel French compatibility
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `AtelierDevis_Export_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
