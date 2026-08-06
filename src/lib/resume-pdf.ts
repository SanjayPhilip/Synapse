import { jsPDF } from 'jspdf';
import type { ResumeData } from '@/types';

const PAGE_W = 210; // A4 mm
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ACCENT: [number, number, number] = [24, 191, 239]; // cyan #18bfef

function ensurePage(doc: jsPDF, cursor: number, needed: number): number {
  if (cursor + needed > 280) {
    doc.addPage();
    return MARGIN;
  }
  return cursor;
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y, 2.5, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title.toUpperCase(), MARGIN + 5, y + 4.6);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 60, y + 4.6, PAGE_W - MARGIN, y + 4.6);
  return y + 11;
}

function wrap(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function formatDate(s?: string): string {
  if (!s) return '';
  return s.slice(0, 7).replace('-', '/');
}

export function buildResumePdf(name: string, data: ResumeData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contact = data.contact || {};
  const displayName = name || contact.name || 'Resume';
  let y = MARGIN;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(displayName, MARGIN, 15);
  const contactParts = [contact.email, contact.phone, contact.location].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text(contactParts.join('  |  '), MARGIN, 22);
  }
  if (contact.linkedin || contact.website) {
    doc.setFontSize(9);
    doc.text([contact.linkedin, contact.website].filter(Boolean).join('  |  '), MARGIN, 26.5);
  }
  y = 38;

  // Summary
  if (data.summary) {
    y = sectionTitle(doc, y, 'Professional Summary');
    y = wrap(doc, data.summary, MARGIN, y + 5, CONTENT_W, 4.4) + 4;
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    y = sectionTitle(doc, y, 'Skills');
    y = wrap(doc, data.skills.join('  ·  '), MARGIN, y + 5, CONTENT_W, 4.4) + 4;
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    y = sectionTitle(doc, y, 'Work Experience');
    for (const exp of data.experience) {
      y = ensurePage(doc, y, 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text([exp.title || '', exp.company || ''].filter(Boolean).join(' — '), MARGIN, y + 5);
      const dates = [formatDate(exp.start_date), exp.end_date ? formatDate(exp.end_date) : 'Present'].filter(Boolean).join(' - ');
      if (dates) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(dates, PAGE_W - MARGIN, y + 5, { align: 'right' });
      }
      y = wrap(doc, exp.description || '', MARGIN, y + 10.5, CONTENT_W, 4.4) + 6;
    }
  }

  // Education
  if (data.education && data.education.length > 0) {
    y = sectionTitle(doc, y, 'Education');
    for (const edu of data.education) {
      y = ensurePage(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text([edu.degree, edu.field].filter(Boolean).join(' in '), MARGIN, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(edu.institution || '', MARGIN, y + 10.5);
      const dates = [formatDate(edu.start_date), edu.end_date ? formatDate(edu.end_date) : 'Present'].filter(Boolean).join(' - ');
      if (dates) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(dates, PAGE_W - MARGIN, y + 5, { align: 'right' });
      }
      y += 16;
    }
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    y = ensurePage(doc, y, 12);
    y = sectionTitle(doc, y, 'Certifications');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    for (const cert of data.certifications) {
      y = ensurePage(doc, y, 6);
      doc.text(`•  ${cert}`, MARGIN, y + 5);
      y += 5.5;
    }
  }

  return doc;
}

export function exportResumePdf(fileName: string, name: string, data: ResumeData): void {
  const doc = buildResumePdf(name, data);
  const safeName = fileName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
  doc.save(`${safeName || 'resume'}.pdf`);
}
