import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, Search, Phone, User, Eye } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CreditRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CreditApprovalPage() {
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { userProfile } = useAuth();

  // Helper function to safely format amount
  const formatAmount = (amount: any): string => {
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return numericAmount.toFixed(2);
  };

  useEffect(() => {
    fetchCreditRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [creditRequests, searchTerm, statusFilter]);

  const fetchCreditRequests = async () => {
    try {
      const q = query(collection(db, 'creditRequests'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CreditRequest[];
      setCreditRequests(requests);
    } catch (error) {
      console.error('Error fetching credit requests:', error);
      toast.error('Failed to fetch credit requests');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...creditRequests];

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.customerPhone.includes(searchTerm) ||
        request.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId: string) => {
    if (!userProfile) return;
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'creditRequests', requestId), {
        status: 'approved',
        approvedBy: userProfile.id,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Credit request approved successfully');
      fetchCreditRequests();
    } catch (error) {
      console.error('Error approving credit request:', error);
      toast.error('Failed to approve credit request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!userProfile || !reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'creditRequests', requestId), {
        status: 'rejected',
        approvedBy: userProfile.id,
        rejectionReason: reason,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Credit request rejected');
      setSelectedRequest(null);
      setRejectionReason('');
      fetchCreditRequests();
    } catch (error) {
      console.error('Error rejecting credit request:', error);
      toast.error('Failed to reject credit request');
    } finally {
      setProcessing(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Credit Request Management</h1>
          <p className="text-gray-600 mt-2">Review and approve customer credit requests</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="flex items-center text-gray-600">
              <span>{filteredRequests.length} Requests</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {creditRequests.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-gray-600">Pending Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {creditRequests.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-gray-600">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {creditRequests.filter(r => r.status === 'rejected').length}
                </p>
                <p className="text-gray-600">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Requests Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.customerName}</div>
                          <div className="text-sm text-gray-500">{request.customerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {request.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{formatAmount(request.requestedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                      {request.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(request.createdAt.toDate(), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1 capitalize">{request.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processing}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No credit requests found.</p>
          </div>
        )}

        {/* Rejection Modal */}
        {selectedRequest && selectedRequest.status === 'pending' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Reject Credit Request</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-medium">{selectedRequest.customerName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Amount: <span className="font-medium">₹{formatAmount(selectedRequest.requestedAmount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Reason: <span className="font-medium">{selectedRequest.reason}</span>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleReject(selectedRequest.id, rejectionReason)}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Reject Request'}
                </button>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  disabled={processing}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Rejection Reason Modal */}
        {selectedRequest && selectedRequest.status === 'rejected' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Rejection Details</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-medium">{selectedRequest.customerName}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Amount: <span className="font-medium">₹{formatAmount(selectedRequest.requestedAmount)}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Rejection Reason: <span className="font-medium">{selectedRequest.rejectionReason}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}