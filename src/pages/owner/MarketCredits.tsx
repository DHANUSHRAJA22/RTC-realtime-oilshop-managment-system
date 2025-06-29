// src/pages/staff/MarketCredits.tsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import {
  CreditCard,
  Plus,
  User,
  Phone,
  DollarSign,
  Calendar,
  Search
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
  description: string;
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

  // 1) Real-time subscription
  useEffect(() => {
    const q = query(
      collection(db, 'marketCredits'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const credits = snap.docs.map((doc) => ({
          id: doc.id,
          // Firestore data() can be any; force amount to number
          ...doc.data(),
          amount: parseNumber((doc.data() as any).amount),
          createdAt:
            (doc.data() as any).createdAt instanceof Timestamp
              ? (doc.data() as any).createdAt
              : Timestamp.now()
        })) as MarketCredit[];
        setMarketCredits(credits);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching market credits:', err);
        toast.error('Failed to fetch market credits');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 2) Filter & balance effects
  useEffect(filterCredits, [marketCredits, searchTerm]);
  useEffect(() => {
    if (selectedCustomer) {
      const total = marketCredits
        .filter((c) => c.customerPhone === selectedCustomer)
        .reduce((sum, c) => sum + parseNumber(c.amount), 0);
      setCustomerBalance(total);
    } else {
      setCustomerBalance(0);
    }
  }, [selectedCustomer, marketCredits]);

  function filterCredits() {
    let list = marketCredits;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => {
        return (
          c.customerName.toLowerCase().includes(term) ||
          c.customerPhone.includes(term) ||
          c.description.toLowerCase().includes(term)
        );
      });
    }
    setFilteredCredits(list);
  }

  // 3) Submit handler
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
        description: data.description.trim(),
        createdBy: userProfile.id,
        createdByName: userProfile.profile.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Market credit added!');
      reset();
      setSelectedCustomer('');
    } catch (err) {
      console.error('Error adding market credit:', err);
      toast.error('Failed to add market credit');
    } finally {
      setProcessing(false);
    }
  };

  // 4) Helpers for stats
  const uniqueCustomers = Array.from(
    new Map(
      marketCredits.map((c) => [c.customerPhone, c.customerName])
    ).entries()
  ).map(([phone, name]) => ({ phone, name }));

  const totalOutstanding = marketCredits.reduce(
    (sum, c) => sum + parseNumber(c.amount),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading market credits..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header + Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg mr-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Market Credits
            </h1>
            <p className="text-gray-600 mt-1">
              Manually record and track customer credit entries
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
          {/* Add Credit */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-purple-600" />
              Add Market Credit Entry
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  {...register('customerName', {
                    required: 'Customer name is required'
                  })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter customer name"
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.customerName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  {...register('customerPhone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Enter a valid 10-digit phone number'
                    }
                  })}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                  placeholder="9876543210"
                />
                {errors.customerPhone && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.customerPhone.message}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Amount (₹) *
                </label>
                <input
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Must be > 0' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                  placeholder="100.00"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description', {
                    required: 'Description is required'
                  })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
                  placeholder="Reason for credit"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {selectedCustomer && customerBalance > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Current Balance:</strong>{' '}
                    {formatCurrency(customerBalance)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>{processing ? 'Adding...' : 'Add Entry'}</span>
              </button>
            </form>
          </div>

          {/* Balance Lookup */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Customer Balance Lookup
            </h2>
            <div className="space-y-4">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select customer…</option>
                {uniqueCustomers.map((c) => (
                  <option key={c.phone} value={c.phone}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900 text-center">
                    {formatCurrency(customerBalance)}
                  </p>
                  <p className="text-gray-600 text-center mb-4">
                    Outstanding Balance
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {marketCredits
                      .filter((c) => c.customerPhone === selectedCustomer)
                      .slice(0, 5)
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">
                            {format(c.createdAt.toDate(), 'MMM dd, yyyy')}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(c.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Market Credit Entries</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {filteredCredits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Date',
                      'Customer',
                      'Amount',
                      'Description',
                      'Created By'
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCredits.map((credit, i) => (
                    <tr
                      key={credit.id}
                      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {format(credit.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-full mr-3">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {credit.customerName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {credit.customerPhone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(parseNumber(credit.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {credit.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {credit.createdByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No Market Credit Entries Found"
              description="No entries match your search."
              actionLabel="Clear Search"
              onAction={() => setSearchTerm('')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
