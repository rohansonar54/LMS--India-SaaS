'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { formatINR } from '@/lib/currency';
import { Users, Plus, Search, Edit2, Trash2, Phone, MapPin, Building2, Wallet } from 'lucide-react';

interface Customer {
  _id: string;
  fullname: string;
  address: string;
  contact: string;
  locationName?: string;
  outstandingBalance?: number;
  createdAt: string;
}

export default function CustomersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullname, setFullname] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');

  const fetchCustomers = () => {
    setLoading(true);
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFullname('');
    setContact('');
    setAddress('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c._id);
    setFullname(c.fullname);
    setContact(c.contact);
    setAddress(c.address);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname || !contact) return;

    const method = editingId ? 'PUT' : 'POST';
    const body = editingId
      ? { id: editingId, fullname, address, contact }
      : { fullname, address, contact };

    const res = await fetch('/api/customers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      setShowModal(false);
      fetchCustomers();
    } else {
      alert(data.message || 'Error saving customer');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchCustomers();
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.fullname.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Customer Directory"
          subtitle="Directory & Ledger of Registered Clients across Hubs"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Header Action Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, phone, address..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Customer</span>
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Branch Location</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Outstanding (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading customers...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No customers found.</td>
                    </tr>
                  ) : (
                    filtered
                      .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                      .map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{c.fullname}</td>
                          <td className="py-3 px-4 font-mono text-slate-700 font-medium">{c.contact}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              <Building2 className="w-3 h-3" />
                              <span>{c.locationName || 'Central Branch'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{c.address || '-'}</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {c.outstandingBalance ? (
                              <span className="text-rose-600">{formatINR(c.outstandingBalance)}</span>
                            ) : (
                              <span className="text-emerald-600">₹0 (Clear)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(c._id, c.fullname)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && filtered.length > 0 && (
              <div className="p-4 bg-slate-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  label="customers"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Customer Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-slate-500">Enter client contact details and address</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9820011223"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Address / Flat Details</label>
                <input
                  type="text"
                  placeholder="e.g. Apt 4B, Green Acres"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
