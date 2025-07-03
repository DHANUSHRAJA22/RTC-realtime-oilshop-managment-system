import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, onSnapshot, Timestamp, getDoc } from 'firebase/firestore';
import { ClipboardList, CheckCircle, XCircle, Clock, User, Phone, Package, AlertCircle, Search, Filter, ShoppingBag, CreditCard, Eye, X, Truck } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Order, CreditRequest, Product, OrderItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { parseNumber, formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import StatusBadge from '../../components/UI/StatusBadge';
import StatsCard from '../../components/UI/StatsCard';
import toast from 'react-hot-toast';

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [filteredData, setFilteredData] = useState<(Order | CreditRequest)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    // Set up real-time listeners
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const creditRequestsQuery = query(collection(db, 'creditRequests'), orderBy('createdAt', 'desc'));

    const unsubscribeOrders = onSnapshot(ordersQuery, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    });

    const unsubscribeCreditRequests = onSnapshot(creditRequestsQuery, (querySnapshot) => {
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CreditRequest[];
      setCreditRequests(requestsData);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCreditRequests();
    };
  }, []);

  useEffect(() => {
    filterData();
  }, [orders, creditRequests, searchTerm, statusFilter, typeFilter]);

  const filterData = () => {
    let combined: (Order | CreditRequest)[] = [];

    if (typeFilter === 'all' || typeFilter === 'orders') {
      combined = [...combined, ...orders];
    }

    if (typeFilter === 'all' || typeFilter === 'credit_requests') {
      combined = [...combined, ...creditRequests];
    }

    if (searchTerm) {
      combined = combined.filter(item =>
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerPhone.includes(searchTerm) ||
        ('items' in item && item.items.some(orderItem => 
          orderItem.name.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    if (statusFilter !== 'all') {
      combined = combined.filter(item => item.status === statusFilter);
    }

    // Sort by creation date
    combined.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

    setFilteredData(combined);
  };

  const isOrder = (item: Order | CreditRequest): item is Order => {
    return 'items' in item && 'total' in item;
  };

  const isCreditRequest = (item: Order | CreditRequest): item is CreditRequest => {
    return 'requestedAmount' in item;
  };

  const handleViewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    
    try {
      // Order items are stored as an array in the order document
      setOrderItems(order.items || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast.error('Failed to fetch order details');
      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleProceedOrder = async (order: Order) => {
    if (!userProfile) return;

    // Check if order can be proceeded
    if (order.status === 'delivered' || order.status === 'cancelled') {
      toast.error('This order has already been processed');
      return;
    }

    setProcessing(true);
    try {
      // Check stock availability for all items
      const stockChecks = await Promise.all(
        order.items.map(async (item) => {
          const productDoc = await getDoc(doc(db, 'products', item.productId));
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.name} not found`);
          }
          const product = productDoc.data() as Product;
          return {
            productId: item.productId,
            productName: item.name,
            currentStock: product.stock,
            requiredQuantity: item.quantity,
            hasEnoughStock: product.stock >= item.quantity
          };
        })
      );

      // Check if any product has insufficient stock
      const insufficientStock = stockChecks.find(check => !check.hasEnoughStock);
      if (insufficientStock) {
        toast.error(`Insufficient stock for ${insufficientStock.productName}. Available: ${insufficientStock.currentStock}, Required: ${insufficientStock.requiredQuantity}`);
        return;
      }

      // Update order status to delivered
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'delivered',
        deliveredAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        deliveredBy: userProfile.id
      });

      // Update stock for each product
      await Promise.all(
        stockChecks.map(async (check) => {
          const newStock = check.currentStock - check.requiredQuantity;
          await updateDoc(doc(db, 'products', check.productId), {
            stock: newStock,
            updatedAt: Timestamp.now()
          });
        })
      );

      toast.success('Order marked as delivered and stock updated successfully!');
    } catch (error) {
      console.error('Error proceeding order:', error);
      toast.error('Failed to proceed order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveCreditRequest = async (requestId: string, request: CreditRequest) => {
    if (!userProfile) return;

    setProcessing(true);
    try {
      // 1. Mark credit request as approved
      await updateDoc(doc(db, 'creditRequests', requestId), {
        status: 'approved',
        approvedBy: userProfile.id,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // 2. Create an order
      const orderData: Omit<Order, 'id'> = {
        customerId: request.customerId,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        items: [], // Will be populated from request details
        total: parseNumber(request.requestedAmount),
        status: 'confirmed',
        paymentMethod: 'credit',
        deliverySlot: 'TBD',
        deliveryAddress: '',
        notes: `Credit order from approved request: ${request.reason}`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // 3. Create pending payment record
      await addDoc(collection(db, 'pendingPayments'), {
        orderId: orderRef.id,
        customerId: request.customerId,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        totalAmount: parseNumber(request.requestedAmount),
        paidAmount: 0,
        pendingAmount: parseNumber(request.requestedAmount),
        paymentMethod: 'credit',
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        status: 'pending',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Credit request approved and order created successfully!');
    } catch (error) {
      console.error('Error approving credit request:', error);
      toast.error('Failed to approve credit request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCreditRequest = async (requestId: string, reason: string) => {
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
    } catch (error) {
      console.error('Error rejecting credit request:', error);
      toast.error('Failed to reject credit request');
    } finally {
      setProcessing(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    pendingCreditRequests: creditRequests.filter(r => r.status === 'pending').length,
    creditOrders: orders.filter(o => o.paymentMethod === 'credit').length,
    processingOrders: orders.filter(o => o.status === 'processing').length,
    totalRevenue: orders.reduce((sum, order) => sum + parseNumber(order.total), 0),
    pendingCreditAmount: creditRequests
      .filter(r => r.status === 'pending')
      .reduce((sum, request) => sum + parseNumber(request.requestedAmount), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading orders and credit requests..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-xl shadow-lg mr-4">
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Orders & Credit Management</h1>
              <p className="text-gray-600 mt-1">Manage all orders and credit requests in one place</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingBag}
            color="blue"
          />
          <StatsCard
            title="Pending Requests"
            value={stats.pendingCreditRequests}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Credit Orders"
            value={stats.creditOrders}
            icon={CreditCard}
            color="green"
          />
          <StatsCard
            title="Processing"
            value={stats.processingOrders}
            icon={Package}
            color="purple"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="Pending Credit"
            value={formatCurrency(stats.pendingCreditAmount)}
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer, phone, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Types</option>
              <option value="orders">Orders Only</option>
              <option value="credit_requests">Credit Requests Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex items-center text-gray-600 font-medium">
              <Filter className="h-5 w-5 mr-2" />
              <span>{filteredData.length} Records</span>
            </div>
          </div>
        </div>

        {/* Orders & Credit Requests Table */}
        {filteredData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
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
                  {filteredData.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          isOrder(item) ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                        }`}>
                          {isOrder(item) ? 'Order' : 'Credit Request'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-full mr-3">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{item.customerName}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {item.customerPhone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isOrder(item) ? (
                          <div>
                            <p className="font-semibold">{item.items.length} items</p>
                            <p className="text-gray-500 text-xs">{item.paymentMethod}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold truncate max-w-xs" title={item.reason}>{item.reason}</p>
                            <p className="text-gray-500 text-xs">Credit Request</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(isOrder(item) ? item.total : item.requestedAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(item.createdAt.toDate(), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          {isOrder(item) && (
                            <>
                              <button
                                onClick={() => handleViewOrderDetails(item)}
                                className="text-blue-600 hover:text-blue-800 transition-colors duration-200 p-1 hover:bg-blue-50 rounded"
                                title="View Order Details"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              {(item.status === 'pending' || item.status === 'confirmed' || item.status === 'processing') && (
                                <button
                                  onClick={() => handleProceedOrder(item)}
                                  disabled={processing}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-green-50 rounded"
                                  title="Proceed Order (Mark as Delivered)"
                                >
                                  <Truck className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                          {isCreditRequest(item) && item.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveCreditRequest(item.id, item)}
                                disabled={processing}
                                className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-green-50 rounded"
                                title="Approve & Create Order"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide a rejection reason:');
                                  if (reason) {
                                    handleRejectCreditRequest(item.id, reason);
                                  }
                                }}
                                disabled={processing}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors duration-200 p-1 hover:bg-red-50 rounded"
                                title="Reject Request"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No Records Found"
            description="No orders or credit requests match your current filters. Try adjusting your search criteria."
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
          />
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Order Details</h3>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setOrderItems([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Order ID</p>
                    <p className="text-sm text-gray-900">#{selectedOrder.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <StatusBadge status={selectedOrder.status} size="sm" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer</p>
                    <p className="text-sm text-gray-900">{selectedOrder.customerName}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Order Date</p>
                    <p className="text-sm text-gray-900">
                      {format(selectedOrder.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Payment Method</p>
                    <p className="text-sm text-gray-900 capitalize">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delivery Slot</p>
                    <p className="text-sm text-gray-900">{selectedOrder.deliverySlot}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h4>
                  {loadingItems ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner text="Loading order items..." />
                    </div>
                  ) : orderItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderItems.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(item.price * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No items found for this order</p>
                  )}
                </div>

                {/* Order Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Delivery Information */}
                {selectedOrder.deliveryAddress && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Delivery Address</p>
                    <p className="text-sm text-gray-900">{selectedOrder.deliveryAddress}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                    <p className="text-sm text-gray-900">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                  <div className="border-t pt-4">
                    <button
                      onClick={() => {
                        handleProceedOrder(selectedOrder);
                        setSelectedOrder(null);
                        setOrderItems([]);
                      }}
                      disabled={processing}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Truck className="h-5 w-5" />
                      <span>{processing ? 'Processing...' : 'Mark as Delivered'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
