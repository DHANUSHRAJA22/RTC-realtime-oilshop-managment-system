import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Clock, DollarSign, User, Phone, Calendar, CheckCircle, AlertTriangle, Search, Filter, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { PendingPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format, isAfter, differenceInDays } from 'date-fns';
import { parseNumber, formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import StatusBadge from '../../components/UI/StatusBadge';
import StatsCard from '../../components/UI/StatsCard';
import toast from 'react-hot-toast';

export default function PendingPayments() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const paymentsQuery = query(
        collection(db, 'pendingPayments'), 
        orderBy('dueDate', 'asc')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendingPayment[];
      
      setPendingPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      toast.error('Failed to fetch pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.pendingAmount.toString());
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!userProfile || !selectedPayment) return;

    const receivedAmount = parseNumber(paymentAmount);
    if (receivedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (receivedAmount > selectedPayment.pendingAmount) {
      toast.error('Amount cannot exceed pending amount');
      return;
    }

    setProcessing(true);
    try {
      const newPaidAmount = parseNumber(selectedPayment.paidAmount) + receivedAmount;
      const newPendingAmount = parseNumber(selectedPayment.totalAmount) - newPaidAmount;
      const newStatus = newPendingAmount <= 0 ? 'paid' : 'partial';

      const updateData: any = {
        paidAmount: newPaidAmount,
        pendingAmount: Math.max(0, newPendingAmount),
        status: newStatus,
        updatedAt: Timestamp.now(),
        updatedBy: userProfile.id
      };

      if (newStatus === 'paid') {
        updateData.paidAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'pendingPayments', selectedPayment.id), updateData);
      
      toast.success(newStatus === 'paid' ? 'Payment marked as paid!' : 'Partial payment recorded!');
      
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentAmount('');
      fetchPendingPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentStatus = (payment: PendingPayment): string => {
    if (payment.status === 'paid') return 'paid';
    if (payment.status === 'partial') return 'partial';
    
    const dueDate = payment.dueDate.toDate();
    const today = new Date();
    
    if (isAfter(today, dueDate)) {
      return 'overdue';
    }
    
    const daysUntilDue = differenceInDays(dueDate, today);
    if (daysUntilDue <= 7) {
      return 'due_soon';
    }
    
    return 'pending';
  };

  const filteredPayments = pendingPayments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.customerPhone.includes(searchTerm);
    
    const paymentStatus = getPaymentStatus(payment);
    const matchesStatus = statusFilter === 'all' || paymentStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalPayments: pendingPayments.length,
    pendingPayments: pendingPayments.filter(p => getPaymentStatus(p) === 'pending').length,
    overduePayments: pendingPayments.filter(p => getPaymentStatus(p) === 'overdue').length,
    dueSoonPayments: pendingPayments.filter(p => getPaymentStatus(p) === 'due_soon').length,
    totalAmount: pendingPayments.reduce((sum, payment) => sum + parseNumber(payment.totalAmount), 0),
    overdueAmount: pendingPayments
      .filter(p => getPaymentStatus(p) === 'overdue')
      .reduce((sum, payment) => sum + parseNumber(payment.pendingAmount), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading pending payments..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl shadow-lg mr-4">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pending Payments</h1>
              <p className="text-gray-600 mt-1">Track and manage outstanding customer payments</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatsCard
            title="Total Payments"
            value={stats.totalPayments}
            icon={DollarSign}
            color="blue"
          />
          <StatsCard
            title="Pending"
            value={stats.pendingPayments}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Overdue"
            value={stats.overduePayments}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="Due Soon"
            value={stats.dueSoonPayments}
            icon={Calendar}
            color="amber"
          />
          <StatsCard
            title="Total Amount"
            value={formatCurrency(stats.totalAmount)}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Overdue Amount"
            value={formatCurrency(stats.overdueAmount)}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>

            <div className="flex items-center text-gray-600 font-medium">
              <Filter className="h-5 w-5 mr-2" />
              <span>{filteredPayments.length} Payments</span>
            </div>
          </div>
        </div>

        {/* Pending Payments Table */}
        {filteredPayments.length > 0 ? (
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
                      Due Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Days
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
                  {filteredPayments.map((payment, index) => {
                    const paymentStatus = getPaymentStatus(payment);
                    const dueDate = payment.dueDate.toDate();
                    const daysUntilDue = differenceInDays(dueDate, new Date());
                    const remainingAmount = parseNumber(payment.pendingAmount);
                    
                    return (
                      <tr key={payment.id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-gray-100 p-2 rounded-full mr-3">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{payment.customerName}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {payment.customerPhone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(remainingAmount)}
                          </div>
                          {parseNumber(payment.paidAmount) > 0 && (
                            <div className="text-xs text-green-600">
                              Paid: {formatCurrency(payment.paidAmount)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(dueDate, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            daysUntilDue < 0 ? 'text-red-600' : 
                            daysUntilDue <= 7 ? 'text-amber-600' : 
                            'text-green-600'
                          }`}>
                            {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} overdue` : 
                             daysUntilDue === 0 ? 'Due today' : 
                             `${daysUntilDue} days`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge 
                            status={paymentStatus === 'due_soon' ? 'pending' : paymentStatus} 
                            size="sm" 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(paymentStatus === 'pending' || paymentStatus === 'due_soon' || paymentStatus === 'overdue' || paymentStatus === 'partial') && (
                            <button
                              onClick={() => handleMarkAsPaid(payment)}
                              disabled={processing}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-green-50 rounded flex items-center space-x-1"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-5 w-5" />
                              <span className="hidden sm:inline">Mark Paid</span>
                            </button>
                          )}
                          {paymentStatus === 'paid' && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No Pending Payments Found"
            description="No pending payments match your current filters. All payments may be up to date!"
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Record Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-medium">{selectedPayment.customerName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Total Amount: <span className="font-medium">{formatCurrency(selectedPayment.totalAmount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Already Paid: <span className="font-medium">{formatCurrency(selectedPayment.paidAmount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Pending Amount: <span className="font-medium text-red-600">{formatCurrency(selectedPayment.pendingAmount)}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedPayment.pendingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter amount received"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {formatCurrency(selectedPayment.pendingAmount)}
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={processPayment}
                  disabled={processing || !paymentAmount || parseNumber(paymentAmount) <= 0}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{processing ? 'Processing...' : 'Record Payment'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentAmount('');
                  }}
                  disabled={processing}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}