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
    `Total (${currency})`,
    `Remise (%)`,
    `Acompte (${currency})`,
    `Solde (${currency})`,
    'Modalités de Paiement',
  ];

  const rows = quotes.map((q) => {
    return [
      `"${q.quoteNumber}"`,
      `"${formatDateShort(q.createdAt)}"`,
      `"${formatDateShort(q.validUntil)}"`,
      `"${(q.customer.name || '').replace(/"/g, '""')}"`,
      `"${(q.customer.phone || '').replace(/"/g, '""')}"`,
      `"${(q.customer.email || '').replace(/"/g, '""')}"`,
      `"${(q.projectTitle || '').replace(/"/g, '""')}"`,
      `"${q.status}"`,
      q.finalTotal,
      q.discountPercent || 0,
      q.depositAmount || 0,
      q.balanceAmount || 0,
      `"${(q.paymentTerms || '').replace(/"/g, '""')}"`,
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
