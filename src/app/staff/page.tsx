'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import { Shield, Plus, Trash2, Pencil, Key, User, Building2, Check, AlertCircle } from 'lucide-react';

interface StaffUser {
  _id: string;
  username: string;
  name: string;
  level: number;
  locationId?: string;
  locationName?: string;
  createdAt: string;
}

interface LocationOption {
  _id: string;
  name: string;
  code: string;
}

export default function StaffPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, locRes] = await Promise.all([
        fetch('/api/staff').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
      ]);

      if (staffRes.success) setStaffList(staffRes.staff || []);
      if (locRes.success) {
        setLocations(locRes.locations || []);
        if (locRes.locations?.length > 0 && !selectedLocationId) {
          setSelectedLocationId(locRes.locations[0]._id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setUsername('');
    setName('');
    setPassword('');
    setSelectedLevel(1);
    setSelectedLocationId(locations.length > 0 ? locations[0]._id : '');
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setUsername(staff.username);
    setName(staff.name);
    setPassword(''); // Leave blank to keep existing password
    setSelectedLevel(staff.level ?? 1);
    setSelectedLocationId(staff.locationId || (locations.length > 0 ? locations[0]._id : ''));
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !username.trim()) {
      setFormError('Staff name and username are required.');
      return;
    }

    if (!editingStaff && !password) {
      setFormError('Password is required for new staff accounts.');
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingStaff) {
        // UPDATE STAFF (PUT)
        const res = await fetch('/api/staff', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingStaff._id,
            username: username.trim(),
            name: name.trim(),
            password: password ? password.trim() : undefined,
            level: Number(selectedLevel),
            locationId: selectedLocationId || null,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          setFormError(data.message || 'Error updating staff account.');
        }
      } else {
        // CREATE STAFF (POST)
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            name: name.trim(),
            password: password.trim(),
            level: Number(selectedLevel),
            locationId: selectedLocationId || null,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          setFormError(data.message || 'Error creating staff account.');
        }
      }
    } catch {
      setFormError('Failed to communicate with server. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete staff account "${staffName}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert(data.message || 'Failed to delete staff account.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Staff Management"
          subtitle="Branch Staff Accounts & Multi-Location Role Assignment"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Header Action Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Branch Staff Accounts</h3>
              <p className="text-xs text-slate-500">
                Create, update credentials, change passwords, and assign branch locations to staff members.
              </p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Assigned Location</th>
                    <th className="py-3 px-4">Role Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Loading staff records...</td>
                    </tr>
                  ) : staffList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No staff members found.</td>
                    </tr>
                  ) : (
                    staffList
                      .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                      .map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {s.name?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <span className="truncate">{s.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{s.username}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                              <Building2 className="w-3 h-3" />
                              <span>{s.locationName || 'All Locations (Global)'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              s.level === 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.level === 0 ? 'Admin' : 'Front Desk Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenEditModal(s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Edit Staff Details & Password"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(s._id, s.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Staff Account"
                              >
                                <Trash2 className="w-4 h-4" />
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
            {!loading && staffList.length > 0 && (
              <div className="p-4 bg-slate-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalItems={staffList.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  label="staff members"
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {editingStaff ? 'Update Staff Account' : 'Register New Staff'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingStaff
                  ? `Update name, username, credentials, or branch assignment for ${editingStaff.name}`
                  : 'Create login credentials and assign branch location'}
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_mumbai"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Password {editingStaff ? <span className="text-slate-400 font-normal">(Leave blank to keep existing)</span> : '*'}
                </label>
                <input
                  type="password"
                  placeholder={editingStaff ? 'Enter new password or leave blank' : 'Min 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editingStaff && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Only type a new password if you wish to reset or change this staff member&apos;s password.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Role Level *</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Front Desk Staff (Level 1)</option>
                    <option value={0}>Super Admin (Level 0)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Branch Location *</label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Locations (Global)</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingStaff
                    ? 'Save Changes'
                    : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
