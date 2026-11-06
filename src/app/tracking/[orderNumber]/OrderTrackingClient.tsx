'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { CheckCircle2, Clock, ArrowLeft, AlertCircle, Building2 } from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { ALL_STAGES, WorkflowStageKey, normalizeWorkflowStages } from '@/lib/workflow';

interface OrderItem {
  itemName?: string;
  serviceName?: string;
  qty?: number;
  unitPrice?: number;
  subtotal: number;
  // Legacy
  typeName?: string;
  kilo?: number;
  unit?: string;
}

interface OrderTrackingData {
  orderNumber: string;
  customerName: string;
  locationName?: string;
  orderItems?: OrderItem[];
  items?: OrderItem[];
  total: number;
  amountPaid: number;
  balance?: number;
  status: WorkflowStageKey;
  activeWorkflowSteps?: WorkflowStageKey[];
  expectedDeliveryDate?: string;
  timeline: Record<string, string>;
  createdAt: string;
}

export default function OrderTrackingClient({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNumber) return;
    fetch(`/api/tracking/${orderNumber}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setError(data.message || 'Order not found');
        }
      })
      .catch(() => setError('Failed to load tracking data'))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const activeSteps = normalizeWorkflowStages(order?.activeWorkflowSteps);
  const effectiveStatus = (order?.status === 'washing' || order?.status === 'drying') ? 'washing_drying' : order?.status;
  const currentIdx = effectiveStatus ? activeSteps.indexOf(effectiveStatus) : 0;
  const displayItems = order?.orderItems && order.orderItems.length > 0 ? order.orderItems : (order?.items || []);
  const balance = order?.balance !== undefined ? order.balance : (order ? Math.max(0, order.total - order.amountPaid) : 0);

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <Link
            href="/tracking"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search Another Order</span>
          </Link>
          <span className="text-xs font-mono font-bold text-blue-600">
            #{orderNumber?.toUpperCase()}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching real-time laundry status...</span>
          </div>
        ) : error || !order ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-base">Invalid or Expired Tracking Link</h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {error || 'This tracking link is invalid or has expired. Please contact the laundry store for assistance.'}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => {
                  setLoading(true);
                  setError('');
                  fetch(`/api/tracking/${orderNumber}`)
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.success && data.order) {
                        setOrder(data.order);
                      } else {
                        setError(data.message || 'This tracking link is invalid or has expired. Please contact the laundry store for assistance.');
                      }
                    })
                    .catch(() => setError('Failed to load tracking data. Please check your internet connection.'))
                    .finally(() => setLoading(false));
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Retry
              </button>
              <Link
                href="/tracking"
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                Search Another Order
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header Status Card */}
            <div className="text-center p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 space-y-2">
              <span className="text-3xl">🧺</span>
              <h2 className="text-xl font-black text-slate-900">
                {order.customerName}&apos;s Laundry
              </h2>
              {order.locationName && (
                <p className="text-xs text-slate-500 flex items-center justify-center space-x-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{order.locationName}</span>
                </p>
              )}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wide shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>Station: {ALL_STAGES[order.status]?.label || order.status}</span>
              </div>
            </div>

            {/* Stepper Timeline (Dynamic service-based stages) */}
            <div className="py-3 space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Processing Pipeline</h4>
              <div className="space-y-3.5">
                {activeSteps.map((stepKey, idx) => {
                  const stageInfo = ALL_STAGES[stepKey] || { label: stepKey, icon: '📋' };
                  const isCompleted = currentIdx !== -1 && idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={stepKey} className="flex items-center space-x-4">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110 shadow-md'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stageInfo.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-bold ${
                            isCurrent
                              ? 'text-blue-600'
                              : isCompleted
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {stageInfo.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isCurrent
                            ? 'Currently in progress at this station'
                            : isCompleted
                            ? 'Completed'
                            : 'Upcoming step'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Garment Details & Financials */}
            <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Order Summary</h4>
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {displayItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                    <span>
                      {item.itemName || item.typeName}{' '}
                      <span className="text-slate-400">
                        ({item.serviceName || item.unit} {item.qty ? `× ${item.qty}` : ''})
                      </span>
                    </span>
                    <span className="font-mono font-semibold">{formatINR(item.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Amount:</span>
                  <span className="font-mono text-blue-600">{formatINR(order.total)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Amount Paid:</span>
                  <span className="font-mono text-emerald-600 font-semibold">{formatINR(order.amountPaid)}</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Pending at Collection:</span>
                    <span className="font-mono">{formatINR(balance)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="pt-2 flex flex-col items-center justify-center border-t border-slate-100">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.href : ''}
                size={90}
                level="M"
              />
              <p className="text-[10px] text-slate-400 mt-1">Bookmark or refresh for real-time updates</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
