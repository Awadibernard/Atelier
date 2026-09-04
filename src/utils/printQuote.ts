import { BusinessProfile, Quote, QuoteLineItem, UserEntitlement } from '../types';
import { formatCurrency, formatDateFrench, formatDateShort } from './formatters';
import { isPremium } from '../licensing/features';

/**
 * Paginates line items cleanly across A4 portrait pages.
 * - Single page: fits comfortably up to 10-11 items (with full header, contacts, subject, totals, and signatures).
 * - Multi-page:
 *   - Page 1 takes up to 12 items with full header + contacts + subject + continuation banner.
 *   - Subsequent pages take up to 16 items (or up to 12 items on the final page with totals & signatures).
 */
export function paginateQuoteItems(items: QuoteLineItem[]): QuoteLineItem[][] {
  if (items.length <= 10) {
    return [items];
  }

  const pages: QuoteLineItem[][] = [];
  // Page 1 gets up to 12 items
  pages.push(items.slice(0, 12));
  let remaining = items.slice(12);

  while (remaining.length > 0) {
    // If the remaining items fit on the final page along with totals & signatures (up to 12 items)
    if (remaining.length <= 12) {
      pages.push(remaining);
      break;
    } else {
      // Intermediate page without bottom summary can hold up to 16 items
      pages.push(remaining.slice(0, 16));
      remaining = remaining.slice(16);
    }
  }

  return pages;
}

export function getQuotePageCount(quote: Quote): number {
  return paginateQuoteItems(quote.lineItems).length;
}

/**
 * Builds standalone self-contained printable A4 HTML for a quote.
 * Guaranteed 100% standard hex/rgb styles (zero Tailwind oklch) for flawless html2canvas rendering.
 */
export function buildPrintableQuoteHTML(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): string {
  const currency = profile.currencySymbol || 'FCFA';
  const hasBusinessName = Boolean(profile.name && profile.name.trim());
  const businessName = profile.name ? profile.name.trim() : '';
  const hasCustomerName = Boolean(quote.customer.name && quote.customer.name.trim());
  const customerName = quote.customer.name ? quote.customer.name.trim() : '';
  const userIsPrem = isPremium(entitlement);
  const hasLogo = Boolean(profile.logoUrl && profile.logoUrl.startsWith('data:image'));

  const workshopAddress = [
    profile.address?.trim(),
    profile.city?.trim(),
    profile.country?.trim(),
  ].filter(Boolean).join(', ');

  const customerAddress = [
    quote.customer.address?.trim(),
    quote.customer.city?.trim(),
  ].filter(Boolean).join(' - ');

  const itemPages = paginateQuoteItems(quote.lineItems);
  const totalPages = itemPages.length;

  const renderTableRows = (items: QuoteLineItem[], startIndex: number) => {
    return items.map((item, idx) => {
      const globalIdx = startIndex + idx;
      const isEven = globalIdx % 2 === 1;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${isEven ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
          <td style="padding: 7px 10px; font-weight: 500; color: #1e293b; vertical-align: top; word-break: break-word;">
            ${item.description}
          </td>
          <td style="padding: 7px 6px; text-align: center; color: #475569; font-variant-numeric: tabular-nums; vertical-align: top; width: 55px;">
            ${item.quantity}
          </td>
          <td style="padding: 7px 6px; text-align: center; color: #64748b; font-size: 8.5pt; vertical-align: top; width: 65px;">
            ${item.unit}
          </td>
          <td style="padding: 7px 10px; text-align: right; color: #334155; font-variant-numeric: tabular-nums; vertical-align: top; width: 110px;">
            ${formatCurrency(item.unitPrice, currency)}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; vertical-align: top; width: 120px;">
            ${formatCurrency(item.total, currency)}
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderPagesHtml = () => {
    let currentStartIndex = 0;

    return itemPages.map((pageItems, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirstPage = pageNum === 1;
      const isLastPage = pageNum === totalPages;
      const startIndex = currentStartIndex;
      currentStartIndex += pageItems.length;

      return `
      <div class="a4-page" id="page-${pageNum}" data-page="${pageNum}">
        <div class="page-top-content">
          ${isFirstPage ? `
            <!-- Full Document Header (Page 1) -->
            <div class="header">
              <div class="business-info">
                <div class="business-header-row">
                  ${hasLogo ? `
                    <div class="logo-container">
                      <img src="${profile.logoUrl}" alt="Logo" class="business-logo" />
                    </div>
                  ` : ''}
                  <div class="business-title-group">
                    ${hasBusinessName ? `<div class="business-title">${businessName}</div>` : ''}
                    ${profile.tagline && profile.tagline.trim() ? `<div class="tagline">${profile.tagline.trim()}</div>` : ''}
                  </div>
                </div>
              </div>
              <div class="quote-meta">
                <div class="quote-badge">DEVIS</div>
                <div class="quote-num">N° ${quote.quoteNumber}</div>
                <div class="meta-date">Date : <strong>${formatDateFrench(quote.createdAt)}</strong></div>
                <div class="meta-date">Validité : <strong>${formatDateShort(quote.validUntil)}</strong></div>
              </div>
            </div>

            <!-- Contacts Columns (Page 1) -->
            <div class="columns">
              <div class="col-box">
                <div class="col-title">ÉMETTEUR</div>
                ${hasBusinessName ? `<div class="contact-name">${businessName}</div>` : ''}
                ${profile.phone && profile.phone.trim() ? `<div class="contact-line"><strong>Tél :</strong> ${profile.phone.trim()}</div>` : ''}
                ${profile.whatsapp && profile.whatsapp.trim() ? `<div class="contact-line"><strong>WhatsApp :</strong> ${profile.whatsapp.trim()}</div>` : ''}
                ${profile.email && profile.email.trim() ? `<div class="contact-line"><strong>Email :</strong> ${profile.email.trim()}</div>` : ''}
                ${workshopAddress ? `<div class="contact-line"><strong>Adresse :</strong> ${workshopAddress}</div>` : ''}
                ${profile.taxId && profile.taxId.trim() ? `<div class="contact-line"><strong>RCCM / NIF :</strong> ${profile.taxId.trim()}</div>` : ''}
              </div>

              <div class="col-box">
                <div class="col-title">DESTINATAIRE</div>
                ${hasCustomerName ? `<div class="contact-name">${customerName}</div>` : ''}
                ${quote.customer.phone && quote.customer.phone.trim() ? `<div class="contact-line"><strong>Tél :</strong> ${quote.customer.phone.trim()}</div>` : ''}
                ${quote.customer.email && quote.customer.email.trim() ? `<div class="contact-line"><strong>Email :</strong> ${quote.customer.email.trim()}</div>` : ''}
                ${customerAddress ? `<div class="contact-line"><strong>Adresse :</strong> ${customerAddress}</div>` : ''}
              </div>
            </div>

            <!-- Subject Banner (Page 1) -->
            <div class="subject-box">
              <div class="subject-title">OBJET : ${quote.projectTitle || 'DEVIS'}</div>
              ${quote.projectDescription && quote.projectDescription.trim() ? `
                <div class="subject-desc">${quote.projectDescription.trim()}</div>
              ` : ''}
            </div>
          ` : `
            <!-- Compact Continuation Header (Page 2+) -->
            <div class="header continuation-header">
              <div class="business-info continuation-business">
                ${hasLogo ? `
                  <img src="${profile.logoUrl}" alt="Logo" class="compact-logo" />
                ` : ''}
                <div>
                  <div class="continuation-title">${hasBusinessName ? businessName : 'AtelierDevis'}</div>
                  <div class="continuation-subtitle">Devis N° ${quote.quoteNumber} • Page ${pageNum} / ${totalPages}</div>
                </div>
              </div>
              <div class="quote-meta">
                <div class="continuation-badge">SUITE DU DEVIS</div>
                <div class="meta-date">Date : <strong>${formatDateShort(quote.createdAt)}</strong></div>
              </div>
            </div>
          `}

          <!-- Table of Line Items -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Désignation / Prestation</th>
                <th class="th-center" style="width: 55px;">Qté</th>
                <th class="th-center" style="width: 65px;">Unité</th>
                <th class="th-right" style="width: 110px;">Prix Unit.</th>
                <th class="th-right" style="width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(pageItems, startIndex)}
            </tbody>
          </table>

          ${!isLastPage ? `
            <div class="continuation-notice">
              <span>Suite des prestations en page suivante ➔</span>
            </div>
          ` : ''}
        </div>

        <div class="page-bottom-content">
          ${isLastPage ? `
            <!-- Bottom Financial Totals & Conditions (Final Page Only) -->
            <div class="bottom-section">
              <!-- Conditions and Notes (Left) -->
              <div class="notes-box">
                ${((quote.paymentTerms && quote.paymentTerms.trim()) || (quote.notes && quote.notes.trim()) || (profile.footerNotes && profile.footerNotes.trim())) ? `
                  <div class="notes-title">CONDITIONS & MODALITÉS :</div>
                ` : ''}
                ${quote.paymentTerms && quote.paymentTerms.trim() ? `
                  <div class="note-pill">
                    <strong>Règlement :</strong> ${quote.paymentTerms.trim()}
                  </div>
                ` : ''}
                ${quote.notes && quote.notes.trim() ? `
                  <div class="note-text">
                    • ${quote.notes.trim()}
                  </div>
                ` : ''}
                ${profile.footerNotes && profile.footerNotes.trim() ? `
                  <div class="footer-note-text">
                    • ${profile.footerNotes.trim()}
                  </div>
                ` : ''}
              </div>

              <!-- Financial Summary Box (Right) -->
              <div class="totals-box">
                <div class="total-row">
                  <span class="total-label">Sous-total :</span>
                  <span class="total-val">${formatCurrency(quote.subtotal, currency)}</span>
                </div>
                ${quote.discountAmount && quote.discountAmount > 0 ? `
                  <div class="total-row total-discount">
                    <span class="total-label">Remise (${quote.discountPercent || ''}%) :</span>
                    <span class="total-val">- ${formatCurrency(quote.discountAmount, currency)}</span>
                  </div>
                ` : ''}
                <div class="total-row total-net-banner">
                  <span class="total-net-label">TOTAL NET :</span>
                  <span class="total-net-val">${formatCurrency(quote.finalTotal, currency)}</span>
                </div>
                ${quote.depositAmount > 0 ? `
                  <div class="total-row total-deposit">
                    <span class="total-label">Acompte (${quote.depositConfig.type === 'percent' ? `${quote.depositConfig.value}%` : 'prévu'}) :</span>
                    <span class="total-val">${formatCurrency(quote.depositAmount, currency)}</span>
                  </div>
                  <div class="total-row total-balance">
                    <span class="total-label">Solde restant :</span>
                    <span class="total-val">${formatCurrency(quote.balanceAmount, currency)}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Signatures Block -->
            <div class="signatures">
              <div class="sig-block">
                <div class="sig-role">${hasBusinessName ? `Pour ${businessName}` : "Pour l'Émetteur"}</div>
                <div class="sig-hint">Cachet & signature</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-block sig-block-right">
                <div class="sig-role">Le Client</div>
                <div class="sig-hint">Date & Signature précédée de "Bon pour accord"</div>
                <div class="sig-line"></div>
              </div>
            </div>
          ` : ''}

          <!-- Page Footer -->
          <div class="footer">
            <div class="footer-left">
              ${userIsPrem ? (
                hasBusinessName ? `Document professionnel officiel • ${businessName}` : "Document professionnel officiel"
              ) : (
                "Document généré avec AtelierDevis • www.atelierdevis.app"
              )}
            </div>
            <div class="footer-right">
              Page ${pageNum} / ${totalPages}
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis N° ${quote.quoteNumber} - ${hasBusinessName ? businessName : 'AtelierDevis'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet-wrapper {
      width: 794px;
      margin: 0 auto;
      background: #ffffff;
    }
    /* Standard A4 Portrait Sheet at 96 DPI: 210mm x 297mm = 794px x 1123px (Ratio 210:297) */
    .a4-page {
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      padding: 38px 46px 28px 46px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      border-bottom: 2px solid #e2e8f0;
    }
    .a4-page:last-child {
      border-bottom: none;
    }
    .page-top-content {
      width: 100%;
    }
    .page-bottom-content {
      width: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 12px;
    }
    .continuation-header {
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .business-info {
      flex: 1;
      min-width: 0;
    }
    .business-header-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-container {
      flex-shrink: 0;
    }
    .business-logo {
      max-height: 54px;
      max-width: 140px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .compact-logo {
      max-height: 32px;
      max-width: 90px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .continuation-business {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .continuation-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
    }
    .continuation-subtitle {
      font-size: 8pt;
      color: #64748b;
    }
    .continuation-badge {
      font-size: 10pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.5px;
    }
    .business-title-group {
      flex: 1;
      min-width: 0;
    }
    .business-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      line-height: 1.15;
    }
    .tagline {
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 2px;
    }
    .quote-meta {
      text-align: right;
      flex-shrink: 0;
    }
    .quote-badge {
      font-size: 17pt;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 1px;
      line-height: 1;
    }
    .quote-num {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 3px;
    }
    .meta-date {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .columns {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
    }
    .col-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .col-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0f766e;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .contact-name {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .contact-line {
      color: #334155;
      margin-top: 1px;
    }
    .subject-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 9pt;
    }
    .subject-title {
      font-weight: 800;
      color: #134e4a;
    }
    .subject-desc {
      color: #115e59;
      font-size: 8.5pt;
      margin-top: 3px;
      white-space: pre-line;
      line-height: 1.3;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 8px;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      padding: 7px 10px;
      font-size: 8.5pt;
      letter-spacing: 0.2px;
    }
    .th-center { text-align: center; }
    .th-right { text-align: right; }
    .continuation-notice {
      text-align: right;
      font-size: 8pt;
      font-weight: 600;
      color: #0f766e;
      padding: 6px 4px;
      font-style: italic;
    }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-top: 10px;
    }
    .notes-box {
      flex: 1;
      font-size: 8pt;
      color: #475569;
      padding-right: 8px;
    }
    .notes-title {
      font-weight: 800;
      color: #0f766e;
      font-size: 8pt;
      margin-bottom: 5px;
      letter-spacing: 0.3px;
    }
    .note-pill {
      margin-bottom: 5px;
      padding: 5px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      color: #334155;
    }
    .note-text {
      color: #475569;
      font-style: italic;
      margin-bottom: 4px;
      line-height: 1.3;
    }
    .footer-note-text {
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.25;
    }
    .totals-box {
      width: 275px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 8.5pt;
      flex-shrink: 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.5px 0;
      font-variant-numeric: tabular-nums;
    }
    .total-label {
      color: #475569;
    }
    .total-val {
      font-weight: 600;
      color: #1e293b;
    }
    .total-discount {
      color: #dc2626;
    }
    .total-discount .total-label, .total-discount .total-val {
      color: #dc2626;
    }
    .total-net-banner {
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 5px 0;
    }
    .total-net-label {
      font-weight: 800;
      color: #ffffff;
      font-size: 9.5pt;
    }
    .total-net-val {
      font-weight: 900;
      color: #2dd4bf;
      font-size: 11pt;
    }
    .total-deposit {
      color: #047857;
      font-weight: 600;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
    }
    .total-deposit .total-label, .total-deposit .total-val {
      color: #047857;
    }
    .total-balance {
      color: #64748b;
      font-size: 8pt;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5pt;
    }
    .sig-block {
      flex: 1;
    }
    .sig-block-right {
      text-align: right;
    }
    .sig-role {
      font-weight: 700;
      color: #0f172a;
    }
    .sig-hint {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      height: 36px;
      margin-top: 6px;
    }
    .footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #94a3b8;
    }
    .footer-left {
      flex: 1;
      text-align: left;
    }
    .footer-right {
      flex-shrink: 0;
      font-weight: 600;
      color: #64748b;
    }

    /* Print Specific Media Query */
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .sheet-wrapper {
        width: 100% !important;
        margin: 0 !important;
      }
      .a4-page {
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        padding: 12mm 15mm 10mm 15mm !important;
        border-bottom: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .a4-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    ${renderPagesHtml()}
  </div>
</body>
</html>`;
}

/**
 * Triggers printing using a dedicated hidden iframe populated with styled A4 HTML
 */
export function printQuoteDirectly(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const html = buildPrintableQuoteHTML(quote, profile, entitlement);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        // Fallback to window.print() or PDF print
        window.print();
        resolve(true);
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      const handleTriggerPrint = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve(true);
          } catch (err) {
            console.warn('Iframe print failed, falling back to window.print:', err);
            window.print();
            resolve(true);
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 60000);
          }
        }, 250);
      };

      if (iframe.contentWindow?.document.readyState === 'complete') {
        handleTriggerPrint();
      } else {
        iframe.onload = handleTriggerPrint;
      }
    } catch (err) {
      console.error('printQuoteDirectly error:', err);
      try {
        window.print();
        resolve(true);
      } catch {
        resolve(false);
      }
    }
  });
}
