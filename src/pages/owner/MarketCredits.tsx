// src/pages/staff/MarketCredits.tsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import {
  CreditCard,
  Plus,
  User,
  Phone,
  DollarSign,
  Calendar,
  Search,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { MarketCredit } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { parseNumber, formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import StatsCard from '../../components/UI/StatsCard';
import toast from 'react-hot-toast';

interface MarketCreditFormData {
  customerName: string;
  customerPhone: string;
  amount: number;
  description?: string;            // now optional
}

export default function MarketCredits() {
  const [marketCredits, setMarketCredits] = useState<MarketCredit[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<MarketCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const { userProfile } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MarketCreditFormData>();

  // real-time listener
  useEffect(() => {
    const q = query(
      collection(db, 'marketCredits'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const credits = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            amount: parseNumber(data.amount),
            description: data.description || '',
            createdBy: data.createdByName || '—',
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now()
          } as MarketCredit;
        });
        setMarketCredits(credits);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error('Failed to fetch market credits');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // filter + balance
  useEffect(filterCredits, [marketCredits, searchTerm]);
  useEffect(() => {
    if (selectedCustomer) {
      const total = marketCredits
        .filter((c) => c.customerPhone === selectedCustomer)
        .reduce((sum, c) => sum + c.amount, 0);
      setCustomerBalance(total);
    } else {
      setCustomerBalance(0);
    }
  }, [selectedCustomer, marketCredits]);

  function filterCredits() {
    let list = marketCredits;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(term) ||
          c.customerPhone.includes(term) ||
          c.description.toLowerCase().includes(term)
      );
    }
    setFilteredCredits(list);
  }

  // add credit
  const onSubmit = async (data: MarketCreditFormData) => {
    if (!userProfile) {
      toast.error('User not authenticated');
      return;
    }
    setProcessing(true);
    try {
      await addDoc(collection(db, 'marketCredits'), {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        amount: parseNumber(data.amount),
        description: data.description?.trim() || '',
        createdBy: userProfile.id,
        createdByName: userProfile.profile.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Credit entry added');
      reset();
      setSelectedCustomer('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add credit');
    } finally {
      setProcessing(false);
    }
  };

  // action handlers
  const handleEdit = (id: string) => {
    // load into form, or open modal — implement as needed
    toast('Edit feature not implemented yet', { icon: '✏️' });
  };
  const handleDelete = async (id: string) => {
    if (confirm('Delete this credit entry?')) {
      await deleteDoc(doc(db, 'marketCredits', id));
      toast.success('Entry deleted');
    }
  };
  const handleMarkPaid = async (id: string) => {
    // e.g. move to paid collection, or mark flag
    await updateDoc(doc(db, 'marketCredits', id), {
      paid: true,
      paidAt: Timestamp.now()
    });
    toast.success('Marked as paid');
  };

  // stats helpers
  const uniqueCustomers = Array.from(
    new Map(marketCredits.map((c) => [c.customerPhone, c.customerName])).entries()
  ).map(([phone, name]) => ({ phone, name }));
  const totalOutstanding = marketCredits.reduce((sum, c) => sum + c.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Stats */}
        <div className="flex items-center mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg mr-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Market Credits</h1>
            <p className="text-gray-600 mt-1">
              Record and track customer credit entries
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Unique Customers"
            value={uniqueCustomers.length}
            icon={User}
            color="blue"
          />
          <StatsCard
            title="Total Entries"
            value={marketCredits.length}
            icon={Calendar}
            color="purple"
          />
        </div>

        {/* Form & Lookup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Add Entry */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-purple-600" />
              Add Market Credit
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  {...register('customerName', {
                    required: 'Required'
                  })}
                  className="w-full border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Name"
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm">
                    {errors.customerName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  {...register('customerPhone', {
                    required: 'Required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Invalid phone'
                    }
                  })}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="9876543210"
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm">
                    {errors.customerPhone.message}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount (₹) *
                </label>
                <input
                  {...register('amount', {
                    required: 'Required',
                    min: { value: 0.01, message: 'Must be > 0' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="100.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm">{errors.amount.message}</p>
                )}
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Optional note"
                />
              </div>

              {/* Balance preview */}
              {selectedCustomer && customerBalance > 0 && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    Current Balance: {formatCurrency(customerBalance)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>{processing ? 'Adding...' : 'Add Entry'}</span>
              </button>
            </form>
          </div>

          {/* Lookup */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Customer Balance
            </h2>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500 mb-4"
            >
              <option value="">Select customer…</option>
              {uniqueCustomers.map((c) => (
                <option key={c.phone} value={c.phone}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
            {selectedCustomer && (
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {formatCurrency(customerBalance)}
                </p>
                <p className="text-gray-600 mb-2">Outstanding</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {marketCredits
                    .filter((c) => c.customerPhone === selectedCustomer)
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex justify-between text-sm text-gray-700"
                      >
                        <span>{format(c.createdAt.toDate(), 'MMM dd')}</span>
                        <span>{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-gray-100">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Market Credit Entries</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 rounded px-4 py-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          {filteredCredits.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date','Customer','Amount','Description','Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCredits.map((c, i) => (
                    <tr key={c.id} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(c.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex items-center">
                        <div className="bg-gray-100 p-2 rounded-full mr-3">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{c.customerName}</div>
                          <div className="text-xs text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {c.customerPhone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                        {c.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        <button onClick={() => handleEdit(c.id)} title="Edit" className="p-1 hover:bg-gray-100 rounded">
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} title="Delete" className="p-1 hover:bg-gray-100 rounded">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                        <button onClick={() => handleMarkPaid(c.id)} title="Mark Paid" className="p-1 hover:bg-gray-100 rounded">
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No entries found"
              description="Try adjusting your search or add a new credit entry."
              actionLabel="Clear Search"
              onAction={() => setSearchTerm('')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
