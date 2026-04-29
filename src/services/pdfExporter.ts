import PDFDocument from 'pdfkit';
import type { AnalysisResult } from '../types/analysis.js';

export interface ExportPdfOptions {
  idea?: string;
  generatedAt?: Date;
}

const COLORS = {
  text: '#111111',
  muted: '#555555',
  accent: '#7c3aed',
  rule: '#dddddd',
  bandBg: '#f4f1fb',
};

function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.6);
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLORS.accent)
    .text(title);
  const y = doc.y + 2;
  doc
    .strokeColor(COLORS.rule)
    .lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(COLORS.text);
}

function drawLabelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
): void {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text(label);
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.text).text(value);
  doc.moveDown(0.4);
}

export function buildAnalysisPdf(
  result: AnalysisResult,
  options: ExportPdfOptions = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: {
        Title: 'Project Idea Analysis',
        Author: 'Keep Project Idea',
        Subject: 'Strategic analysis report',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(COLORS.text)
      .text('Project Idea Analysis');

    const generatedAt = options.generatedAt ?? new Date();
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.muted)
      .text(`Generated: ${generatedAt.toISOString()}`);

    if (options.idea && options.idea.trim().length > 0) {
      doc.moveDown(0.4);
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(`Idea: ${options.idea.trim()}`);
    }

    drawSectionHeading(doc, 'Project Summary');
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(safeText(result.project_summary), { align: 'justify' });

    drawSectionHeading(doc, 'Viability');
    const score = result.viability.score;
    doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(COLORS.accent)
      .text(`${score}/100`, { continued: true });
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.muted)
      .text(`   ${safeText(result.viability.status)}`);
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(safeText(result.viability.reasoning), { align: 'justify' });

    drawSectionHeading(doc, 'Competitors');
    result.competitors.forEach((c, i) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COLORS.text)
        .text(`${i + 1}. ${safeText(c.name)}`);
      doc.moveDown(0.15);
      drawLabelValue(doc, 'Key features', safeText(c.key_features));
      drawLabelValue(doc, 'Weakness', safeText(c.weakness));
    });

    drawSectionHeading(doc, 'Market Analysis');
    drawLabelValue(doc, 'Trends', safeText(result.market_analysis.trends));
    drawLabelValue(
      doc,
      'Target audience',
      safeText(result.market_analysis.target_audience),
    );

    drawSectionHeading(doc, 'Differentiation Points');
    result.differentiation_points.forEach((p, i) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.text)
        .text(`${i + 1}. ${safeText(p)}`);
      doc.moveDown(0.2);
    });

    drawSectionHeading(doc, 'Master Prompt');
    doc
      .font('Courier')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(safeText(result.master_prompt), {
        align: 'left',
        lineGap: 1.5,
      });

    doc.end();
  });
}

export function buildExportFilename(
  idea: string | undefined,
  generatedAt: Date = new Date(),
): string {
  const stamp = generatedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = (idea ?? 'analysis')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const safe = slug.length > 0 ? slug : 'analysis';
  return `${safe}-${stamp}.pdf`;
}
