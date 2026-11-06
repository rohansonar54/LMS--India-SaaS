'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReceiptOrder } from '@/components/ReceiptModal';
import { formatINR } from '@/lib/currency';
import {
  Plus,
  Trash2,
  Printer,
  UserPlus,
  Receipt,
  CheckCircle2,
  Package,
  Calendar,
  Wallet,
  Building2,
  Sparkles,
  Search,
  AlertCircle,
  X,
  Loader2,
  Phone,
} from 'lucide-react';

interface CustomerOption {
  _id: string;
  fullname: string;
  contact: string;
  address: string;
  outstandingBalance?: number;
}

interface ItemServiceRate {
  serviceName: string;
  price: number;
}

interface ClothingItemOption {
  _id: string;
  name: string;
  category: string;
  icon?: string;
  defaultService: string;
  services: ItemServiceRate[];
}

interface PricePackage {
  _id: string;
  name: string;
  unit: string;
  price: number;
}

interface ServiceOption {
  _id: string;
  name: string;
  code: string;
  defaultPrice: number;
  category: string;
  active: boolean;
}

interface OrderRowItem {
  id: string;
  itemName: string;
  serviceName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export default function TransactionsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingItemOption[]>([]);
  const [bulkPackages, setBulkPackages] = useState<PricePackage[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Dynamic Item Rows State
  const [itemRows, setItemRows] = useState<OrderRowItem[]>([
    {
      id: '1',
      itemName: 'Shirt / Formal Shirt',
      serviceName: 'Wash & Iron',
      qty: 2,
      unitPrice: 25,
      subtotal: 50,
    },
  ]);

  // Financial & Payment Adjustments
  const [additionalCharges, setAdditionalCharges] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Quick Customer Creation Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustContact, setNewCustContact] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [asyncCustMatch, setAsyncCustMatch] = useState<CustomerOption | null>(null);

  // Normalize phone helper
  const normalizeDigits = (str: string) => {
    const d = (str || '').replace(/\D/g, '');
    return d.length > 10 ? d.slice(-10) : d;
  };

  // Instant 0ms synchronous match from loaded customers
  const syncCustMatch = React.useMemo(() => {
    const inputDigits = normalizeDigits(newCustContact);
    if (inputDigits.length < 5) return null;
    return (
      customers.find((c) => {
        const cDigits = normalizeDigits(c.contact);
        return cDigits && (cDigits === inputDigits || (inputDigits.length >= 7 && cDigits.endsWith(inputDigits)));
      }) || null
    );
  }, [newCustContact, customers]);

  // Debounced server search fallback if customer is not in local cache
  useEffect(() => {
    const inputDigits = normalizeDigits(newCustContact);
    if (inputDigits.length < 10) {
      setAsyncCustMatch(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${inputDigits}`).then((r) => r.json());
        if (res.success && res.customers?.length > 0) {
          const found = res.customers.find((c: CustomerOption) => normalizeDigits(c.contact) === inputDigits);
          if (found) setAsyncCustMatch(found);
        }
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [newCustContact]);

  const existingCustMatch = syncCustMatch || asyncCustMatch;

  const handleUseExistingCustomer = (cust: CustomerOption) => {
    if (!customers.some((c) => c._id === cust._id)) {
      setCustomers((prev) => [cust, ...prev]);
    }
    setSelectedCustomerId(cust._id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustContact('');
    setNewCustAddress('');
    setAsyncCustMatch(null);
  };

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemService, setCustomItemService] = useState('Wash & Iron');
  const [customItemPrice, setCustomItemPrice] = useState('50');

  // Completed Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<ReceiptOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recent Orders List
  const [recentOrders, setRecentOrders] = useState<ReceiptOrder[]>([]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, itemsRes, ordersRes, pricesRes, servicesRes] = await Promise.all([
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/items').then((r) => r.json()),
        fetch('/api/orders?limit=10').then((r) => r.json()),
        fetch('/api/prices').then((r) => r.json()),
        fetch('/api/services?active=true').then((r) => r.json()),
      ]);

      if (custRes.success) {
        setCustomers(custRes.customers || []);
      }

      if (itemsRes.success) {
        setClothingItems(itemsRes.items || []);
      }

      if (pricesRes.success) {
        setBulkPackages(pricesRes.prices || []);
      }

      if (servicesRes.success) {
        setAvailableServices(servicesRes.services || []);
      }

      if (ordersRes.success) {
        setRecentOrders(ordersRes.orders || []);
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

  // Recalculate totals
  const subtotal = itemRows.reduce((sum, row) => sum + row.subtotal, 0);
  const parsedAddCharges = Math.max(0, Number(additionalCharges) || 0);
  const parsedDiscount = Math.max(0, Number(discount) || 0);
  const finalOrderAmount = Math.max(0, subtotal + parsedAddCharges - parsedDiscount);

  const parsedPaid = Math.max(0, Number(amountPaid) || 0);
  const change = Math.max(0, parsedPaid - finalOrderAmount);
  const actualPaidTowardsTotal = Math.min(parsedPaid, finalOrderAmount);
  const outstandingBalance = Math.max(0, finalOrderAmount - actualPaidTowardsTotal);

  // Selected customer object
  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId);

  // Filtered customer list for search
  const filteredCustomers = customers.filter(
    (c) =>
      c.fullname.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.contact.includes(customerSearch)
  );

  // Row Manipulation Handlers
  const handleAddItemRow = (defaultItem?: ClothingItemOption) => {
    const item = defaultItem || clothingItems[0];
    const defaultSvc = item?.services?.[0] || { serviceName: 'Wash & Iron', price: 25 };
    const newRow: OrderRowItem = {
      id: Date.now().toString() + Math.random().toString(),
      itemName: item?.name || 'Custom Garment',
      serviceName: defaultSvc.serviceName,
      qty: 1,
      unitPrice: defaultSvc.price,
      subtotal: defaultSvc.price,
    };
    setItemRows([...itemRows, newRow]);
  };

  const handleAddBulkPackageRow = (pkg: PricePackage) => {
    const newRow: OrderRowItem = {
      id: Date.now().toString() + Math.random().toString(),
      itemName: `${pkg.name} (${pkg.unit})`,
      serviceName: pkg.name,
      qty: 1,
      unitPrice: pkg.price,
      subtotal: pkg.price,
    };
    setItemRows((prev) => [...prev, newRow]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (itemRows.length <= 1) return;
    setItemRows(itemRows.filter((row) => row.id !== id));
  };

  const handleItemChange = (rowId: string, itemName: string) => {
    const foundBulk = bulkPackages.find((bp) => `${bp.name} (${bp.unit})` === itemName);
    if (foundBulk) {
      setItemRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            itemName,
            serviceName: foundBulk.name,
            unitPrice: foundBulk.price,
            subtotal: Math.round(row.qty * foundBulk.price * 100) / 100,
          };
        })
      );
      return;
    }

    const foundMaster = clothingItems.find((it) => it.name === itemName);
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const matchingSvc = foundMaster?.services?.find((s) => s.serviceName === row.serviceName);
        const fallbackSvc = availableServices.find((s) => s.name === row.serviceName);
        const defaultSvc = foundMaster?.services?.[0] || availableServices[0];

        const serviceName = matchingSvc ? matchingSvc.serviceName : fallbackSvc ? fallbackSvc.name : defaultSvc ? (defaultSvc as { serviceName?: string; name?: string }).serviceName || (defaultSvc as { name?: string }).name || 'Wash & Iron' : 'Wash & Iron';
        const price = matchingSvc ? matchingSvc.price : fallbackSvc ? fallbackSvc.defaultPrice : (defaultSvc as { price?: number; defaultPrice?: number })?.price || (defaultSvc as { defaultPrice?: number })?.defaultPrice || 25;

        return {
          ...row,
          itemName,
          serviceName,
          unitPrice: price,
          subtotal: Math.round(row.qty * price * 100) / 100,
        };
      })
    );
  };

  const handleServiceChange = (rowId: string, serviceName: string) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const foundMaster = clothingItems.find((it) => it.name === row.itemName);
        const matchingSvc = foundMaster?.services?.find((s) => s.serviceName === serviceName);
        const fallbackSvc = availableServices.find((s) => s.name === serviceName);
        const price = matchingSvc ? matchingSvc.price : fallbackSvc ? fallbackSvc.defaultPrice : row.unitPrice;
        return {
          ...row,
          serviceName,
          unitPrice: price,
          subtotal: Math.round(row.qty * price * 100) / 100,
        };
      })
    );
  };

  const handleQtyChange = (rowId: string, deltaOrValue: number | string) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let newQty: number;
        if (typeof deltaOrValue === 'number') {
          newQty = Math.max(0.5, Math.round((row.qty + deltaOrValue) * 10) / 10);
        } else {
          const parsed = parseFloat(deltaOrValue);
          newQty = isNaN(parsed) || parsed <= 0 ? 1 : Math.round(parsed * 100) / 100;
        }
        return {
          ...row,
          qty: newQty,
          subtotal: Math.round(newQty * row.unitPrice * 100) / 100,
        };
      })
    );
  };

  const handleUnitPriceChange = (rowId: string, newPrice: string) => {
    setItemRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const price = Math.max(0, Number(newPrice) || 0);
        return {
          ...row,
          unitPrice: price,
          subtotal: row.qty * price,
        };
      })
    );
  };

  // Add custom item from modal
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const price = Number(customItemPrice) || 50;
    const newRow: OrderRowItem = {
      id: Date.now().toString(),
      itemName: customItemName.trim(),
      serviceName: customItemService,
      qty: 1,
      unitPrice: price,
      subtotal: price,
    };
    setItemRows([...itemRows, newRow]);
    setShowCustomItemModal(false);
    setCustomItemName('');
    setCustomItemPrice('50');
  };

  // Add new customer modal with loader & duplicate prevention
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustContact) return;

    // If already detected as existing customer, select them immediately
    if (existingCustMatch) {
      handleUseExistingCustomer(existingCustMatch);
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: newCustName,
          contact: newCustContact,
          address: newCustAddress,
        }),
      });

      const data = await res.json();
      if (data.success && data.customer) {
        setCustomers([data.customer, ...customers]);
        setSelectedCustomerId(data.customer._id);
        setShowAddCustomerModal(false);
        setNewCustName('');
        setNewCustContact('');
        setNewCustAddress('');
        setAsyncCustMatch(null);
      } else if (data.code === 'CUSTOMER_EXISTS' && data.customer) {
        // Backend caught duplicate customer by mobile number
        handleUseExistingCustomer(data.customer);
      } else {
        alert(data.message || 'Error creating customer');
      }
    } catch {
      alert('Failed to connect to server');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Completely resets all form fields: customer selection, search, clothing items, charges, payments, and notes
  const resetForm = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
    setCustomerDropdownOpen(false);
    setItemRows([
      {
        id: Date.now().toString(),
        itemName: 'Shirt / Formal Shirt',
        serviceName: 'Wash & Iron',
        qty: 1,
        unitPrice: 25,
        subtotal: 25,
      },
    ]);
    setAmountPaid('0');
    setAdditionalCharges('0');
    setDiscount('0');
    setReferenceNumber('');
    setOrderNotes('');
  };

  // Preset payment buttons (Full, 50%, Zero)
  const handleSetFullPayment = () => {
    setAmountPaid(finalOrderAmount.toString());
  };

  const handleSetZeroPayment = () => {
    setAmountPaid('0');
  };

  const handleSetPartialPayment = () => {
    setAmountPaid(Math.round(finalOrderAmount / 2).toString());
  };

  // Submit Order with Optimistic Updates & Instant Feedback
  const handleCreateOrder = async () => {
    if (!selectedCustomerId) {
      alert('Please select or add a customer first.');
      return;
    }

    if (itemRows.length === 0) {
      alert('Please add at least one clothing item row.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        orderItems: itemRows.map((r) => ({
          itemName: r.itemName,
          serviceName: r.serviceName,
          qty: r.qty,
          unitPrice: r.unitPrice,
          subtotal: r.subtotal,
        })),
        additionalCharges: parsedAddCharges,
        discount: parsedDiscount,
        amountPaid: parsedPaid,
        paymentMethod,
        referenceNumber,
        expectedDeliveryDate,
        notes: orderNotes,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.order) {
        // Pop open receipt modal immediately
        setCompletedOrder(data.order);

        // Prepend directly to recent orders list (instant 0ms update, no 5-API reload)
        setRecentOrders((prev) => [data.order, ...prev.slice(0, 9)]);

        // Update selected customer's outstanding balance locally
        if (outstandingBalance > 0) {
          setCustomers((prev) =>
            prev.map((c) =>
              c._id === selectedCustomerId
                ? { ...c, outstandingBalance: (c.outstandingBalance || 0) + outstandingBalance }
                : c
            )
          );
        }

        // Completely reset customer, clothes, and billing inputs
        resetForm();
      } else {
        alert(data.message || 'Error creating order');
      }
    } catch {
      alert('Network error while creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          title="POS Counter Billing"
          subtitle="Mobile-First Itemized Laundry Order Creation (₹)"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-3 sm:p-5 md:p-8 space-y-5 flex-1 max-w-7xl w-full mx-auto pb-28 md:pb-8">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                New Laundry Order
              </h1>
              <p className="text-xs text-slate-500">
                Add clothing items, choose service per item, and collect payment.
              </p>
            </div>
          </div>

          {/* Background data sync pulse indicator */}
          {loading && (
            <div className="w-full bg-blue-100/70 h-1 overflow-hidden rounded-full animate-in fade-in">
              <div className="bg-blue-600 h-full w-2/5 rounded-full animate-pulse"></div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 7 Columns: Customer Selection + Dynamic Item Entry */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Customer Selection Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Customer Details</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ New Customer</span>
                    </button>
                  </div>

                  {selectedCustomer ? (
                    <span className="text-[11px] font-medium text-slate-500">
                      Bal: <strong className={selectedCustomer.outstandingBalance ? 'text-rose-600' : 'text-emerald-600'}>
                        {formatINR(selectedCustomer.outstandingBalance || 0)}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      Select Customer
                    </span>
                  )}
                </div>

                {/* Searchable Customer Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={selectedCustomer ? `Selected: ${selectedCustomer.fullname} (type to change)` : 'Search name or phone...'}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (customerSearch.trim().length > 0) setCustomerDropdownOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 200)}
                      className="w-full pl-8 pr-8 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearch('');
                          setCustomerDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown results — strictly max 5 suggestions while typing */}
                  {customerDropdownOpen && customerSearch.trim().length > 0 && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center space-y-1.5">
                          <p className="text-xs text-slate-400">
                            No customer found for &quot;{customerSearch}&quot;
                          </p>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowAddCustomerModal(true);
                              setCustomerDropdownOpen(false);
                              setNewCustName(customerSearch);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                          >
                            + Add &quot;{customerSearch}&quot; as New Customer
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredCustomers.slice(0, 5).map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedCustomerId(c._id);
                                setCustomerSearch('');
                                setCustomerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition flex items-center justify-between gap-2 ${
                                selectedCustomerId === c._id ? 'bg-blue-50 font-bold' : ''
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-slate-900">{c.fullname}</p>
                                <p className="text-slate-400 font-mono text-[11px]">{c.contact}</p>
                              </div>
                              {!!c.outstandingBalance && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                                  Bal: {formatINR(c.outstandingBalance)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Customer Card with Clear (X) Button */}
                {selectedCustomer && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between gap-2 transition animate-in fade-in">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <p className="font-bold text-slate-900 text-xs truncate">{selectedCustomer.fullname}</p>
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                        {selectedCustomer.contact} {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {!!selectedCustomer.outstandingBalance && (
                        <div className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-bold">
                          Dues: {formatINR(selectedCustomer.outstandingBalance)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId('');
                          setCustomerSearch('');
                        }}
                        title="Remove / Deselect customer"
                        className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Dynamic Clothing Items Card (Mobile-First Card Layout) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                    <span>Clothing Items ({itemRows.length})</span>
                  </label>
                  <button
                    onClick={() => setShowCustomItemModal(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    + Custom Item
                  </button>
                </div>

                {/* Quick Add Pill Buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">Quick add:</span>
                    {clothingItems.slice(0, 6).map((ci) => (
                      <button
                        key={ci._id}
                        type="button"
                        onClick={() => handleAddItemRow(ci)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold shrink-0 border border-slate-200 transition"
                      >
                        {ci.icon || '👕'} {ci.name.split('/')[0]}
                      </button>
                    ))}
                  </div>

                  {bulkPackages.length > 0 && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      <span className="text-[11px] text-amber-700 shrink-0 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ⚖️ Bulk / Per-Kg:
                      </span>
                      {bulkPackages.map((pkg) => (
                        <button
                          key={pkg._id}
                          type="button"
                          onClick={() => handleAddBulkPackageRow(pkg)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400 text-amber-900 text-[11px] font-semibold shrink-0 border border-amber-200 transition flex items-center space-x-1"
                        >
                          <span>{pkg.name}</span>
                          <span className="font-mono text-[10px] text-amber-700 font-bold">
                            ({formatINR(pkg.price)}/{pkg.unit})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Rows */}
                <div className="space-y-3">
                  {itemRows.map((row, index) => {
                    const bulkPkg = bulkPackages.find((bp) => `${bp.name} (${bp.unit})` === row.itemName);
                    const master = clothingItems.find((ci) => ci.name === row.itemName);

                    let rowServices: { serviceName: string; price: number }[] = [];
                    if (bulkPkg) {
                      rowServices = [{ serviceName: bulkPkg.name, price: bulkPkg.price }];
                    } else if (availableServices.length > 0) {
                      rowServices = availableServices.map((s) => {
                        const custom = master?.services?.find((m) => m.serviceName === s.name);
                        return {
                          serviceName: s.name,
                          price: custom ? custom.price : s.defaultPrice,
                        };
                      });
                    } else if (master?.services?.length) {
                      rowServices = master.services;
                    } else {
                      rowServices = [
                        { serviceName: 'Wash & Iron', price: 25 },
                        { serviceName: 'Iron Only', price: 12 },
                        { serviceName: 'Dry Clean', price: 60 },
                      ];
                    }

                    return (
                      <div
                        key={row.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 shadow-xs transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-400 w-4">
                            #{index + 1}
                          </span>

                          {/* Garment / Package Selector */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={row.itemName}
                              onChange={(e) => handleItemChange(row.id, e.target.value)}
                              className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                            >
                              <optgroup label="👕 Garment Items">
                                {clothingItems.map((ci) => (
                                  <option key={ci._id} value={ci.name}>
                                    {ci.icon || '👕'} {ci.name}
                                  </option>
                                ))}
                              </optgroup>
                              {bulkPackages.length > 0 && (
                                <optgroup label="⚖️ Bulk & Weight Packages">
                                  {bulkPackages.map((bp) => (
                                    <option key={bp._id} value={`${bp.name} (${bp.unit})`}>
                                      ⚖️ {bp.name} ({formatINR(bp.price)} / {bp.unit})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {!clothingItems.some((ci) => ci.name === row.itemName) &&
                                !bulkPackages.some((bp) => `${bp.name} (${bp.unit})` === row.itemName) && (
                                  <option value={row.itemName}>{row.itemName}</option>
                                )}
                            </select>
                          </div>

                          {/* Remove Row Button */}
                          <button
                            onClick={() => handleRemoveItemRow(row.id)}
                            disabled={itemRows.length <= 1}
                            title="Remove Row"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Service, Quantity, Unit Price, Subtotal Grid */}
                        <div className="grid grid-cols-12 gap-2 items-center text-xs">
                          {/* Service Dropdown */}
                          <div className="col-span-5">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Service</label>
                            <select
                              value={row.serviceName}
                              onChange={(e) => handleServiceChange(row.id, e.target.value)}
                              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {rowServices.map((s, sIdx) => (
                                <option key={sIdx} value={s.serviceName}>
                                  {s.serviceName} ({formatINR(s.price)})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity with +/- stepper */}
                          <div className="col-span-3">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Qty / Wt</label>
                            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(row.id, -1)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={row.qty}
                                onChange={(e) => handleQtyChange(row.id, e.target.value)}
                                className="w-full text-center text-xs font-bold text-slate-800 bg-transparent focus:outline-none py-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(row.id, 1)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Unit Price (Editable) */}
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Rate</label>
                            <input
                              type="number"
                              min="0"
                              value={row.unitPrice}
                              onChange={(e) => handleUnitPriceChange(row.id, e.target.value)}
                              className="w-full text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-1.5 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="col-span-2 text-right">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Total</label>
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {formatINR(row.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Another Item Button */}
                <button
                  onClick={() => handleAddItemRow()}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50/50 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Item (+)</span>
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Billing Summary, Payment Collection & Finalize */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-4 sm:p-6 space-y-4">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Payment & Billing Summary</span>
                </label>

                {/* Calculations Breakdown */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800">{formatINR(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="shrink-0">Add-on Charges (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={additionalCharges}
                      onChange={(e) => setAdditionalCharges(e.target.value)}
                      placeholder="0"
                      className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="shrink-0">Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs text-emerald-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">FINAL ORDER AMOUNT:</span>
                    <span className="font-mono font-black text-xl text-blue-600">
                      {formatINR(finalOrderAmount)}
                    </span>
                  </div>
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Expected Delivery Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Payment Collection Section */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Amount Paid Now (Advance / Partial / Full)
                    </label>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={handleSetZeroPayment}
                        className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-semibold hover:bg-slate-300"
                      >
                        ₹0 (Later)
                      </button>
                      <button
                        type="button"
                        onClick={handleSetPartialPayment}
                        className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold hover:bg-amber-200"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={handleSetFullPayment}
                        className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold hover:bg-emerald-200"
                      >
                        Full
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 text-base font-black font-mono text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {['Cash', 'UPI', 'Card'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          paymentMethod === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Reference # for UPI/Card */}
                  {paymentMethod !== 'Cash' && (
                    <input
                      type="text"
                      placeholder={`Enter ${paymentMethod} Transaction Ref #`}
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}

                  {/* Live Outstanding vs Change Indicator */}
                  <div className="p-3 rounded-xl border bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Remaining Outstanding:</span>
                      <span className={`font-mono font-bold ${outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatINR(outstandingBalance)}
                      </span>
                    </div>
                    {change > 0 && (
                      <div className="flex justify-between text-blue-700 font-bold">
                        <span>Change to Return:</span>
                        <span className="font-mono">{formatINR(change)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <input
                    type="text"
                    placeholder="Order notes / specific instructions (optional)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Create Order Button */}
                <button
                  onClick={handleCreateOrder}
                  disabled={isSubmitting || !selectedCustomerId || itemRows.length === 0}
                  className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition ${
                    isSubmitting ? 'opacity-85 cursor-wait' : 'active:scale-[0.98]'
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Order & Invoice...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-5 h-5" />
                      <span>Create Order ({formatINR(finalOrderAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Recent Transactions in this Branch</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.slice(0, 5).map((ro) => (
                    <tr key={ro.orderNumber} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{ro.orderNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{ro.customerName}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{formatINR(ro.total)}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600">{formatINR(ro.amountPaid)}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">
                        {formatINR(ro.balance !== undefined ? ro.balance : Math.max(0, ro.total - ro.amountPaid))}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {ro.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setCompletedOrder(ro)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Inline Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Add New Customer</h3>
            <p className="text-xs text-slate-500 mb-4">Quick registration for immediate POS order</p>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Mobile Contact *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9820011223"
                  value={newCustContact}
                  onChange={(e) => setNewCustContact(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border font-mono transition ${
                    existingCustMatch
                      ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300/50'
                      : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }`}
                />

                {/* Instant Existing Customer Detected Alert & One-Click Use Button */}
                {existingCustMatch && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Customer Already Exists!</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-xs truncate">{existingCustMatch.fullname}</p>
                        <p className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{existingCustMatch.contact}</span>
                          {(existingCustMatch.outstandingBalance || 0) > 0 && (
                            <span className="text-rose-600 font-semibold ml-1">
                              (Dues: {formatINR(existingCustMatch.outstandingBalance || 0)})
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseExistingCustomer(existingCustMatch)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 shrink-0 transition"
                      >
                        Use This Customer →
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Click <strong className="font-bold">&quot;Use This Customer&quot;</strong> to select this customer without creating a duplicate.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 301, Lake View"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCustomer || !!existingCustMatch}
                  title={existingCustMatch ? 'Mobile number already belongs to an existing customer. Click "Use This Customer" above.' : ''}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition ${
                    isCreatingCustomer || !!existingCustMatch
                      ? 'opacity-40 cursor-not-allowed bg-slate-400'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Custom Item Modal */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Add Custom Garment</h3>
            <p className="text-xs text-slate-500 mb-4">Add a non-standard item to this order</p>
            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Dupatta / Sherwani"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Service</label>
                <select
                  value={customItemService}
                  onChange={(e) => {
                    const nextSvc = e.target.value;
                    setCustomItemService(nextSvc);
                    const found = availableServices.find((s) => s.name === nextSvc);
                    if (found) {
                      setCustomItemPrice(found.defaultPrice.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {availableServices.length > 0 ? (
                    availableServices.map((s) => (
                      <option key={s._id} value={s.name}>
                        {s.name} ({formatINR(s.defaultPrice)})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Wash & Iron">Wash & Iron</option>
                      <option value="Dry Clean">Dry Clean</option>
                      <option value="Iron Only">Iron Only</option>
                      <option value="Wash & Fold">Wash & Fold</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Unit Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
                >
                  Add to Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Printable Receipt Modal */}
      <ReceiptModal
        order={completedOrder}
        onClose={() => {
          setCompletedOrder(null);
          resetForm();
        }}
      />
    </div>
  );
}
