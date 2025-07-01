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
  updateDoc,
  serverTimestamp 
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
  CheckCircle,
  History,
  TrendingDown,
  X,
  RotateCcw
} from 'lucide-react';


import { db } from '../../lib/firebase';

import { MarketCredit, Collection, CustomerBalance } from './types';
import { useAuth } from "../../contexts/AuthContext";
import { format } from 'date-fns';
import { parseNumber, formatCurrency } from "../../utils/formatters";
import LoadingSpinner from './components/UI/LoadingSpinner';
import EmptyState from './components/UI/EmptyState';
import StatsCard from './components/UI/StatsCard';
import toast from 'react-hot-toast';

interface MarketCreditFormData {
  customerName: string;
  customerPhone: string;
  amount: number;
  collectionAmount?: number;
}

interface CustomerHistory {
  creditEntries: MarketCredit[];
  collections: (Collection & { creditId: string })[];
}

export default function MarketCredits() {
  const [marketCredits, setMarketCredits] = useState<MarketCredit[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<MarketCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance>({
    creditAmount: 0,
    totalCollected: 0,
    outstanding: 0,
    collections: []
  });
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory>({
    creditEntries: [],
    collections: []
  });
  const [editingCredit, setEditingCredit] = useState<MarketCredit | null>(null);
  const { userProfile } = useAuth();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MarketCreditFormData>();

  const watchedPhone = watch('customerPhone');

  useEffect(() => {
    // Set up real-time listener for market credits
    const q = query(collection(db, 'marketCredits'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const credits = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: parseNumber(data.amount)
        };
      }) as MarketCredit[];
      
      setMarketCredits(credits);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching market credits:', error);
      toast.error('Failed to fetch market credits');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterCredits();
  }, [marketCredits, searchTerm]);

  useEffect(() => {
    if (selectedCustomer) {
      calculateCustomerBalance(selectedCustomer);
      loadCustomerHistory(selectedCustomer);
    } else {
      setCustomerBalance({
        creditAmount: 0,
        totalCollected: 0,
        outstanding: 0,
        collections: []
      });
      setCustomerHistory({
        creditEntries: [],
        collections: []
      });
    }
  }, [selectedCustomer, marketCredits]);

  useEffect(() => {
    if (watchedPhone && watchedPhone !== selectedCustomer) {
      setSelectedCustomer(watchedPhone);
    }
  }, [watchedPhone]);

  const filterCredits = () => {
    let filtered = [...marketCredits];

    if (searchTerm) {
      filtered = filtered.filter(credit =>
        credit.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credit.customerPhone.includes(searchTerm)
      );
    }

    setFilteredCredits(filtered);
  };

  const calculateCustomerBalance = async (customerPhone: string) => {
    try {
      const customerCredits = marketCredits.filter(credit => 
        credit.customerPhone === customerPhone
      );

      if (customerCredits.length === 0) {
        setCustomerBalance({
          creditAmount: 0,
          totalCollected: 0,
          outstanding: 0,
          collections: []
        });
        return;
      }

      let totalCreditAmount = 0;
      let totalCollected = 0;
      const allCollections: Collection[] = [];

      // Calculate total credit amount and fetch all collections
      for (const credit of customerCredits) {
        totalCreditAmount += credit.amount;

        // Fetch collections for this credit
        const collectionsQuery = query(
          collection(db, 'marketCredits', credit.id, 'collections'),
          orderBy('collectedAt', 'desc')
        );
        
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const creditCollections = collectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          amount: parseNumber(doc.data().amount)
        })) as Collection[];

        allCollections.push(...creditCollections);
        totalCollected += creditCollections.reduce((sum, collection) => sum + collection.amount, 0);
      }

      const outstanding = totalCreditAmount - totalCollected;

      setCustomerBalance({
        creditAmount: totalCreditAmount,
        totalCollected,
        outstanding,
        collections: allCollections.sort((a, b) => {
          const aTime = a.collectedAt?.toMillis?.() || 0;
          const bTime = b.collectedAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
      });
    } catch (error) {
      console.error('Error calculating customer balance:', error);
      toast.error('Failed to calculate customer balance');
    }
  };

  const loadCustomerHistory = async (customerPhone: string) => {
    try {
      const customerCredits = marketCredits.filter(credit => 
        credit.customerPhone === customerPhone
      );

      const allCollections: (Collection & { creditId: string })[] = [];

      // Fetch all collections for this customer
      for (const credit of customerCredits) {
        const collectionsQuery = query(
          collection(db, 'marketCredits', credit.id, 'collections'),
          orderBy('collectedAt', 'desc')
        );
        
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const creditCollections = collectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          creditId: credit.id,
          ...doc.data(),
          amount: parseNumber(doc.data().amount)
        })) as (Collection & { creditId: string })[];

        allCollections.push(...creditCollections);
      }

      setCustomerHistory({
        creditEntries: customerCredits.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
        collections: allCollections.sort((a, b) => {
          const aTime = a.collectedAt?.toMillis?.() || 0;
          const bTime = b.collectedAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
      });
    } catch (error) {
      console.error('Error loading customer history:', error);
      toast.error('Failed to load customer history');
    }
  };

  const onSubmit = async (data: MarketCreditFormData) => {
    if (!userProfile) {
      toast.error('User not authenticated');
      return;
    }

    setProcessing(true);
    try {
      const creditAmount = parseNumber(data.amount);
      const collectionAmount = data.collectionAmount ? parseNumber(data.collectionAmount) : 0;

      const marketCreditData: Omit<MarketCredit, 'id'> = {
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        amount: creditAmount,
        paid: false, // Always start as unpaid, can be toggled later
        createdBy: userProfile.id,
        createdByName: userProfile.profile.name,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingCredit) {
        // Update existing credit (don't touch collections)
        await updateDoc(doc(db, 'marketCredits', editingCredit.id), {
          customerName: marketCreditData.customerName,
          customerPhone: marketCreditData.customerPhone,
          amount: marketCreditData.amount,
          updatedAt: Timestamp.now()
        });
        toast.success('Market credit updated successfully!');
        setEditingCredit(null);
      } else {
        // Create new credit
        const creditDocRef = await addDoc(collection(db, 'marketCredits'), marketCreditData);
        
        // Add collection if amount > 0
        if (collectionAmount > 0) {
          await addDoc(collection(db, 'marketCredits', creditDocRef.id, 'collections'), {
            amount: collectionAmount,
            collectedBy: userProfile.id,
            collectedByName: userProfile.profile.name,
            collectedAt: serverTimestamp(),
            notes: 'Initial collection'
          });
        }
        
        toast.success('Market credit added successfully!');
      }
      
      reset();
      setSelectedCustomer('');
    } catch (error) {
      console.error('Error saving market credit:', error);
      toast.error('Failed to save market credit');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (credit: MarketCredit) => {
    setEditingCredit(credit);
    setValue('customerName', credit.customerName);
    setValue('customerPhone', credit.customerPhone);
    setValue('amount', credit.amount);
    setValue('collectionAmount', 0);
  };

  const handleMarkPaid = async (creditId: string) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'marketCredits', creditId), {
        paid: true,
        paidAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Credit marked as paid successfully!');
    } catch (error) {
      console.error('Error marking credit as paid:', error);
      toast.error('Failed to mark credit as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkUnpaid = async (creditId: string) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      await updateDoc(doc(db, 'marketCredits', creditId), {
        paid: false,
        paidAt: null,
        updatedAt: Timestamp.now()
      });

      toast.success('Credit marked as unpaid successfully!');
    } catch (error) {
      console.error('Error marking credit as unpaid:', error);
      toast.error('Failed to mark credit as unpaid');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCollection = async (creditId: string, amount: number) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      await addDoc(collection(db, 'marketCredits', creditId, 'collections'), {
        amount: parseNumber(amount),
        collectedBy: userProfile.id,
        collectedByName: userProfile.profile.name,
        collectedAt: serverTimestamp(),
        notes: 'Manual collection'
      });

      toast.success('Collection added successfully!');
      
      // Refresh customer balance if this customer is selected
      if (selectedCustomer) {
        calculateCustomerBalance(selectedCustomer);
        loadCustomerHistory(selectedCustomer);
      }
    } catch (error) {
      console.error('Error adding collection:', error);
      toast.error('Failed to add collection');
    } finally {
      setProcessing(false);
    }
  };

  const getUniqueCustomers = () => {
    const customers = new Map();
    marketCredits.forEach(credit => {
      if (!customers.has(credit.customerPhone)) {
        customers.set(credit.customerPhone, {
          name: credit.customerName,
          phone: credit.customerPhone
        });
      }
    });
    return Array.from(customers.values());
  };

  const getTotalOutstanding = async () => {
    let totalOutstanding = 0;
    
    for (const credit of marketCredits) {
      const collectionsQuery = query(collection(db, 'marketCredits', credit.id, 'collections'));
      const collectionsSnapshot = await getDocs(collectionsQuery);
      const totalCollected = collectionsSnapshot.docs.reduce((sum, doc) => 
        sum + parseNumber(doc.data().amount), 0
      );
      
      const outstanding = credit.amount - totalCollected;
      totalOutstanding += outstanding;
    }
    
    return totalOutstanding;
  };

  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    const calculateTotal = async () => {
      const total = await getTotalOutstanding();
      setTotalOutstanding(total);
    };
    
    if (marketCredits.length > 0) {
      calculateTotal();
    }
  }, [marketCredits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading market credits..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg mr-4">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Market Credits</h1>
              <p className="text-gray-600 mt-1">Record customer credits and track collections</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Outstanding"
            value={formatCurrency(totalOutstanding)}
            icon={DollarSign}
            color="red"
          />
          <StatsCard
            title="Unique Customers"
            value={getUniqueCustomers().length}
            icon={User}
            color="blue"
          />
          <StatsCard
            title="Total Credits"
            value={marketCredits.length}
            icon={Calendar}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Credit Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-purple-600" />
              {editingCredit ? 'Edit Market Credit' : 'Add Market Credit'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  {...register('customerName', { required: 'Customer name is required' })}
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter customer name"
                />
                {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  {...register('customerPhone', { 
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })}
                  type="tel"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter phone number"
                />
                {errors.customerPhone && <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Amount *
                </label>
                <input
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 1, message: 'Amount must be at least ₹1' }
                  })}
                  type="number"
                  min="1"
                  step="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter credit amount"
                />
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
              </div>

              {!editingCredit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Amount (Optional)
                  </label>
                  <input
                    {...register('collectionAmount', {
                      min: { value: 0, message: 'Collection amount cannot be negative' }
                    })}
                    type="number"
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter today's collection amount (can exceed credit)"
                  />
                  {errors.collectionAmount && <p className="text-red-500 text-sm mt-1">{errors.collectionAmount.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">Note: Collection amount can exceed the credit amount</p>
                </div>
              )}

              {selectedCustomer && customerBalance.outstanding !== 0 && (
                <div className={`p-4 rounded-lg border ${customerBalance.outstanding > 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-sm ${customerBalance.outstanding > 0 ? 'text-blue-800' : 'text-green-800'}`}>
                    <strong>Current Outstanding for this customer:</strong> {formatCurrency(customerBalance.outstanding)}
                    {customerBalance.outstanding < 0 && ' (Overpaid)'}
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  <span>{processing ? (editingCredit ? 'Updating...' : 'Adding...') : (editingCredit ? 'Update Credit' : 'Add Credit')}</span>
                </button>
                {editingCredit && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCredit(null);
                      reset();
                    }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Customer Balance Lookup */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Customer Balance Lookup
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select a customer...</option>
                  {getUniqueCustomers().map((customer) => (
                    <option key={customer.phone} value={customer.phone}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="space-y-4">
                  {/* Outstanding Balance */}
                  <div className={`p-4 rounded-lg text-center ${customerBalance.outstanding > 0 ? 'bg-red-50 border border-red-200' : customerBalance.outstanding < 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(customerBalance.outstanding)}</p>
                    <p className="text-sm text-gray-600">
                      Outstanding Balance
                      {customerBalance.outstanding < 0 && ' (Overpaid)'}
                      {customerBalance.outstanding === 0 && ' (Settled)'}
                    </p>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(customerBalance.creditAmount)}</p>
                      <p className="text-xs text-blue-600">Total Credit</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-lg font-bold text-green-900">{formatCurrency(customerBalance.totalCollected)}</p>
                      <p className="text-xs text-green-600">Total Collected</p>
                    </div>
                  </div>

                  {/* History Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Credit Entries History */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 flex items-center text-sm">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Credit Entries History
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {customerHistory.creditEntries.length > 0 ? (
                          customerHistory.creditEntries.slice(0, 10).map((credit) => (
                            <div key={credit.id} className="flex justify-between items-center text-xs bg-blue-50 p-2 rounded">
                              <span className="text-gray-600">
                                {format(credit.createdAt.toDate(), 'MMM dd, yyyy')}
                              </span>
                              <span className="font-medium text-blue-600">{formatCurrency(credit.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No credit entries</p>
                        )}
                      </div>
                    </div>

                    {/* Collections History */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 flex items-center text-sm">
                        <History className="h-4 w-4 mr-1" />
                        Collections History
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {customerHistory.collections.length > 0 ? (
                          customerHistory.collections.slice(0, 10).map((collection) => (
                            <div key={collection.id} className="flex justify-between items-center text-xs bg-green-50 p-2 rounded">
                              <span className="text-gray-600">
                                {collection.collectedAt && format(collection.collectedAt.toDate(), 'MMM dd, yyyy')}
                              </span>
                              <span className="font-medium text-green-600">{formatCurrency(collection.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No collections</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Market Credits List */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Market Credit Entries</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {filteredCredits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Credit Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCredits.map((credit, index) => (
                    <tr key={credit.id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(credit.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-full mr-3">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{credit.customerName}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {credit.customerPhone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(credit.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {credit.paid ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(credit)}
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200 p-1 hover:bg-blue-50 rounded"
                            title="Edit Credit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {!credit.paid ? (
                            <button
                              onClick={() => handleMarkPaid(credit.id)}
                              disabled={processing}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-green-50 rounded"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkUnpaid(credit.id)}
                              disabled={processing}
                              className="text-orange-600 hover:text-orange-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-orange-50 rounded"
                              title="Mark as Unpaid"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
              description="No market credit entries match your search criteria. Add your first entry using the form above."
              actionLabel="Clear Search"
              onAction={() => setSearchTerm('')}
            />
          )}
        </div>
      </div>
    </div>
  );
}