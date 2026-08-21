import { BusinessProfile, Quote } from '../types';
import { formatCurrency, formatDateShort } from './formatters';

/**
 * Builds a clean, professional WhatsApp quote summary message
 */
export function buildWhatsAppMessage(quote: Quote, profile: BusinessProfile): string {
  const currency = profile.currencySymbol || 'FCFA';

  const lines: string[] = [
    `📄 *DEVIS N° ${quote.quoteNumber}*`,
  ];

  if (profile.name && profile.name.trim()) {
    lines.push(`🏢 *${profile.name.trim()}*`);
  }

  lines.push(
    `📅 Date : ${formatDateShort(quote.createdAt)} (Valable jusqu'au ${formatDateShort(quote.validUntil)})`,
    ``
  );

  if (quote.customer.name && quote.customer.name.trim()) {
    lines.push(`👤 *Client :* ${quote.customer.name.trim()}`);
  }

  lines.push(`🔨 *Projet :* ${quote.projectTitle || 'Devis'}`);

  if (quote.projectDescription && quote.projectDescription.trim()) {
    lines.push(`📝 _${quote.projectDescription.trim()}_`);
  }

  lines.push(``, `📋 *Détail des prestations :*`);

  quote.lineItems.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.description} (${item.quantity} ${item.unit}) : *${formatCurrency(item.total, currency)}*`
    );
  });

  lines.push(``);
  lines.push(`💰 *TOTAL NET : ${formatCurrency(quote.finalTotal, currency)}*`);

  if (quote.depositAmount > 0) {
    const depPercent = quote.depositConfig.type === 'percent' ? ` (${quote.depositConfig.value}%)` : '';
    lines.push(`💳 *Acompte demandé${depPercent} :* ${formatCurrency(quote.depositAmount, currency)}`);
    lines.push(`⏳ *Solde à la livraison :* ${formatCurrency(quote.balanceAmount, currency)}`);
  }

  if (quote.paymentTerms && quote.paymentTerms.trim()) {
    lines.push(``, `📌 *Modalités :* ${quote.paymentTerms.trim()}`);
  }

  const contactInfo = profile.phone?.trim() || profile.whatsapp?.trim();
  if (contactInfo) {
    lines.push(``);
    lines.push(`📞 Contact : ${contactInfo}`);
  }

  const addressInfo = [profile.address?.trim(), profile.city?.trim()].filter(Boolean).join(', ');
  if (addressInfo) {
    lines.push(`📍 Atelier : ${addressInfo}`);
  }

  return lines.join('\n');
}

/**
 * Opens WhatsApp with pre-filled message
 */
export function shareOnWhatsApp(quote: Quote, profile: BusinessProfile): void {
  const text = buildWhatsAppMessage(quote, profile);
  const encoded = encodeURIComponent(text);
  const clientPhone = quote.customer.phone
    ? quote.customer.phone.replace(/[^0-9]/g, '')
    : '';

  const url = clientPhone
    ? `https://wa.me/${clientPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}

/**
 * Web Share API (mobile native share dialog)
 */
export async function shareNative(quote: Quote, profile: BusinessProfile): Promise<boolean> {
  const text = buildWhatsAppMessage(quote, profile);
  if (navigator.share) {
    try {
      const shareTitle = profile.name && profile.name.trim()
        ? `Devis ${quote.quoteNumber} - ${profile.name.trim()}`
        : `Devis ${quote.quoteNumber}`;
      await navigator.share({
        title: shareTitle,
        text,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

