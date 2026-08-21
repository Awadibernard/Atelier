import { BusinessProfile, Quote, UserEntitlement } from '../types';
import { generateQuotePDF } from './pdfGenerator';
import { formatCurrency, formatDateFrench, formatDateShort } from './formatters';
import { isPremium } from '../licensing/features';

/**
 * Builds standalone self-contained printable HTML for a quote
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

  const workshopAddress = [
    profile.address?.trim(),
    profile.city?.trim(),
    profile.country?.trim(),
  ].filter(Boolean).join(', ');

  const customerAddress = [
    quote.customer.address?.trim(),
    quote.customer.city?.trim(),
  ].filter(Boolean).join(' - ');

  const itemsHtml = quote.lineItems.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 8px 10px; font-weight: 500; color: #1e293b;">${item.description}</td>
      <td style="padding: 8px 10px; text-align: center; color: #475569;">${item.quantity} ${item.unit}</td>
      <td style="padding: 8px 10px; text-align: right; color: #475569;">${formatCurrency(item.unitPrice, currency)}</td>
      <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(item.total, currency)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis N° ${quote.quoteNumber} - ${hasBusinessName ? businessName : 'AtelierDevis'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 16px;
    }
    .logo-container img {
      max-height: 55px;
      max-width: 140px;
      object-fit: contain;
      margin-bottom: 6px;
      display: block;
    }
    .business-title {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .tagline {
      font-size: 9pt;
      color: #64748b;
      font-style: italic;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-badge {
      font-size: 18pt;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 1px;
    }
    .quote-num {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
    }
    .meta-date {
      font-size: 9pt;
      color: #64748b;
    }
    .columns {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .col-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      font-size: 9.5pt;
    }
    .col-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f766e;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .subject-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 10pt;
    }
    .subject-title {
      font-weight: 700;
      color: #134e4a;
    }
    .subject-desc {
      color: #115e59;
      font-size: 9pt;
      margin-top: 4px;
      white-space: pre-line;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      font-weight: 600;
      padding: 8px 10px;
      text-align: left;
      font-size: 9pt;
    }
    th.text-center { text-align: center; }
    th.text-right { text-align: right; }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .notes-box {
      flex: 1;
      font-size: 8.5pt;
      color: #475569;
    }
    .notes-title {
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      font-size: 8pt;
      margin-bottom: 6px;
    }
    .totals-box {
      width: 260px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 9.5pt;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .total-final {
      border-top: 2px solid #cbd5e1;
      margin-top: 6px;
      padding-top: 6px;
      font-weight: 700;
      font-size: 11pt;
      color: #0f766e;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .sig-block {
      flex: 1;
    }
    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      height: 45px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="business-info">
        ${profile.logoUrl && profile.logoUrl.startsWith('data:image') ? `
          <div class="logo-container">
            <img src="${profile.logoUrl}" alt="Logo" />
          </div>
        ` : ''}
        ${hasBusinessName ? `<div class="business-title">${businessName}</div>` : ''}
        ${profile.tagline && profile.tagline.trim() ? `<div class="tagline">${profile.tagline.trim()}</div>` : ''}
      </div>
      <div class="quote-meta">
        <div class="quote-badge">DEVIS</div>
        <div class="quote-num">N° ${quote.quoteNumber}</div>
        <div class="meta-date">Date : <strong>${formatDateFrench(quote.createdAt)}</strong></div>
        <div class="meta-date">Validité : <strong>${formatDateShort(quote.validUntil)}</strong></div>
      </div>
    </div>

    <div class="columns">
      <div class="col-box">
        <div class="col-title">Émis par</div>
        ${hasBusinessName ? `<div><strong>${businessName}</strong></div>` : ''}
        ${profile.phone && profile.phone.trim() ? `<div>Tél : ${profile.phone.trim()}</div>` : ''}
        ${profile.whatsapp && profile.whatsapp.trim() ? `<div>WhatsApp : ${profile.whatsapp.trim()}</div>` : ''}
        ${profile.email && profile.email.trim() ? `<div>Email : ${profile.email.trim()}</div>` : ''}
        ${workshopAddress ? `<div>Adresse : ${workshopAddress}</div>` : ''}
        ${profile.taxId && profile.taxId.trim() ? `<div>RCCM / NIF : ${profile.taxId.trim()}</div>` : ''}
      </div>

      <div class="col-box">
        <div class="col-title">Destinataire</div>
        ${hasCustomerName ? `<div><strong>${customerName}</strong></div>` : ''}
        ${quote.customer.phone && quote.customer.phone.trim() ? `<div>Tél : ${quote.customer.phone.trim()}</div>` : ''}
        ${quote.customer.email && quote.customer.email.trim() ? `<div>Email : ${quote.customer.email.trim()}</div>` : ''}
        ${customerAddress ? `<div>Adresse : ${customerAddress}</div>` : ''}
      </div>
    </div>

    <div class="subject-box">
      <div class="subject-title">OBJET : ${quote.projectTitle || 'DEVIS'}</div>
      ${quote.projectDescription && quote.projectDescription.trim() ? `
        <div class="subject-desc">${quote.projectDescription.trim()}</div>
      ` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description de la prestation / Matériaux</th>
          <th class="text-center" style="width: 80px;">Quantité</th>
          <th class="text-right" style="width: 100px;">Prix Unit.</th>
          <th class="text-right" style="width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="bottom-section">
      <div class="notes-box">
        ${((quote.paymentTerms && quote.paymentTerms.trim()) || (quote.notes && quote.notes.trim()) || (profile.footerNotes && profile.footerNotes.trim())) ? `
          <div class="notes-title">Modalités & Notes</div>
        ` : ''}
        ${quote.paymentTerms && quote.paymentTerms.trim() ? `
          <p style="margin-bottom: 6px; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
            <strong>Paiement :</strong> ${quote.paymentTerms.trim()}
          </p>
        ` : ''}
        ${quote.notes && quote.notes.trim() ? `
          <p style="font-style: italic; color: #64748b; margin-bottom: 6px;">${quote.notes.trim()}</p>
        ` : ''}
        ${profile.footerNotes && profile.footerNotes.trim() ? `
          <p style="font-size: 7.5pt; color: #94a3b8;">${profile.footerNotes.trim()}</p>
        ` : ''}
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span>Total Brut HT :</span>
          <span>${formatCurrency(quote.subtotal, currency)}</span>
        </div>
        ${quote.discountAmount > 0 ? `
          <div class="total-row" style="color: #b91c1c;">
            <span>Remise accordée :</span>
            <span>-${formatCurrency(quote.discountAmount, currency)}</span>
          </div>
        ` : ''}
        <div class="total-row total-final">
          <span>NET À PAYER :</span>
          <span>${formatCurrency(quote.finalTotal, currency)}</span>
        </div>
        ${quote.depositAmount > 0 ? `
          <div class="total-row" style="margin-top: 6px; font-weight: 600; color: #047857;">
            <span>Acompte requis :</span>
            <span>${formatCurrency(quote.depositAmount, currency)}</span>
          </div>
          <div class="total-row" style="color: #64748b; font-size: 8.5pt;">
            <span>Solde à la livraison :</span>
            <span>${formatCurrency(quote.balanceAmount, currency)}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div><strong>${hasBusinessName ? `Pour ${businessName}` : "Pour l'Émetteur"}</strong></div>
        <div style="font-size: 8pt; color: #64748b;">Cachet & signature</div>
        <div class="sig-line"></div>
      </div>
      <div class="sig-block" style="text-align: right;">
        <div><strong>Bon pour accord (Client)</strong></div>
        <div style="font-size: 8pt; color: #64748b;">Date & signature</div>
        <div class="sig-line"></div>
      </div>
    </div>

    <div class="footer">
      ${userIsPrem ? (
        hasBusinessName ? `Document officiel d'atelier certifié conforme • ${businessName}` : "Document officiel d'atelier certifié conforme"
      ) : (
        "Document généré avec AtelierDevis • www.atelierdevis.app"
      )}
    </div>
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
