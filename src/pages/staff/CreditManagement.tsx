import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { CreditCard, Plus, Search, Filter, User, Phone, Calendar, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CreditRequest, Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { parseNumber, formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import StatusBadge from '../../components/UI/StatusBadge';
import StatsCard from '../../components/UI/StatsCard';
import toast from 'react-hot-toast';

interface CreditRequestFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  requestedAmount: number;
  reason: string;
  notes: string;
}

export default function CreditManagement() {
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const { userProfile } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreditRequestFormData>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch credit requests
      const requestsQuery = query(collection(db, 'creditRequests'), orderBy('createdAt', 'desc'));
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CreditRequest[];
      setCreditRequests(requestsData);

      // Fetch products for potential order creation
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CreditRequestFormData) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      const requestData: Omit<CreditRequest, 'id'> = {
        customerId: '', // Can be linked later
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        requestedAmount: parseNumber(data.requestedAmount),
        reason: data.reason,
        status: 'pending',
        notes: data.notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userProfile.id
      };

      await addDoc(collection(db, 'creditRequests'), requestData);
      toast.success('Credit request created successfully!');
      
      reset();
      setShowNewRequest(false);
      fetchData();
    } catch (error) {
      console.error('Error creating credit request:', error);
      toast.error('Failed to create credit request');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string, notes?: string) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile.id
      };

      if (newStatus === 'approved') {
        updateData.approvedAt = Timestamp.now();
        updateData.approvedBy = userProfile.id;
      } else if (newStatus === 'rejected' && notes) {
        updateData.rejectionReason = notes;
        updateData.rejectedAt = Timestamp.now();
        updateData.rejectedBy = userProfile.id;
      }

      await updateDoc(doc(db, 'creditRequests', requestId), updateData);
      toast.success(`Credit request ${newStatus} successfully!`);
      fetchData();
    } catch (error) {
      console.error('Error updating credit request:', error);
      toast.error('Failed to update credit request');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = creditRequests.filter(request => {
    const matchesSearch = request.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.customerPhone.includes(searchTerm) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalRequests: creditRequests.length,
    pendingRequests: creditRequests.filter(r => r.status === 'pending').length,
    approvedRequests: creditRequests.filter(r => r.status === 'approved').length,
    rejectedRequests: creditRequests.filter(r => r.status === 'rejected').length,
    totalRequestedAmount: creditRequests.reduce((sum, request) => sum + parseNumber(request.requestedAmount), 0),
    pendingAmount: creditRequests
      .filter(r => r.status === 'pending')
      .reduce((sum, request) => sum + parseNumber(request.requestedAmount), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading credit requests..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg mr-4">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
              <p className="text-gray-600 mt-1">Manage customer credit requests and approvals</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewRequest(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            <span>New Credit Request</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatsCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={CreditCard}
            color="blue"
          />
          <StatsCard
            title="Pending"
            value={stats.pendingRequests}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Approved"
            value={stats.approvedRequests}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Rejected"
            value={stats.rejectedRequests}
            icon={XCircle}
            color="red"
          />
          <StatsCard
            title="Total Amount"
            value={formatCurrency(stats.totalRequestedAmount)}
            icon={DollarSign}
            color="purple"
          />
          <StatsCard
            title="Pending Amount"
            value={formatCurrency(stats.pendingAmount)}
            icon={Calendar}
            color="amber"
          />
        </div>

        {!showNewRequest ? (
          <>
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by customer, phone, or reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <div className="flex items-center text-gray-600 font-medium">
                  <Filter className="h-5 w-5 mr-2" />
                  <span>{filteredRequests.length} Requests</span>
                </div>
              </div>
            </div>

            {/* Credit Requests Table */}
            {filteredRequests.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
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
                      {filteredRequests.map((request, index) => (
                        <tr key={request.id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{request.customerName}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {request.customerPhone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {formatCurrency(request.requestedAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                              {request.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(request.createdAt.toDate(), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={request.status} size="sm" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {request.status === 'pending' && (
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleUpdateStatus(request.id, 'approved')}
                                  disabled={processing}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-green-50 rounded"
                                  title="Approve Request"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Please provide a rejection reason:');
                                    if (reason) {
                                      handleUpdateStatus(request.id, 'rejected', reason);
                                    }
                                  }}
                                  disabled={processing}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-red-50 rounded"
                                  title="Reject Request"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No Credit Requests Found"
                description="No credit requests match your current filters. Try adjusting your search criteria or create a new request."
                actionLabel="Create New Request"
                onAction={() => setShowNewRequest(true)}
              />
            )}
          </>
        ) : (
          /* New Credit Request Form */
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Create New Credit Request</h2>
              <button
                onClick={() => {
                  setShowNewRequest(false);
                  reset();
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    {...register('customerName', { required: 'Customer name is required' })}
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    {...register('customerPhone', { required: 'Phone number is required' })}
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                  {errors.customerPhone && <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    {...register('customerEmail')}
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter email address (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested Amount *
                  </label>
                  <input
                    {...register('requestedAmount', { 
                      required: 'Requested amount is required',
                      min: { value: 1, message: 'Amount must be greater than 0' }
                    })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter requested amount"
                  />
                  {errors.requestedAmount && <p className="text-red-500 text-sm mt-1">{errors.requestedAmount.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Credit Request *
                </label>
                <textarea
                  {...register('reason', { required: 'Reason is required' })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Explain why credit is needed..."
                />
                {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Add any additional notes (optional)"
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={processing}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <CreditCard className="h-5 w-5" />
                  <span>{processing ? 'Creating Request...' : 'Create Credit Request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRequest(false);
                    reset();
                  }}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}