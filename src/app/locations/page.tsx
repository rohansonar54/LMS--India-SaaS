'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Pagination from '@/components/Pagination';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Users,
  Shield,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';

interface LocationItem {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email?: string;
  active: boolean;
  staffCount?: number;
  staffNames?: string[];
  createdAt: string;
}

interface StaffOption {
  _id: string;
  name: string;
  username: string;
  locationId?: string;
}

export default function LocationsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Nashik');
  const [state, setState] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLocations = () => {
    setLoading(true);
    fetch(`/api/locations?includeInactive=true&search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLocations(data.locations || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchStaff = () => {
    fetch('/api/staff')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStaffList(data.staff || []);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLocations();
    fetchStaff();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingLoc(null);
    setName('');
    setCode('');
    setAddress('');
    setCity('Nashik');
    setState('Maharashtra');
    setCountry('India');
    setPincode('');
    setPhone('');
    setEmail('');
    setActive(true);
    setSelectedStaffIds([]);
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (loc: LocationItem) => {
    setEditingLoc(loc);
    setName(loc.name);
    setCode(loc.code);
    setAddress(loc.address || '');
    setCity(loc.city || 'Nashik');
    setState(loc.state || 'Maharashtra');
    setCountry(loc.country || 'India');
    setPincode(loc.pincode || '');
    setPhone(loc.phone || '');
    setEmail(loc.email || '');
    setActive(loc.active);

    // Populate currently assigned staff
    const assigned = staffList
      .filter((s) => s.locationId?.toString() === loc._id.toString())
      .map((s) => s._id);
    setSelectedStaffIds(assigned);
    setFormError('');
    setShowModal(true);
  };

  const handleToggleActive = async (loc: LocationItem) => {
    try {
      const res = await fetch('/api/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loc._id,
          active: !loc.active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLocations();
      } else {
        alert(data.message || 'Error updating status');
      }
    } catch {
      alert('Network error while toggling location status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormError('Location Name and Code are mandatory.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const isEdit = Boolean(editingLoc);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        active,
        assignedStaffIds: selectedStaffIds,
      };

      if (isEdit) {
        payload.id = editingLoc?._id;
      }

      const res = await fetch('/api/locations', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchLocations();
        fetchStaff();
      } else {
        setFormError(data.message || 'Error saving location.');
      }
    } catch {
      setFormError('Network connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLocations = locations.filter((l) => {
    if (statusFilter === 'active') return l.active;
    if (statusFilter === 'inactive') return !l.active;
    return true;
  });

  const totalStaffCount = locations.reduce((s, l) => s + (l.staffCount || 0), 0);
  const activeLocationsCount = locations.filter((l) => l.active).length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="Location Management"
          subtitle="Multi-Branch Network, Outlets & Staff Allocation"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outlets</p>
                <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{locations.length}</h3>
                <p className="text-xs text-blue-600 font-medium mt-0.5">Configured branches</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Branches</p>
                <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">{activeLocationsCount}</h3>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">Accepting POS orders</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive Outlets</p>
                <h3 className="text-2xl font-black text-slate-400 font-mono mt-1">
                  {locations.length - activeLocationsCount}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Decommissioned/Paused</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Staff</p>
                <h3 className="text-2xl font-black text-indigo-600 font-mono mt-1">{totalStaffCount}</h3>
                <p className="text-xs text-indigo-600 font-medium mt-0.5">Operators across network</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Bar & Search */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search location by name, code, city, phone..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button
                  onClick={fetchLocations}
                  className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Location</span>
              </button>
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs flex flex-col items-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span>Loading branch locations...</span>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No locations found</p>
                <p className="text-xs mt-0.5">Click &quot;Add New Location&quot; to register your laundry outlet.</p>
              </div>
            ) : (
              filteredLocations
                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                .map((loc) => (
                <div
                  key={loc._id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition hover:shadow-md space-y-4 flex flex-col justify-between ${
                    loc.active ? 'border-slate-200' : 'border-slate-300 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name, Code & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{loc.name}</h4>
                          <span className="font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-black text-[10px] border border-blue-200">
                            {loc.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {loc.city}, {loc.state} {loc.pincode ? `• ${loc.pincode}` : ''}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          loc.active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {loc.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Address & Contact Details */}
                    <div className="p-3 rounded-2xl bg-slate-50 text-xs space-y-1.5 border border-slate-100">
                      <div className="flex items-start space-x-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] break-words">{loc.address || 'Address not configured'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-mono">{loc.phone || 'Phone not set'}</span>
                      </div>
                      {loc.email && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] truncate">{loc.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Assigned Staff */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Staff Members ({loc.staffCount || 0})</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {loc.staffNames && loc.staffNames.length > 0 ? (
                          loc.staffNames.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No staff assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(loc)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                        loc.active
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {loc.active ? 'Deactivate' : 'Activate Branch'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(loc)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Outlet</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && filteredLocations.length > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredLocations.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                label="locations"
              />
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingLoc ? 'Edit Branch Location' : 'Register New Location'}
                </h3>
                <p className="text-xs text-slate-500">Configure outlet branch name, code, contact & staff</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shyam Laundrywala Satpur"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Location Code (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SL-SAT"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shivaji Nagar, Satpur, Near Main Market"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    placeholder="422007"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 8390294295"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. satpur@lms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Assign Staff Members */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Assign Staff Members to this Location
                </label>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 max-h-36 overflow-y-auto space-y-1.5">
                  {staffList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No staff users found.</p>
                  ) : (
                    staffList.map((s) => {
                      const isChecked = selectedStaffIds.includes(s._id);
                      return (
                        <label
                          key={s._id}
                          className="flex items-center space-x-2 text-xs cursor-pointer select-none hover:bg-white p-1 rounded-lg transition"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStaffIds([...selectedStaffIds, s._id]);
                              } else {
                                setSelectedStaffIds(selectedStaffIds.filter((id) => id !== s._id));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-blue-600 rounded"
                          />
                          <span className="font-semibold text-slate-800">{s.name}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({s.username})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-xs font-bold text-slate-700">Location is Active for POS Operations</span>
              </label>

              <div className="flex items-center space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingLoc ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

