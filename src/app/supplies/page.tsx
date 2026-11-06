'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { formatINR } from '@/lib/currency';
import { Package, Plus, ArrowDownLeft, ArrowUpRight, AlertTriangle, Trash2, Building2 } from 'lucide-react';

interface Supply {
  _id: string;
  name: string;
  unit: string;
  stock: number;
  cost: number;
  locationName?: string;
}

export default function SuppliesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAction, setAdjustAction] = useState<'stock-in' | 'stock-out'>('stock-in');
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustNote, setAdjustNote] = useState('');

  // Add Item Inputs
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [stock, setStock] = useState('100');
  const [cost, setCost] = useState('12');

  const fetchSupplies = () => {
    setLoading(true);
    fetch('/api/supplies')
      .then((res) => res.json())
      .then((data) => setSupplies(data.supplies || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const handleOpenAdjust = (supply: Supply, action: 'stock-in' | 'stock-out') => {
    setSelectedSupply(supply);
    setAdjustAction(action);
    setAdjustQty('10');
    setAdjustNote('');
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupply) return;

    const res = await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: adjustAction,
        id: selectedSupply._id,
        quantity: Number(adjustQty),
        note: adjustNote,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setShowAdjustModal(false);
      fetchSupplies();
    } else {
      alert(data.message || 'Error updating stock');
    }
  };

  const handleCreateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const res = await fetch('/api/supplies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, unit, stock: Number(stock), cost: Number(cost) }),
    });

    const data = await res.json();
    if (data.success) {
      setShowAddModal(false);
      setName('');
      setStock('100');
      setCost('12');
      fetchSupplies();
    } else {
      alert(data.message || 'Error creating supply');
    }
  };

  const handleDelete = async (id: string, supplyName: string) => {
    if (!confirm(`Are you sure you want to delete ${supplyName}?`)) return;

    const res = await fetch(`/api/supplies?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchSupplies();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Consumables & Inventory"
          subtitle="Detergents, Softeners, Poly Bags & Supplies (₹)"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Header Action Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Branch Consumables Stock</h3>
              <p className="text-xs text-slate-500">Track and restock inventory consumed during laundry operations</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Inventory Item</span>
            </button>
          </div>

          {/* Supplies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supplies
              .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              .map((s) => {
              const isLow = s.stock < 20;
              return (
                <div
                  key={s._id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs transition space-y-3 ${
                    isLow ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                      <Package className="w-5 h-5" />
                    </div>
                    {isLow && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">Cost: {formatINR(s.cost)} / {s.unit}</p>
                    {s.locationName && (
                      <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        <span>{s.locationName}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-1 flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Available:</span>
                    <span className="font-mono font-black text-2xl text-slate-900">
                      {s.stock} <span className="text-xs font-normal text-slate-500">{s.unit}</span>
                    </span>
                  </div>

                  {/* Stock In / Out Buttons */}
                  <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenAdjust(s, 'stock-in')}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center space-x-1 transition"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Stock In</span>
                    </button>
                    <button
                      onClick={() => handleOpenAdjust(s, 'stock-out')}
                      className="flex-1 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center justify-center space-x-1 transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Deduct</span>
                    </button>
                    <button
                      onClick={() => handleDelete(s._id, s.name)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {!loading && supplies.length > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
              <Pagination
                currentPage={currentPage}
                totalItems={supplies.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                label="supplies"
              />
            </div>
          )}
        </main>
      </div>

      {/* Add Supply Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Add New Supply Item</h3>
              <p className="text-xs text-slate-500">Register new consumable inventory</p>
            </div>

            <form onSubmit={handleCreateSupply} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liquid Detergent (Jasmine)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="pcs / scoop / cap"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cost per Unit (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedSupply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {adjustAction === 'stock-in' ? 'Restock (Stock In)' : 'Deduct (Stock Out)'}
              </h3>
              <p className="text-xs text-slate-500">{selectedSupply.name}</p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Quantity ({selectedSupply.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold font-mono text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly shipment received"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm ${
                    adjustAction === 'stock-in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {adjustAction === 'stock-in' ? 'Restock' : 'Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
