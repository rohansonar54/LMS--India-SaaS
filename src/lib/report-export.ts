// Utility for professional Excel export (.xls and .csv) and zero-blank-page A4 Report Printing.
import { formatINR } from './currency';
import { BUSINESS_INFO } from './business-config';

export interface ReportMeta {
  title: string;
  category?: string;
  dateRange?: string;
  locationName?: string;
}

export interface SummaryTotalItem {
  label: string;
  value: string | number;
  isCurrency?: boolean;
}

/**
 * Maps raw objects/arrays/fields to human-readable strings.
 * NEVER allows `[object Object]` to appear in any exported file or print view.
 */
export function formatCellValue(val: unknown, keyName?: string): string {
  if (val === null || val === undefined) return '—';

  // Date object or ISO date string
  if (val instanceof Date) {
    return val.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  // Array of items (e.g. orderItems)
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None';
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const name = item.itemName || item.name || item.typeName || 'Item';
          const qty = item.qty || item.quantity || 1;
          const svc = item.serviceName ? ` (${item.serviceName})` : '';
          return `${name}${svc} x ${qty}`;
        }
        return String(item);
      })
      .join(', ');
  }

  // Nested Object handling
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;

    // Order Items object
    if (obj.itemName || obj.typeName) {
      const name = obj.itemName || obj.typeName;
      const qty = obj.qty || 1;
      return `${name} x ${qty}`;
    }

    // Customer object
    if (obj.fullname || obj.customerName) {
      const name = obj.fullname || obj.customerName;
      const contact = obj.contact || obj.phone ? ` (${obj.contact || obj.phone})` : '';
      return `${name}${contact}`;
    }

    // Supplier object
    if (obj.supplierName || obj.companyName || obj.name) {
      return String(obj.supplierName || obj.companyName || obj.name);
    }

    // Location object
    if (obj.locationName || obj.name) {
      return String(obj.locationName || obj.name);
    }

    // Fallback: extract primary string properties or avoid [object Object]
    const values = Object.entries(obj)
      .filter(([k]) => !['_id', '__v', 'id'].includes(k))
      .map(([, v]) => String(v));
    return values.length > 0 ? values.join(' - ') : '—';
  }

  // Booleans
  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  // Numbers (format currency if key looks like money)
  if (typeof val === 'number') {
    if (keyName && /amount|total|price|revenue|collected|paid|balance|cost/i.test(keyName)) {
      return formatINR(val);
    }
    return val.toLocaleString('en-IN');
  }

  return String(val);
}

/**
 * Filter out technical MongoDB IDs from business report columns
 */
export function isInternalField(key: string): boolean {
  return /^_id$|^__v$|objectId|ObjectId$|locationId$|customerId$|supplierId$|driverObjectId/i.test(key);
}

/**
 * Format column header to Title Case
 */
export function formatColumnHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Professional Excel (.xls) Export with XML/HTML styling
 * Microsoft Excel, LibreOffice, and Google Sheets open this with full colors, bold headers, and proper borders!
 */
export function exportReportToExcel({
  meta,
  columns,
  rows,
  summaryTotals = [],
}: {
  meta: ReportMeta;
  columns: { key: string; label: string; isCurrency?: boolean }[];
  rows: Record<string, unknown>[];
  summaryTotals?: SummaryTotalItem[];
}) {
  const generatedTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const tableRowsHtml = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          const rawVal = row[col.key];
          const displayVal = formatCellValue(rawVal, col.key);
          const isNum = col.isCurrency || typeof rawVal === 'number';
          const align = isNum ? 'right' : 'left';
          return `<td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: ${align}; font-size: 11px;">${displayVal}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  // Summary footer rows
  let summaryRowsHtml = '';
  if (summaryTotals.length > 0) {
    const summaryCells = summaryTotals
      .map(
        (st) =>
          `<div style="display: inline-block; margin-right: 20px; font-size: 12px;"><strong>${st.label}:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${st.isCurrency ? formatINR(Number(st.value) || 0) : st.value}</span></div>`
      )
      .join('');

    summaryRowsHtml = `
      <tr>
        <td colspan="${columns.length}" style="padding: 10px; background: #f1f5f9; border: 2px solid #94a3b8; font-size: 12px;">
          ${summaryCells}
        </td>
      </tr>
    `;
  }

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${meta.title.slice(0, 30)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Segoe UI, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          .header-banner { background: #1e3a8a; color: #ffffff; font-size: 16px; font-weight: bold; text-align: center; padding: 12px; }
          .sub-banner { background: #eff6ff; color: #1e40af; font-size: 11px; padding: 6px; }
          .col-header { background: #2563eb; color: #ffffff; font-weight: bold; font-size: 12px; border: 1px solid #1d4ed8; padding: 8px 10px; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <!-- Header Banner -->
          <tr>
            <td colspan="${columns.length}" class="header-banner">
              ${BUSINESS_INFO.name.toUpperCase()}
            </td>
          </tr>
          <tr>
            <td colspan="${columns.length}" class="sub-banner">
              <strong>Report:</strong> ${meta.title} &nbsp;|&nbsp; 
              <strong>Location:</strong> ${meta.locationName || 'All Locations'} &nbsp;|&nbsp; 
              <strong>Date Range:</strong> ${meta.dateRange || 'All Time'} &nbsp;|&nbsp; 
              <strong>Generated:</strong> ${generatedTime}
            </td>
          </tr>
          <tr><td colspan="${columns.length}" style="height: 8px;"></td></tr>

          <!-- Table Header -->
          <thead>
            <tr>
              ${columns
                .map(
                  (c) =>
                    `<th class="col-header" style="text-align: ${c.isCurrency ? 'right' : 'left'};">${c.label}</th>`
                )
                .join('')}
            </tr>
          </thead>

          <!-- Data Rows -->
          <tbody>
            ${tableRowsHtml}
            ${summaryRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeFilename = meta.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `${safeFilename}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clean CSV Export with UTF-8 BOM so Excel opens INR symbols without mojibake
 */
export function exportReportToCSV({
  meta,
  columns,
  rows,
  summaryTotals = [],
}: {
  meta: ReportMeta;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  summaryTotals?: SummaryTotalItem[];
}) {
  const generatedTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const lines: string[] = [];

  // Metadata headers
  lines.push(`"${BUSINESS_INFO.name}"`);
  lines.push(`"Report: ${meta.title}"`);
  lines.push(`"Location: ${meta.locationName || 'All Locations'}"`);
  lines.push(`"Date Range: ${meta.dateRange || 'All Time'}"`);
  lines.push(`"Generated: ${generatedTime}"`);
  lines.push(''); // blank line

  // Column headers
  lines.push(columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(','));

  // Data rows
  rows.forEach((row) => {
    const line = columns.map((col) => {
      const rawVal = row[col.key];
      const valStr = formatCellValue(rawVal, col.key);
      return `"${valStr.replace(/"/g, '""')}"`;
    });
    lines.push(line.join(','));
  });

  // Summary Totals
  if (summaryTotals.length > 0) {
    lines.push('');
    lines.push(
      summaryTotals
        .map((st) => `"${st.label}: ${st.isCurrency ? formatINR(Number(st.value) || 0) : st.value}"`)
        .join(',')
    );
  }

  // Prepend \uFEFF BOM for Excel UTF-8 recognition
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeFilename = meta.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `${safeFilename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Dedicated A4 Report Printing via Isolated Iframe.
 * Never displays a blank page, never clips, hides sidebar and app bars,
 * and prints an elegant, professional A4 report document.
 */
export function printReportDocument({
  meta,
  columns,
  rows,
  summaryTotals = [],
}: {
  meta: ReportMeta;
  columns: { key: string; label: string; isCurrency?: boolean }[];
  rows: Record<string, unknown>[];
  summaryTotals?: SummaryTotalItem[];
}) {
  const generatedTime = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const tableRowsHtml = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          const rawVal = row[col.key];
          const displayVal = formatCellValue(rawVal, col.key);
          const align = col.isCurrency || typeof rawVal === 'number' ? 'right' : 'left';
          return `<td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: ${align}; font-size: 10px;">${displayVal}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  let summaryHtml = '';
  if (summaryTotals.length > 0) {
    summaryHtml = `
      <div style="margin-top: 14px; padding: 10px 14px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; flex-wrap: wrap; gap: 20px;">
        ${summaryTotals
          .map(
            (st) =>
              `<div><span style="font-size: 10px; color: #475569; text-transform: uppercase; font-weight: bold;">${st.label}:</span> <span style="font-family: monospace; font-size: 13px; font-weight: 800; color: #1e3a8a;">${st.isCurrency ? formatINR(Number(st.value) || 0) : st.value}</span></div>`
          )
          .join('')}
      </div>
    `;
  }

  // Create isolated iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${meta.title} - ${BUSINESS_INFO.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background: #1e3a8a !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            padding: 7px 8px;
            border: 1px solid #1e3a8a;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .header-banner {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .business-title {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #1e3a8a;
          }
          .report-title {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .meta-text {
            font-size: 10px;
            color: #475569;
            margin-top: 2px;
          }
          .footer-note {
            margin-top: 18px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 6px;
            font-size: 9px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <!-- Header Banner -->
        <div class="header-banner">
          <div>
            <div class="business-title">${BUSINESS_INFO.name}</div>
            <div class="report-title">${meta.title}</div>
            <div class="meta-text">
              <strong>Location:</strong> ${meta.locationName || 'All Locations'} &nbsp;•&nbsp; 
              <strong>Date Range:</strong> ${meta.dateRange || 'All Time'}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; font-weight: 600; color: #1e3a8a;">CONFIDENTIAL REPORT</div>
            <div class="meta-text">Generated: ${generatedTime}</div>
            <div class="meta-text">${BUSINESS_INFO.address.split(',')[0]}</div>
          </div>
        </div>

        <!-- Data Table -->
        <table>
          <thead>
            <tr>
              ${columns
                .map(
                  (c) =>
                    `<th style="text-align: ${c.isCurrency ? 'right' : 'left'};">${c.label}</th>`
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- Summary Totals -->
        ${summaryHtml}

        <div class="footer-note">
          Generated from ${BUSINESS_INFO.name} SaaS ERP System • Page 1 of 1
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print report failed:', e);
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 3000);
    }
  }, 250);
}
