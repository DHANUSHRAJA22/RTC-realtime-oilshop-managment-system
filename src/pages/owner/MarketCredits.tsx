// src/pages/staff/MarketCredits.tsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
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
  Edit,
  Trash2
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
  amount: number;            // original credit
  collectionAmount?: number; // optional daily collection
}

export default function MarketCredits() {
  const [credits, setCredits] = useState<MarketCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [outstanding, setOutstanding] = useState(0);
  const { userProfile } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<MarketCreditFormData>();

  // -- Real-time load all credits --
  useEffect(() => {
    const q = query(collection(db, 'marketCredits'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any)
        })) as MarketCredit[];
        setCredits(list);
        setLoading(false);
      },
      err => {
        console.error(err);
        toast.error('Failed to load credits');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // -- When customer chosen, compute outstanding = credit.amount – sum(collections) --
  useEffect(() => {
    if (!selectedCustomer) return setOutstanding(0);
    (async () => {
      const credit = credits.find(c => c.customerPhone === selectedCustomer);
      if (!credit) return setOutstanding(0);
      const colSnap = await getDocs(
        collection(db, 'marketCredits', credit.id, 'collections')
      );
      const collected = colSnap.docs.reduce(
        (sum, d) => sum + parseNumber((d.data() as any).amount),
        0
      );
      setOutstanding(parseNumber(credit.amount) - collected);
    })();
  }, [selectedCustomer, credits]);

  // -- Form submit: create credit and optional collection record --
  const onSubmit = async (data: MarketCreditFormData) => {
    if (!userProfile) return toast.error('Not authenticated');
    setProcessing(true);
    try {
      // create main credit record
      const creditRef = await addDoc(collection(db, 'marketCredits'), {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        amount: parseNumber(data.amount),
        createdBy: userProfile.id,
        createdByName: userProfile.profile.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Credit created');

      // if daily collection provided
      if (data.collectionAmount && data.collectionAmount > 0) {
        await addDoc(
          collection(db, 'marketCredits', creditRef.id, 'collections'),
          {
            amount: parseNumber(data.collectionAmount),
            collectedBy: userProfile.id,
            collectedAt: Timestamp.now()
          }
        );
        toast.success('Collection recorded');
      }

      reset();
      setSelectedCustomer('');
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setProcessing(false);
    }
  };

  // -- Delete entire credit record (soft-delete or real delete as desired) --
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credit?')) return;
    await updateDoc(doc(db, 'marketCredits', id), { deleted: true });
    toast.success('Deleted');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" text="Loading…" />
      </div>
    );
  }

  // Unique customers for dropdown
  const unique = Array.from(
    new Map(credits.map(c => [c.customerPhone, c.customerName])).entries()
  ).map(([phone, name]) => ({ phone, name }));

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Customers" value={unique.length} icon={User} color="blue" />
        <StatsCard
          title="Total Credits"
          value={formatCurrency(
            credits.reduce((s, c) => s + parseNumber(c.amount), 0)
          )}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Active Credits"
          value={formatCurrency(
            credits.reduce((s, c) => s + (c.deleted ? 0 : parseNumber(c.amount)), 0)
          )}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Form & Lookup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add / Collect */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded p-6 shadow space-y-4"
        >
          <h2 className="text-xl font-semibold flex items-center">
            <Plus className="mr-2 text-purple-600" /> Add Credit & Collection
          </h2>
          <div>
            <label>Customer Name *</label>
            <input
              {...register('customerName', { required: 'Required' })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.customerName && (
              <p className="text-red-500 text-sm">{errors.customerName.message}</p>
            )}
          </div>
          <div>
            <label>Phone *</label>
            <input
              {...register('customerPhone', { required: 'Required' })}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            {errors.customerPhone && (
              <p className="text-red-500 text-sm">{errors.customerPhone.message}</p>
            )}
          </div>
          <div>
            <label>Credit Amount ₹*</label>
            <input
              type="number"
              step="1"
              {...register('amount', { required: 'Required', min: 1 })}
              className="w-full border rounded px-3 py-2"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label>Collection Amount (optional) ₹</label>
            <input
              type="number"
              step="1"
              {...register('collectionAmount')}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="mt-4 w-full bg-purple-600 text-white py-2 rounded"
          >
            {processing ? 'Saving…' : 'Save'}
          </button>
        </form>

        {/* Lookup & Outstanding */}
        <div className="bg-white rounded p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <DollarSign className="mr-2 text-green-600" /> Customer Outstanding
          </h2>
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
          >
            <option value="">Select customer…</option>
            {unique.map(u => (
              <option key={u.phone} value={u.phone}>
                {u.name} — {u.phone}
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <>
              <p className="text-2xl font-bold">
                {formatCurrency(outstanding)}
              </p>
              <div className="space-y-2 max-h-48 overflow-auto">
                <h4 className="font-medium">Collections History</h4>
                {/* load and list collections */}
                {/* for brevity, you can mirror the getDocs logic here */}
                <p className="text-gray-500">Loading history…</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Credits</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 border rounded px-3 py-2"
            />
          </div>
        </div>
        {credits.filter(c =>
          c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.customerPhone.includes(searchTerm)
        ).length ? (
          <table className="w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                {['Date','Customer','Credit','Status','Actions'].map(h => (
                  <th key={h} className="p-2 text-left text-sm font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credits.map((c, i) => (
                <tr
                  key={c.id}
                  className={i % 2 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="p-2 text-sm">
                    {format(c.createdAt.toDate(), 'MMM dd, yyyy')}
                  </td>
                  <td className="p-2 text-sm">
                    {c.customerName} <br />
                    <span className="text-xs text-gray-500">{c.customerPhone}</span>
                  </td>
                  <td className="p-2 text-sm">
                    {formatCurrency(parseNumber(c.amount))}
                  </td>
                  <td className="p-2 text-sm">
                    {c.deleted ? (
                      <span className="text-red-600">Deleted</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </td>
                  <td className="p-2 text-sm space-x-2">
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Delete"
                      className="text-red-600"
                    >
                      <Trash2 className="inline-block h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No credits"
            description="Add a new credit to get started."
            actionLabel="Clear Search"
            onAction={() => setSearchTerm('')}
          />
        )}
      </div>
    </div>
  );
}
