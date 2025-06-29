import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { CreditCard, Plus, History, AlertCircle, Send } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CustomerCredit, CreditRequest, CreditTransaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CreditRequestFormData {
  amount: number;
  reason: string;
}

export default function CreditBalance() {
  const [creditInfo, setCreditInfo] = useState<CustomerCredit | null>(null);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreditRequestFormData>();

  useEffect(() => {
    if (userProfile) {
      fetchCreditData();
    }
  }, [userProfile]);

  const fetchCreditData = async () => {
    if (!userProfile) return;

    try {
      // Fetch credit balance
      const creditDoc = await getDoc(doc(db, 'customerCredits', userProfile.profile.phone));
      if (creditDoc.exists()) {
        setCreditInfo({ id: creditDoc.id, ...creditDoc.data() } as CustomerCredit);
      }

      // Fetch credit requests
      const requestsQuery = query(
        collection(db, 'creditRequests'),
        where('customerId', '==', userProfile.id),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CreditRequest[];
      setCreditRequests(requests);
    } catch (error) {
      console.error('Error fetching credit data:', error);
      toast.error('Failed to fetch credit information');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRequest = async (data: CreditRequestFormData) => {
    if (!userProfile) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'creditRequests'), {
        customerId: userProfile.id,
        customerName: userProfile.profile.name,
        customerPhone: userProfile.profile.phone,
        customerEmail: userProfile.email,
        requestedAmount: Number(data.amount), // Ensure it's stored as a number
        reason: data.reason,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Credit request submitted successfully!');
      reset();
      setShowRequestForm(false);
      fetchCreditData();
    } catch (error) {
      console.error('Error submitting credit request:', error);
      toast.error('Failed to submit credit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to safely format currency amounts
  const formatAmount = (amount: any): string => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(numAmount) ? '0.00' : numAmount.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Balance</h1>
          <p className="text-gray-600 mt-2">Manage your credit account and payment history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credit Balance Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-8 w-8 text-amber-600 mr-3" />
              <h2 className="text-xl font-semibold">Current Balance</h2>
            </div>
            
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 mb-2">
                ₹{formatAmount(creditInfo?.totalCredit || 0)}
              </p>
              <p className="text-gray-600">Outstanding Credit</p>
              
              {creditInfo?.creditLimit && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{formatAmount(creditInfo.creditLimit)}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRequestForm(true)}
              className="w-full mt-6 bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Request Credit</span>
            </button>
          </div>

          {/* Credit Requests */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Credit Requests</h2>
            
            {creditRequests.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No credit requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {creditRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">₹{formatAmount(request.requestedAmount)}</p>
                        <p className="text-sm text-gray-600">
                          {format(request.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                    {request.status === 'rejected' && request.rejectionReason && (
                      <p className="text-sm text-red-600">
                        <strong>Rejection Reason:</strong> {request.rejectionReason}
                      </p>
                    )}
                    {request.status === 'approved' && request.approvedAt && (
                      <p className="text-sm text-green-600">
                        Approved on {format(request.approvedAt.toDate(), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        {creditInfo && creditInfo.transactions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-6">
              <History className="h-6 w-6 text-amber-600 mr-2" />
              <h2 className="text-xl font-semibold">Transaction History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditInfo.transactions.slice(0, 10).map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(transaction.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'debit' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.type === 'debit' ? 'text-red-600' : 'text-green-600'}>
                          {transaction.type === 'debit' ? '+' : '-'}₹{formatAmount(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credit Request Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Credit</h3>
              
              <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Amount (₹) *
                  </label>
                  <input
                    {...register('amount', { 
                      required: 'Amount is required',
                      min: { value: 100, message: 'Minimum amount is ₹100' },
                      max: { value: 50000, message: 'Maximum amount is ₹50,000' }
                    })}
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Credit Request *
                  </label>
                  <textarea
                    {...register('reason', { required: 'Reason is required' })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Please explain why you need credit..."
                  />
                  {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestForm(false);
                      reset();
                    }}
                    disabled={submitting}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}