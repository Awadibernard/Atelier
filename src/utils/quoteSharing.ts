import html2canvas from 'html2canvas';
import { BusinessProfile, Quote, UserEntitlement } from '../types';
import { generateQuotePDF } from './pdfGenerator';
import { formatCurrency, formatDateFrench, formatDateShort } from './formatters';
import { buildPrintableQuoteHTML } from './printQuote';

export type ShareFormat = 'pdf' | 'image' | 'text';

export interface ShareResult {
  success: boolean;
  format: ShareFormat;
  method: 'native_file' | 'native_text' | 'download_fallback' | 'clipboard_fallback';
  message: string;
}

/**
 * Builds the structured text summary suitable for WhatsApp, Telegram, SMS, Email
 */
export function buildQuoteTextSummary(quote: Quote, profile: BusinessProfile): string {
  const currency = profile.currencySymbol || 'FCFA';

  const lines: string[] = [
    `📄 *DEVIS N° ${quote.quoteNumber}*`,
  ];

  if (profile.name && profile.name.trim()) {
    lines.push(`🏢 *${profile.name.trim()}*`);
  }

  lines.push(
    `📅 Date : ${formatDateFrench(quote.createdAt)} (Validité : ${formatDateShort(quote.validUntil)})`,
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
  if (quote.discountAmount > 0) {
    lines.push(`💵 Total Brut HT : ${formatCurrency(quote.subtotal, currency)}`);
    lines.push(`🏷️ Remise : -${formatCurrency(quote.discountAmount, currency)}`);
  }
  lines.push(`💰 *NET À PAYER : ${formatCurrency(quote.finalTotal, currency)}*`);

  if (quote.depositAmount > 0) {
    const depPercent = quote.depositConfig.type === 'percent' ? ` (${quote.depositConfig.value}%)` : '';
    lines.push(`💳 *Acompte requis${depPercent} :* ${formatCurrency(quote.depositAmount, currency)}`);
    lines.push(`⏳ *Solde à la livraison :* ${formatCurrency(quote.balanceAmount, currency)}`);
  }

  if (quote.paymentTerms && quote.paymentTerms.trim()) {
    lines.push(``, `📌 *Modalités de règlement :* ${quote.paymentTerms.trim()}`);
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
 * Generates an actual File object for the PDF
 */
export function createQuotePdfFile(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): { file: File; filename: string } {
  const doc = generateQuotePDF(quote, profile, entitlement);
  const rawCustomer = quote.customer.name?.trim() || 'client';
  const safeCustomer = rawCustomer.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Devis_${quote.quoteNumber}_${safeCustomer}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  return { file, filename };
}

/**
 * Safely renders a quote to a PNG Image File using an isolated sandboxed iframe
 * with 100% standard hex/rgb styles, completely avoiding modern CSS 'oklch' parser errors.
 */
export async function createQuoteImageFile(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): Promise<{ file: File; filename: string; dataUrl: string; blob: Blob }> {
  const rawCustomer = quote.customer.name?.trim() || 'client';
  const safeCustomer = rawCustomer.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Devis_${quote.quoteNumber}_${safeCustomer}.png`;

  // Create isolated sandbox iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px'; // Standard A4 width at 96 DPI
  iframe.style.height = '1123px'; // Standard A4 height at 96 DPI
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Impossible d'initialiser le document de rendu isolé");
    }

    // Build pure standard HTML (100% standard hex colors, zero Tailwind oklch)
    const cleanHtml = buildPrintableQuoteHTML(quote, profile, entitlement);

    doc.open();
    doc.write(cleanHtml);
    doc.close();

    // Wait for the iframe DOM and any images/logos to be fully loaded
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        const images = Array.from(doc.images);
        if (images.length === 0) {
          resolve();
          return;
        }
        let loadedCount = 0;
        const total = images.length;
        images.forEach((img) => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount >= total) resolve();
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount >= total) resolve();
            };
            img.onerror = () => {
              loadedCount++;
              if (loadedCount >= total) resolve();
            };
          }
        });
      };

      if (iframe.contentWindow?.document.readyState === 'complete') {
        checkReady();
      } else {
        iframe.onload = () => checkReady();
        // Fallback timeout in case onload doesn't fire
        setTimeout(checkReady, 200);
      }
    });

    // Locate the sheet element inside the isolated iframe
    const targetElement = (doc.querySelector('.sheet') as HTMLElement) || doc.body;

    // Execute html2canvas in the isolated document context
    const canvas = await html2canvas(targetElement, {
      scale: 2, // High resolution (retina crispness)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Échec de la génération du Blob PNG"));
          return;
        }
        const file = new File([blob], filename, { type: 'image/png' });
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ file, filename, dataUrl, blob });
      }, 'image/png', 0.95);
    });
  } catch (err: any) {
    console.error('Erreur lors de createQuoteImageFile:', err);
    throw new Error(err?.message || "Impossible de générer l'image PNG du devis.");
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Downloads a File or Blob directly to user machine
 */
export function triggerFileDownload(blobOrFile: Blob | File, filename: string): void {
  const url = URL.createObjectURL(blobOrFile);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Shares Quote as real PDF file via Web Share API, with auto-download fallback
 */
export async function shareQuoteAsPDF(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): Promise<ShareResult> {
  const { file, filename } = createQuotePdfFile(quote, profile, entitlement);
  const shareTitle = `Devis N° ${quote.quoteNumber}${profile.name ? ` - ${profile.name}` : ''}`;
  const shareText = `Devis N° ${quote.quoteNumber} pour ${quote.customer.name || 'le projet ' + quote.projectTitle}`;

  // Check if Web Share API with files is supported
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        files: [file],
      });
      return {
        success: true,
        format: 'pdf',
        method: 'native_file',
        message: 'Devis PDF partagé avec succès !',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          format: 'pdf',
          method: 'native_file',
          message: 'Partage annulé.',
        };
      }
      console.warn('Native PDF file sharing failed, falling back to download:', err);
    }
  }

  // Fallback: download PDF file
  triggerFileDownload(file, filename);
  return {
    success: true,
    format: 'pdf',
    method: 'download_fallback',
    message: 'Partage direct non disponible sur ce navigateur. Le fichier PDF a été téléchargé.',
  };
}

/**
 * Shares Quote as PNG Image file via Web Share API, with auto-download fallback
 */
export async function shareQuoteAsImage(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): Promise<ShareResult> {
  const { file, filename } = await createQuoteImageFile(quote, profile, entitlement);
  const shareTitle = `Devis N° ${quote.quoteNumber}${profile.name ? ` - ${profile.name}` : ''}`;
  const shareText = `Devis N° ${quote.quoteNumber} - ${quote.projectTitle || 'Devis'}`;

  // Check if Web Share API with files is supported
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        files: [file],
      });
      return {
        success: true,
        format: 'image',
        method: 'native_file',
        message: 'Image du devis partagée avec succès !',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          format: 'image',
          method: 'native_file',
          message: 'Partage annulé.',
        };
      }
      console.warn('Native image file sharing failed, falling back to download:', err);
    }
  }

  // Fallback: download PNG image file
  triggerFileDownload(file, filename);
  return {
    success: true,
    format: 'image',
    method: 'download_fallback',
    message: "Partage direct non disponible sur ce navigateur. L'image PNG a été téléchargée.",
  };
}

/**
 * Shares Quote as formatted text via Web Share API or Clipboard fallback
 */
export async function shareQuoteAsText(
  quote: Quote,
  profile: BusinessProfile
): Promise<ShareResult> {
  const text = buildQuoteTextSummary(quote, profile);
  const shareTitle = `Devis N° ${quote.quoteNumber}${profile.name ? ` - ${profile.name}` : ''}`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: text,
      });
      return {
        success: true,
        format: 'text',
        method: 'native_text',
        message: 'Résumé du devis partagé !',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          format: 'text',
          method: 'native_text',
          message: 'Partage annulé.',
        };
      }
      console.warn('Native text share failed, falling back to clipboard:', err);
    }
  }

  // Fallback: copy to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return {
        success: true,
        format: 'text',
        method: 'clipboard_fallback',
        message: 'Texte complet copié dans le presse-papier !',
      };
    }
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }

  return {
    success: false,
    format: 'text',
    method: 'clipboard_fallback',
    message: 'Impossible de partager ou copier le texte.',
  };
}
