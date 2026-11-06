'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, MessageCircle, X, Tag } from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { BUSINESS_INFO } from '@/lib/business-config';
import { LaundryLogo } from '@/components/LaundryLogo';

interface ReceiptOrderItem {
  itemName?: string;
  serviceName?: string;
  qty?: number;
  unitPrice?: number;
  subtotal: number;
  // Legacy support
  typeName?: string;
  unit?: string;
  kilo?: number;
  pricePerUnit?: number;
}

export interface ReceiptOrder {
  _id?: string;
  orderNumber: string;
  trackingToken?: string;
  customerName: string;
  customerContact?: string;
  customerAddress?: string;
  staffName?: string;
  locationName?: string;
  orderItems?: ReceiptOrderItem[];
  items?: ReceiptOrderItem[]; // legacy
  subtotal?: number;
  additionalCharges?: number;
  discount?: number;
  total: number;
  amountPaid: number;
  balance?: number;
  change?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  status: string;
  expectedDeliveryDate?: string | Date;
  createdAt: string | Date;
}

type PrintFormat = '58mm' | '80mm' | 'a4';

interface ReceiptModalProps {
  order: ReceiptOrder | null;
  onClose: () => void;
}

const PRINT_FORMAT_KEY = 'lms_print_format';

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  const [printFormat, setPrintFormat] = useState<PrintFormat>('80mm');
  const [includeBasketTag, setIncludeBasketTag] = useState(true);
  const printableRef = useRef<HTMLDivElement>(null);

  // Load persisted format preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PRINT_FORMAT_KEY) as PrintFormat | null;
      if (saved && ['58mm', '80mm', 'a4'].includes(saved)) {
        setPrintFormat(saved);
      }
    }
  }, []);

  if (!order) return null;

  const trackingIdentifier = order.trackingToken || order.orderNumber;
  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tracking/${trackingIdentifier}`
      : `/tracking/${trackingIdentifier}`;

  const remainingBalance =
    order.balance !== undefined ? order.balance : Math.max(0, order.total - order.amountPaid);

  // Determine item list
  const displayItems =
    order.orderItems && order.orderItems.length > 0 ? order.orderItems : order.items || [];

  const totalQty = displayItems.reduce((s, i) => s + (i.qty || 1), 0);

  const handleChangePrintFormat = (fmt: PrintFormat) => {
    setPrintFormat(fmt);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRINT_FORMAT_KEY, fmt);
    }
  };

  /**
   * Dedicated Iframe Printing
   * Completely isolates the print document from Next.js root, Tailwind, and flex containers.
   * Renders crisp pure black text with balanced typography, clean hierarchy, and ZERO top blank space.
   */
  const handlePrint = () => {
    if (!printableRef.current) return;

    const isThermal = printFormat === '58mm' || printFormat === '80mm';

    const formats: Record<PrintFormat, { width: string; bodyWidth: string; fontSize: string }> = {
      '58mm': { width: '58mm', bodyWidth: '54mm', fontSize: '10px' },
      '80mm': { width: '80mm', bodyWidth: '74mm', fontSize: '11px' },
      a4: { width: '210mm', bodyWidth: '180mm', fontSize: '13px' },
    };
    const fmt = formats[printFormat];

    const contentHtml = printableRef.current.innerHTML;

    // Create a hidden iframe
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
          <title>Receipt #${order.orderNumber}</title>
          <style>
            @page {
              size: ${fmt.width} auto;
              margin: ${isThermal ? '0' : '10mm'};
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
              font-size: ${fmt.fontSize};
              line-height: 1.35;
            }
            body {
              width: ${fmt.bodyWidth};
              max-width: 100%;
              margin: 0 auto !important;
              padding: ${isThermal ? '0 2mm !important' : '0'};
            }
            /* Eliminate any top blank space before the logo */
            .receipt-section, .business-header, .receipt-logo {
              margin-top: 0 !important;
              padding-top: 0 !important;
            }
            .receipt-logo {
              line-height: 1 !important;
              margin-bottom: 2px !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              color: #000000 !important;
            }
            .dashed-divider {
              border-top: 1px dashed #000000 !important;
              margin: 5px 0 !important;
            }
            .basket-divider {
              border-top: 1px dashed #000000 !important;
              margin: 6px 0 5px 0 !important;
            }
            .basket-tag-badge {
              display: inline-block !important;
              background: #000000 !important;
              color: #ffffff !important;
              -webkit-text-fill-color: #ffffff !important;
              border: 1px solid #000000 !important;
            }
            .receipt-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .basket-tag-section {
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-before: avoid;
              break-before: avoid;
            }
            svg {
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print once iframe parses HTML and SVG elements
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print failed:', err);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }
    }, 250);
  };

  const handleWhatsApp = () => {
    if (!order.customerContact) {
      alert('Customer mobile number is not available.');
      return;
    }
    const cleanPhone = order.customerContact.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Invalid mobile number.');
      return;
    }
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const orderItemsList = order.orderItems || order.items || [];
    const totalItemsCount = orderItemsList.reduce((sum, item) => sum + (item.qty || item.kilo || 1), 0);
    const itemNames = orderItemsList
      .slice(0, 3)
      .map((item) => `${item.itemName || item.typeName || 'Garment'} (x${item.qty || item.kilo || 1})`)
      .join(', ');
    const itemsSummary = orderItemsList.length > 3 ? `${itemNames} +${orderItemsList.length - 3} more` : itemNames;

    const orderDateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const deliveryDateStr = order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

    let paymentSummary = `• *Total Bill:* ${formatINR(order.total)}\n`;
    if (order.amountPaid > 0) {
      paymentSummary += `• *Advance Paid:* ${formatINR(order.amountPaid)}${order.paymentMethod ? ` (${order.paymentMethod.toUpperCase()})` : ''}\n`;
    }
    if (remainingBalance > 0) {
      paymentSummary += `• *Balance Due:* ⚠️ ${formatINR(remainingBalance)}`;
    } else {
      paymentSummary += `• *Payment Status:* ✅ Paid in Full`;
    }

    const messageLines = [
      `🧺 *${BUSINESS_INFO.name.toUpperCase()}*`,
      `_${BUSINESS_INFO.tagline}_`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Namaste *${order.customerName}*! 🙏`,
      `Your laundry order has been booked successfully.\n`,
      `📋 *Order Details:*`,
      `• *Order #:* #${order.orderNumber}`,
      `• *Date:* ${orderDateStr}`,
      totalItemsCount > 0 ? `• *Items (${totalItemsCount} pcs):* ${itemsSummary}` : '',
      deliveryDateStr ? `• *Expected Delivery:* ${deliveryDateStr}` : '',
      `\n💰 *Bill Summary:*`,
      paymentSummary,
      `\n📍 *Live Order Tracking:*`,
      `Track your order live anytime:`,
      `${trackingUrl}`,
      `\n━━━━━━━━━━━━━━━━━━━━`,
      BUSINESS_INFO.phone ? `📞 *Helpline:* ${BUSINESS_INFO.phone}` : '',
      `_Thank you for choosing ${BUSINESS_INFO.name}!_ ✨`,
    ]
      .filter(Boolean)
      .join('\n');

    const message = encodeURIComponent(messageLines);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  // QR size by format
  const qrSize = printFormat === '58mm' ? 68 : printFormat === '80mm' ? 82 : 100;
  const qrSizeSmall = printFormat === '58mm' ? 50 : 60;

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  const timeStr = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Tax Invoice & Order Receipt</h3>
            <p className="text-xs text-slate-500 font-mono">#{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Format Selector */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Format:</span>
              <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden text-[11px] font-bold">
                {(['58mm', '80mm', 'a4'] as PrintFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleChangePrintFormat(fmt)}
                    className={`px-3 py-1 transition ${
                      printFormat === fmt
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {fmt === 'a4' ? 'A4 Invoice' : `${fmt} Thermal`}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBasketTag}
                onChange={(e) => setIncludeBasketTag(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500 rounded"
              />
              <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                <Tag className="w-3 h-3 text-amber-500" />
                <span>Basket Tag</span>
              </span>
            </label>
          </div>
        </div>

        {/* Scrollable Receipt Preview (What you see is exactly what prints) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/70">
          <div
            ref={printableRef}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mx-auto text-slate-900"
            style={{
              maxWidth: printFormat === '58mm' ? '280px' : printFormat === '80mm' ? '360px' : '100%',
              fontSize: printFormat === '58mm' ? '10px' : '11px',
            }}
          >
            {/* ── MAIN RECEIPT ── */}
            <div className="receipt-section" style={{ marginTop: 0, paddingTop: 0 }}>
              {/* Business Header */}
              <div className="business-header" style={{ textAlign: 'center', marginBottom: '4px', marginTop: 0, paddingTop: 0 }}>
                <div className="receipt-logo" style={{ lineHeight: 1, margin: '0 0 3px 0', padding: 0 }}>
                  <LaundryLogo size={printFormat === '58mm' ? 32 : printFormat === '80mm' ? 36 : 42} />
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '1px',
                  color: '#000000',
                }}>
                  {BUSINESS_INFO.name}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: '#000000', marginTop: '1px' }}>
                  {order.locationName || BUSINESS_INFO.address}
                </div>
                <div style={{ fontSize: '10px', color: '#000000', fontWeight: 500, marginTop: '1px' }}>
                  Phone: {BUSINESS_INFO.phone}
                </div>
              </div>

              <div className="dashed-divider" />

              <div style={{ textAlign: 'center', margin: '3px 0' }}>
                <div style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>
                  TAX INVOICE & CASH RECEIPT
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#000000', fontSize: '12px', marginTop: '1px' }}>
                  Order #{order.orderNumber}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 500, color: '#000000', marginTop: '1px' }}>
                  {dateStr} · {timeStr}
                </div>
              </div>

              <div className="dashed-divider" />

              {/* Customer Details */}
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '3px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0', width: '36%' }}>Customer:</td>
                    <td style={{ fontWeight: 700, textAlign: 'right', color: '#000000' }}>{order.customerName}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Contact:</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#000000' }}>
                      {order.customerContact || 'N/A'}
                    </td>
                  </tr>
                  {order.customerAddress && (
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Address:</td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: '#000000' }}>{order.customerAddress}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Attendant:</td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#000000' }}>{order.staffName || 'Staff'}</td>
                  </tr>
                  {order.expectedDeliveryDate && (
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 600, padding: '1px 0' }}>Est. Delivery:</td>
                      <td style={{ textAlign: 'right', color: '#000000', fontWeight: 600 }}>
                        {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="dashed-divider" />

              {/* Itemized Table */}
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '3px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000000', color: '#000000' }}>
                    <th style={{ textAlign: 'left', padding: '2px 0', fontWeight: 700, color: '#000000' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '2px 0', fontWeight: 700, width: '28px', color: '#000000' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 700, color: '#000000' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => {
                    const name = item.itemName || item.typeName || 'Laundry Item';
                    const service = item.serviceName || (item.unit ? `${item.kilo} ${item.unit}` : '');
                    return (
                      <tr key={idx} style={{ borderBottom: '1px dashed #000000' }}>
                        <td style={{ padding: '2px 0' }}>
                          <div style={{ fontWeight: 600, color: '#000000', fontSize: '11px' }}>{name}</div>
                          {service && (
                            <div style={{ color: '#000000', fontSize: '9.5px', fontWeight: 400 }}>
                              {service} {item.unitPrice ? `@ ${formatINR(item.unitPrice)}` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 500, fontSize: '11px', padding: '2px 0', color: '#000000' }}>
                          {item.qty || 1}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, fontSize: '11px', padding: '2px 0', color: '#000000' }}>
                          {formatINR(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="dashed-divider" />

              {/* Financial Totals */}
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '4px' }}>
                <tbody>
                  {order.subtotal !== undefined && order.subtotal !== order.total && (
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Subtotal:</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#000000' }}>
                        {formatINR(order.subtotal)}
                      </td>
                    </tr>
                  )}
                  {!!order.additionalCharges && (
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Add-on Charges:</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#000000' }}>
                        +{formatINR(order.additionalCharges)}
                      </td>
                    </tr>
                  )}
                  {!!order.discount && (
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Discount:</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#000000' }}>
                        -{formatINR(order.discount)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '1px solid #000000' }}>
                    <td style={{ fontWeight: 700, fontSize: '13px', padding: '3px 0 1px 0', color: '#000000' }}>
                      TOTAL AMOUNT:
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      color: '#000000',
                      padding: '3px 0 1px 0',
                    }}>
                      {formatINR(order.total)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0' }}>Amount Paid:</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', padding: '1px 0', color: '#000000', fontWeight: 600, fontSize: '11px' }}>
                      {formatINR(order.amountPaid)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{
                      fontWeight: 700,
                      padding: '1px 0',
                      color: '#000000',
                      fontSize: '11.5px',
                    }}>
                      Outstanding Balance:
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '1px 0',
                      color: '#000000',
                      fontSize: '12px',
                    }}>
                      {remainingBalance > 0 ? formatINR(remainingBalance) : '₹0 (PAID)'}
                    </td>
                  </tr>
                  {order.paymentMethod && (
                    <tr>
                      <td style={{ color: '#000000', fontSize: '10px', fontWeight: 500, padding: '1px 0' }}>Payment Mode:</td>
                      <td style={{ textAlign: 'right', fontSize: '10px', padding: '1px 0', fontWeight: 500, color: '#000000' }}>
                        {order.paymentMethod}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="dashed-divider" />

              {/* Scannable Tracking QR Code */}
              <div style={{ textAlign: 'center', margin: '4px 0 2px 0' }}>
                <QRCodeSVG value={trackingUrl} size={qrSize} level="M" fgColor="#000000" bgColor="#ffffff" />
                <div style={{ fontSize: '9.5px', color: '#000000', marginTop: '3px', fontWeight: 500 }}>
                  Scan with smartphone camera to track live status
                </div>
                <div style={{ fontSize: '10px', color: '#000000', marginTop: '2px', fontWeight: 600 }}>
                  Thank you for visiting {BUSINESS_INFO.name}!
                </div>
              </div>
            </div>

            {/* ── BASKET TAG (Optional) ── */}
            {includeBasketTag && (
              <div className="basket-tag-section">
                <div className="basket-divider" />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '3px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      className="basket-tag-badge"
                      style={{
                        display: 'inline-block',
                        border: '1px solid #000000',
                        background: '#000000',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '9.5px',
                        padding: '1.5px 5px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                      }}
                    >
                      BASKET TAG
                    </span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      color: '#000000',
                    }}>
                      #{order.orderNumber}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000' }}>
                    {order.customerName}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ fontSize: '10px', lineHeight: '1.35' }}>
                    <div style={{ color: '#000000', fontWeight: 500 }}>
                      Total Clothes: <strong style={{ fontWeight: 700 }}>{totalQty} items</strong>
                    </div>
                    <div style={{ color: '#000000', fontWeight: 500 }}>
                      Status:{' '}
                      <strong style={{ fontWeight: 700 }}>
                        {remainingBalance > 0 ? `Due ${formatINR(remainingBalance)}` : 'Fully Paid'}
                      </strong>
                    </div>
                    <div style={{ color: '#000000', fontSize: '9.5px', fontWeight: 500 }}>{dateStr}</div>
                    <div style={{ color: '#000000', fontSize: '9.5px', fontWeight: 500 }}>
                      {order.locationName || BUSINESS_INFO.name}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px',
                    background: '#ffffff',
                    border: '1px solid #000000',
                    borderRadius: '4px',
                  }}>
                    <QRCodeSVG value={trackingUrl} size={qrSizeSmall} level="L" fgColor="#000000" bgColor="#ffffff" />
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #000000', margin: '4px 0 2px 0' }} />
                <div style={{ fontSize: '9px', textAlign: 'center', color: '#000000', fontWeight: 500 }}>
                  ✂ Cut here — Attach tag directly to laundry basket
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          {order.customerContact ? (
            <button
              onClick={handleWhatsApp}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shrink-0 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print ({printFormat.toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
