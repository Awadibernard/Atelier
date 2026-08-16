import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BusinessProfile, Quote, UserEntitlement } from '../types';
import { formatCurrency, formatDateFrench, formatDateShort } from './formatters';
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
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

  // Check if logo exists
  if (profile.logoUrl && profile.logoUrl.startsWith('data:image')) {
    try {
      doc.addImage(profile.logoUrl, 'PNG', headerLeftX, cursorY, 28, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...primaryColor);
      doc.text(profile.name, headerLeftX + 32, cursorY + 7);

      if (profile.tagline) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text(profile.tagline, headerLeftX + 32, cursorY + 12);
      }
      cursorY += 24;
    } catch {
      // Fallback if image parsing fails
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...primaryColor);
      doc.text(profile.name, headerLeftX, cursorY + 6);
      cursorY += 12;
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text(profile.name, headerLeftX, cursorY + 6);

    if (profile.tagline) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      doc.text(profile.tagline, headerLeftX, cursorY + 12);
      cursorY += 16;
    } else {
      cursorY += 12;
    }
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

  // Workshop details box
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, cursorY, colWidth, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, colWidth, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('ÉMIS PAR :', margin + 4, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  let wsLineY = cursorY + 11;
  if (profile.phone) {
    doc.text(`Tél : ${profile.phone}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }
  if (profile.whatsapp) {
    doc.text(`WhatsApp : ${profile.whatsapp}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }
  if (profile.address || profile.city) {
    doc.text(`${profile.address || ''} ${profile.city ? `- ${profile.city}` : ''}`, margin + 4, wsLineY);
    wsLineY += 4.5;
  }
  if (profile.taxId) {
    doc.text(`RCCM / NIF : ${profile.taxId}`, margin + 4, wsLineY);
  }

  // Customer details box
  doc.setFillColor(...lightBg);
  doc.roundedRect(rightColX, cursorY, colWidth, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, cursorY, colWidth, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('DEVIS POUR :', rightColX + 4, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(quote.customer.name || 'Client', rightColX + 4, cursorY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  let custLineY = cursorY + 17;
  if (quote.customer.phone) {
    doc.text(`Tél : ${quote.customer.phone}`, rightColX + 4, custLineY);
    custLineY += 4.5;
  }
  if (quote.customer.email) {
    doc.text(`Email : ${quote.customer.email}`, rightColX + 4, custLineY);
    custLineY += 4.5;
  }
  if (quote.customer.address || quote.customer.city) {
    doc.text(`${quote.customer.address || ''} ${quote.customer.city ? `- ${quote.customer.city}` : ''}`, rightColX + 4, custLineY);
  }

  cursorY += 38;

  // 3. Project Overview Banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(`PROJET : ${quote.projectTitle.toUpperCase()}`, margin + 4, cursorY + 6);

  if (quote.projectDescription) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...secondaryColor);
    const splitDesc = doc.splitTextToSize(quote.projectDescription, pageWidth - margin * 2 - 8);
    doc.text(splitDesc[0] || '', margin + 4, cursorY + 10.5);
  }

  cursorY += 18;

  // 4. Line Items Table
  const tableHeaders = [['Description / Désignation', 'Qté', 'Unité', `Prix Unit. (${currency})`, `Total (${currency})`]];
  
  const tableData = quote.lineItems.map((item) => [
    item.description,
    item.quantity.toString(),
    item.unit,
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
  if (quote.notes || quote.paymentTerms || profile.footerNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.text('CONDITIONS & MODALITÉS :', margin, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    let noteY = cursorY + 9;

    if (quote.paymentTerms) {
      doc.text(`• Règlement : ${quote.paymentTerms}`, margin, noteY);
      noteY += 4.5;
    }
    if (quote.notes) {
      const splitNotes = doc.splitTextToSize(`• Note : ${quote.notes}`, notesBoxWidth);
      doc.text(splitNotes, margin, noteY);
      noteY += splitNotes.length * 4;
    }
    if (profile.footerNotes) {
      const splitFooter = doc.splitTextToSize(`• ${profile.footerNotes}`, notesBoxWidth);
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
  doc.text(`Pour ${profile.name}`, margin, sigBoxY);
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
    doc.text(
      `Document professionnel officiel • ${profile.name || 'Atelier de Fabrication'}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  } else {
    doc.text(
      `Document généré avec AtelierDevis (Version Gratuite) • www.atelierdevis.app`,
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
  const safeCustomer = (quote.customer.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Devis_${quote.quoteNumber}_${safeCustomer}.pdf`;
  doc.save(filename);
}

export function printQuotePDF(
  quote: Quote,
  profile: BusinessProfile,
  entitlement?: UserEntitlement
): void {
  const doc = generateQuotePDF(quote, profile, entitlement);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}

