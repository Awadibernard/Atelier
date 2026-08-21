import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessProfile, Quote, UserEntitlement } from '../types';
import { formatCurrency, formatDateShort } from './formatters';
import { isPremium } from '../licensing/features';

export function generateQuotePDF(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = profile.currencySymbol || 'FCFA';
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  let cursorY = margin;

  // Primary palette (Dark slate & refined neutral)
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // slate-600
  const accentColor: [number, number, number] = [15, 118, 110]; // teal-700
  const lightBg: [number, number, number] = [248, 250, 252]; // slate-50

  // 1. Header (Logo / Business name)
  const headerLeftX = margin;
  const headerRightX = pageWidth - margin;
  const hasRealLogo = Boolean(profile.logoUrl && profile.logoUrl.startsWith('data:image'));
  const hasBusinessName = Boolean(profile.name && profile.name.trim());
  const businessName = profile.name ? profile.name.trim() : '';

  if (hasRealLogo) {
    try {
      let drawLogoW = 22;
      let drawLogoH = 22;

      // Extract image properties to prevent distortion and preserve exact aspect ratio
      const imgProps = doc.getImageProperties(profile.logoUrl);
      if (imgProps && imgProps.width > 0 && imgProps.height > 0) {
        const aspect = imgProps.width / imgProps.height;
        const maxBoxW = 32; // max width allowed in mm
        const maxBoxH = 22; // max height allowed in mm

        if (aspect > maxBoxW / maxBoxH) {
          // Landscape / rectangular logo
          drawLogoW = maxBoxW;
          drawLogoH = maxBoxW / aspect;
        } else {
          // Circular mask (aspect === 1.0), square logo (1.0), or portrait logo
          drawLogoH = maxBoxH;
          drawLogoW = maxBoxH * aspect;
        }
      }

      const imgFormat = profile.logoUrl.startsWith('data:image/jpeg') || profile.logoUrl.startsWith('data:image/jpg')
        ? 'JPEG'
        : 'PNG';

      doc.addImage(profile.logoUrl, imgFormat, headerLeftX, cursorY, drawLogoW, drawLogoH);

      const textStartX = headerLeftX + drawLogoW + 4;
      if (hasBusinessName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text(businessName, textStartX, cursorY + 7);

        if (profile.tagline && profile.tagline.trim()) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...secondaryColor);
          doc.text(profile.tagline.trim(), textStartX, cursorY + 12);
        }
      }
      cursorY += Math.max(drawLogoH + 4, 24);
    } catch {
      // Fallback if image parsing fails
      if (hasBusinessName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.text(businessName, headerLeftX, cursorY + 6);

        if (profile.tagline && profile.tagline.trim()) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...secondaryColor);
          doc.text(profile.tagline.trim(), headerLeftX, cursorY + 12);
          cursorY += 16;
        } else {
          cursorY += 12;
        }
      } else {
        cursorY += 8;
      }
    }
  } else if (hasBusinessName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(businessName, headerLeftX, cursorY + 6);

    if (profile.tagline && profile.tagline.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      doc.text(profile.tagline.trim(), headerLeftX, cursorY + 12);
      cursorY += 16;
    } else {
      cursorY += 12;
    }
  } else {
    // No logo and no company name: keep header space compact
    cursorY += 6;
  }

  // Quote Title & Meta Box (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...accentColor);
  doc.text('DEVIS', headerRightX, margin + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(`N° ${quote.quoteNumber}`, headerRightX, margin + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(`Date : ${formatDateShort(quote.createdAt)}`, headerRightX, margin + 18, { align: 'right' });
  doc.text(`Validité : ${formatDateShort(quote.validUntil)}`, headerRightX, margin + 23, { align: 'right' });

  // 2. Info Columns: Workshop (Left) vs Customer (Right)
  cursorY = Math.max(cursorY, margin + 28);

  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  const rightColX = margin + colWidth + 10;
  const boxHeight = 34;

  // Workshop details box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, cursorY, colWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, colWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('ÉMIS PAR :', margin + 4, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  let wsLineY = cursorY + 11;

  if (hasBusinessName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(businessName, margin + 4, wsLineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    wsLineY += 4.5;
  }

  if (profile.phone && profile.phone.trim()) {
    doc.text(`Tél : ${profile.phone.trim()}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }

  if (profile.whatsapp && profile.whatsapp.trim()) {
    doc.text(`WhatsApp : ${profile.whatsapp.trim()}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }

  if (profile.email && profile.email.trim()) {
    doc.text(`Email : ${profile.email.trim()}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }

  const workshopAddress = [
    profile.address?.trim(),
    profile.city?.trim(),
    profile.country?.trim(),
  ].filter(Boolean).join(', ');

  if (workshopAddress) {
    doc.text(workshopAddress, margin + 4, wsLineY);
    wsLineY += 4.5;
  }

  if (profile.taxId && profile.taxId.trim()) {
    doc.text(`RCCM / NIF : ${profile.taxId.trim()}`, margin + 4, wsLineY);
  }

  // Customer details box
  doc.setFillColor(...lightBg);
  doc.roundedRect(rightColX, cursorY, colWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, cursorY, colWidth, boxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('DEVIS POUR :', rightColX + 4, cursorY + 6);

  let custLineY = cursorY + 11;
  const clientName = quote.customer.name ? quote.customer.name.trim() : '';

  if (clientName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text(clientName, rightColX + 4, custLineY);
    custLineY += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);

  if (quote.customer.phone && quote.customer.phone.trim()) {
    doc.text(`Tél : ${quote.customer.phone.trim()}`, rightColX + 4, custLineY);
    custLineY += 4.5;
  }

  if (quote.customer.email && quote.customer.email.trim()) {
    doc.text(`Email : ${quote.customer.email.trim()}`, rightColX + 4, custLineY);
    custLineY += 4.5;
  }

  const clientAddress = [
    quote.customer.address?.trim(),
    quote.customer.city?.trim(),
  ].filter(Boolean).join(' - ');

  if (clientAddress) {
    doc.text(clientAddress, rightColX + 4, custLineY);
  }

  cursorY += boxHeight + 6;

  // 3. Project Overview Banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  const projectTitleText = quote.projectTitle ? quote.projectTitle.trim().toUpperCase() : 'DEVIS';
  doc.text(`OBJET : ${projectTitleText}`, margin + 4, cursorY + 6);

  if (quote.projectDescription && quote.projectDescription.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...secondaryColor);
    const splitDesc = doc.splitTextToSize(quote.projectDescription.trim(), pageWidth - margin * 2 - 8);
    doc.text(splitDesc[0] || '', margin + 4, cursorY + 10.5);
  }

  cursorY += 18;

  // 4. Line Items Table
  const tableHeaders = [['Description / Désignation', 'Qté', 'Unité', `Prix Unit. (${currency})`, `Total (${currency})`]];

  const tableData = quote.lineItems.map((item) => [
    item.description || '',
    item.quantity.toString(),
    item.unit || '',
    formatCurrency(item.unitPrice, '', false).trim(),
    formatCurrency(item.total, '', false).trim(),
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate position after table
  // @ts-expect-error - lastAutoTable is injected by jspdf-autotable plugin
  const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY + 40;
  cursorY = finalY + 8;

  // Check if we need a page break for the summary + signatures
  if (cursorY + 65 > pageHeight) {
    doc.addPage();
    cursorY = margin;
  }

  // 5. Totals & Payment Breakdown (Right box) & Notes (Left box)
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;
  const notesBoxWidth = summaryBoxX - margin - 8;

  // Notes & Conditions (Left)
  if ((quote.notes && quote.notes.trim()) || (quote.paymentTerms && quote.paymentTerms.trim()) || (profile.footerNotes && profile.footerNotes.trim())) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('CONDITIONS & MODALITÉS :', margin, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    let noteY = cursorY + 9;

    if (quote.paymentTerms && quote.paymentTerms.trim()) {
      doc.text(`• Règlement : ${quote.paymentTerms.trim()}`, margin, noteY);
      noteY += 4.5;
    }
    if (quote.notes && quote.notes.trim()) {
      const splitNotes = doc.splitTextToSize(`• Note : ${quote.notes.trim()}`, notesBoxWidth);
      doc.text(splitNotes, margin, noteY);
      noteY += splitNotes.length * 4;
    }
    if (profile.footerNotes && profile.footerNotes.trim()) {
      const splitFooter = doc.splitTextToSize(`• ${profile.footerNotes.trim()}`, notesBoxWidth);
      doc.text(splitFooter, margin, noteY);
    }
  }

  // Financial Summary Box (Right)
  doc.setFillColor(...lightBg);
  doc.roundedRect(summaryBoxX, cursorY, summaryBoxWidth, 42, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryBoxX, cursorY, summaryBoxWidth, 42, 2, 2, 'S');

  let sumY = cursorY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text('Sous-total :', summaryBoxX + 4, sumY);
  doc.text(formatCurrency(quote.subtotal, currency), summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += 6;
  if (quote.discountAmount && quote.discountAmount > 0) {
    doc.text(`Remise (${quote.discountPercent || ''}%) :`, summaryBoxX + 4, sumY);
    doc.setTextColor(220, 38, 38);
    doc.text(`- ${formatCurrency(quote.discountAmount, currency)}`, summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });
    sumY += 6;
  }

  // Total Net / TTC
  doc.setFillColor(...primaryColor);
  doc.rect(summaryBoxX, sumY - 4, summaryBoxWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL NET :', summaryBoxX + 4, sumY + 2.5);
  doc.text(formatCurrency(quote.finalTotal, currency), summaryBoxX + summaryBoxWidth - 4, sumY + 2.5, { align: 'right' });

  // Deposit & Balance
  sumY += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentColor);
  doc.text(`Acompte (${quote.depositConfig.type === 'percent' ? `${quote.depositConfig.value}%` : 'prévu'}) :`, summaryBoxX + 4, sumY);
  doc.text(formatCurrency(quote.depositAmount, currency), summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

  sumY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Solde restant :', summaryBoxX + 4, sumY);
  doc.text(formatCurrency(quote.balanceAmount, currency), summaryBoxX + summaryBoxWidth - 4, sumY, { align: 'right' });

  cursorY += 48;

  // 6. Signatures Box
  const sigBoxY = Math.min(cursorY, pageHeight - 35);
  const sigBoxWidth = (pageWidth - margin * 2 - 10) / 2;

  // Workshop signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  const sigWorkshopLabel = hasBusinessName ? `Pour ${businessName}` : "Pour l'Émetteur";
  doc.text(sigWorkshopLabel, margin, sigBoxY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Cachet et signature', margin, sigBoxY + 4);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, sigBoxY + 20, margin + sigBoxWidth, sigBoxY + 20);

  // Client signature
  const clientSigX = margin + sigBoxWidth + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Le Client', clientSigX, sigBoxY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Date & Signature précédée de "Bon pour accord"', clientSigX, sigBoxY + 4);
  doc.line(clientSigX, sigBoxY + 20, clientSigX + sigBoxWidth, sigBoxY + 20);

  // Discreet footer
  const userIsPrem = isPremium(entitlement);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  if (userIsPrem) {
    const footerText = hasBusinessName
      ? `Document professionnel officiel • ${businessName}`
      : 'Document professionnel officiel';
    doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });
  } else {
    doc.text(
      `Document généré avec AtelierDevis • www.atelierdevis.app`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadQuotePDF(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): void {
  const doc = generateQuotePDF(quote, profile, entitlement);
  const rawCustomer = quote.customer.name?.trim() || 'client';
  const safeCustomer = rawCustomer.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Devis_${quote.quoteNumber}_${safeCustomer}.pdf`;
  doc.save(filename);
}

export function printQuotePDF(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): void {
  try {
    const doc = generateQuotePDF(quote, profile, entitlement);
    doc.autoPrint();
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create a hidden iframe for direct printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Fallback if iframe print restricted
          window.open(blobUrl, '_blank');
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }
      }, 300);
    };
  } catch (err) {
    console.error('PDF Print error:', err);
    throw err;
  }
}


