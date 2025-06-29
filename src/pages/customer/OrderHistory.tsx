import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Package, Clock, CheckCircle, Truck, XCircle, Eye } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile) {
      fetchOrders();
    }
  }, [userProfile]);

  const fetchOrders = async () => {
    if (!userProfile) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError('');
      
      // Query with composite index: customerId (ASC) + createdAt (DESC)
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', userProfile.id),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      
      // Handle specific Firestore index errors
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        setError('Database index is being created. Please try again in a few minutes.');
        toast.error('Database is being set up. Please try again shortly.');
      } else {
        setError('Failed to fetch order history. Please try again.');
        toast.error('Failed to fetch order history');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-indigo-500" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Orders</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchOrders}
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">Track your orders and view order details</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
            <a
              href="/products"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Placed on {format(order.createdAt.toDate(), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-2 capitalize">{order.status}</span>
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">₹{order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Payment Method</p>
                      <p className="text-sm text-gray-900 capitalize">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery Slot</p>
                      <p className="text-sm text-gray-900 capitalize">{order.deliverySlot}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items ({order.items.length})</p>
                    <div className="space-y-2">
                      {order.items.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-900">{item.name} × {item.quantity}</span>
                          <span className="text-gray-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-sm text-gray-500">
                          +{order.items.length - 2} more items
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Order ID</p>
                    <p className="text-sm text-gray-900">#{selectedOrder.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-1 capitalize">{selectedOrder.status}</span>
                    </span>
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
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Delivery Information</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-900">
                      <strong>Slot:</strong> {selectedOrder.deliverySlot}
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      <strong>Address:</strong> {selectedOrder.deliveryAddress}
                    </p>
                    {selectedOrder.notes && (
                      <p className="text-sm text-gray-900 mt-1">
                        <strong>Notes:</strong> {selectedOrder.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Order Items</p>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} {item.unit} × ₹{item.price}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>₹{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}