import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { Package, AlertTriangle, Plus, TrendingUp, TrendingDown, RefreshCw, Send } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Product, StockAdjustment, TransferRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface AdjustmentFormData {
  productId: string;
  adjustmentType: 'increase' | 'decrease' | 'correction';
  quantity: number;
  reason: string;
  reasonCode: 'damaged' | 'expired' | 'theft' | 'recount' | 'supplier_return' | 'other';
}

interface TransferFormData {
  productId: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
  reason: string;
}

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'adjustments' | 'transfers'>('inventory');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { userProfile } = useAuth();

  const { register: registerAdjustment, handleSubmit: handleAdjustmentSubmit, reset: resetAdjustment, formState: { errors: adjustmentErrors } } = useForm<AdjustmentFormData>();
  const { register: registerTransfer, handleSubmit: handleTransferSubmit, reset: resetTransfer, formState: { errors: transferErrors } } = useForm<TransferFormData>();

  const warehouses = ['Main Store', 'Warehouse A', 'Warehouse B', 'Godown 1', 'Godown 2'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);

      // Fetch stock adjustments
      const adjustmentsQuery = query(collection(db, 'stockAdjustments'), orderBy('createdAt', 'desc'));
      const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
      const adjustmentsData = adjustmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockAdjustment[];
      setAdjustments(adjustmentsData);

      // Fetch transfer requests
      const transfersQuery = query(collection(db, 'transferRequests'), orderBy('createdAt', 'desc'));
      const transfersSnapshot = await getDocs(transfersQuery);
      const transfersData = transfersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransferRequest[];
      setTransfers(transfersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const onAdjustmentSubmit = async (data: AdjustmentFormData) => {
    if (!userProfile) return;

    const product = products.find(p => p.id === data.productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    setProcessing(true);
    try {
      let newStock = product.stock;
      if (data.adjustmentType === 'increase') {
        newStock += data.quantity;
      } else if (data.adjustmentType === 'decrease') {
        newStock -= data.quantity;
      } else {
        newStock = data.quantity; // correction
      }

      if (newStock < 0) {
        toast.error('Stock cannot be negative');
        return;
      }

      const adjustmentData: Omit<StockAdjustment, 'id'> = {
        productId: product.id,
        productName: product.name,
        adjustmentType: data.adjustmentType,
        quantity: data.quantity,
        unit: product.unit,
        reason: data.reason,
        reasonCode: data.reasonCode,
        previousStock: product.stock,
        newStock,
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        status: 'approved', // Auto-approve for staff
        createdAt: Timestamp.now(),
        approvedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'stockAdjustments'), adjustmentData);
      
      // Update product stock
      await updateDoc(doc(db, 'products', product.id), {
        stock: newStock,
        updatedAt: Timestamp.now()
      });

      toast.success('Stock adjustment created successfully!');
      resetAdjustment();
      setShowAdjustmentForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating stock adjustment:', error);
      toast.error('Failed to create stock adjustment');
    } finally {
      setProcessing(false);
    }
  };

  const onTransferSubmit = async (data: TransferFormData) => {
    if (!userProfile) return;

    const product = products.find(p => p.id === data.productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    if (data.quantity > product.stock) {
      toast.error('Insufficient stock for transfer');
      return;
    }

    setProcessing(true);
    try {
      const transferData: Omit<TransferRequest, 'id'> = {
        fromWarehouse: data.fromWarehouse,
        toWarehouse: data.toWarehouse,
        productId: product.id,
        productName: product.name,
        quantity: data.quantity,
        unit: product.unit,
        reason: data.reason,
        requestedBy: userProfile.id,
        requestedByName: userProfile.profile.name,
        status: 'pending',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'transferRequests'), transferData);
      toast.success('Transfer request submitted successfully!');
      resetTransfer();
      setShowTransferForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating transfer request:', error);
      toast.error('Failed to create transfer request');
    } finally {
      setProcessing(false);
    }
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= product.lowStockAlert);
  };

  const getOutOfStockProducts = () => {
    return products.filter(product => product.stock === 0);
  };

  const getTotalInventoryValue = () => {
    return products.reduce((total, product) => total + (product.stock * product.basePrice), 0);
  };

  const getStockStatusColor = (product: Product) => {
    if (product.stock === 0) return 'text-red-600';
    if (product.stock <= product.lowStockAlert) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'correction':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
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
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-amber-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAdjustmentForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Stock Adjustment</span>
            </button>
            <button
              onClick={() => setShowTransferForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Transfer Request</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                <p className="text-gray-600">Total Products</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{getLowStockProducts().length}</p>
                <p className="text-gray-600">Low Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{getOutOfStockProducts().length}</p>
                <p className="text-gray-600">Out of Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">₹{getTotalInventoryValue().toFixed(2)}</p>
                <p className="text-gray-600">Inventory Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'inventory'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inventory Dashboard
              </button>
              <button
                onClick={() => setActiveTab('adjustments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'adjustments'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Stock Adjustments
              </button>
              <button
                onClick={() => setActiveTab('transfers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transfers'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transfer Requests
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'inventory' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Low Stock Alert
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={product.imageURL || 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500 capitalize">{product.packaging}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 capitalize">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getStockStatusColor(product)}`}>
                            {product.stock} {product.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.lowStockAlert} {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.basePrice}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(product.stock * product.basePrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.stock === 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : product.stock <= product.lowStockAlert ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'adjustments' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adjustments.map((adjustment) => (
                      <tr key={adjustment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(adjustment.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {adjustment.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getAdjustmentIcon(adjustment.adjustmentType)}
                            <span className="ml-2 text-sm capitalize">{adjustment.adjustmentType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {adjustment.quantity} {adjustment.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {adjustment.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {adjustment.staffName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            adjustment.status === 'approved' ? 'bg-green-100 text-green-800' :
                            adjustment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {adjustment.status.charAt(0).toUpperCase() + adjustment.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'transfers' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(transfer.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.fromWarehouse}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.toWarehouse}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.quantity} {transfer.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.requestedByName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transfer.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            transfer.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                            transfer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transfer.status.replace('_', ' ').charAt(0).toUpperCase() + transfer.status.replace('_', ' ').slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stock Adjustment Modal */}
        {showAdjustmentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create Stock Adjustment</h3>
              
              <form onSubmit={handleAdjustmentSubmit(onAdjustmentSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product *
                  </label>
                  <select
                    {...registerAdjustment('productId', { required: 'Product is required' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Current: {product.stock} {product.unit})
                      </option>
                    ))}
                  </select>
                  {adjustmentErrors.productId && <p className="text-red-500 text-sm mt-1">{adjustmentErrors.productId.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjustment Type *
                  </label>
                  <select
                    {...registerAdjustment('adjustmentType', { required: 'Adjustment type is required' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Type</option>
                    <option value="increase">Increase Stock</option>
                    <option value="decrease">Decrease Stock</option>
                    <option value="correction">Stock Correction</option>
                  </select>
                  {adjustmentErrors.adjustmentType && <p className="text-red-500 text-sm mt-1">{adjustmentErrors.adjustmentType.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    {...registerAdjustment('quantity', { required: 'Quantity is required', min: 0.1 })}
                    type="number"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  {adjustmentErrors.quantity && <p className="text-red-500 text-sm mt-1">{adjustmentErrors.quantity.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason Code *
                  </label>
                  <select
                    {...registerAdjustment('reasonCode', { required: 'Reason code is required' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Reason Code</option>
                    <option value="damaged">Damaged</option>
                    <option value="expired">Expired</option>
                    <option value="theft">Theft</option>
                    <option value="recount">Recount</option>
                    <option value="supplier_return">Supplier Return</option>
                    <option value="other">Other</option>
                  </select>
                  {adjustmentErrors.reasonCode && <p className="text-red-500 text-sm mt-1">{adjustmentErrors.reasonCode.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    {...registerAdjustment('reason', { required: 'Reason is required' })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Provide detailed reason for adjustment..."
                  />
                  {adjustmentErrors.reason && <p className="text-red-500 text-sm mt-1">{adjustmentErrors.reason.message}</p>}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {processing ? 'Creating...' : 'Create Adjustment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustmentForm(false);
                      resetAdjustment();
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Request Modal */}
        {showTransferForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Create Transfer Request</h3>
              
              <form onSubmit={handleTransferSubmit(onTransferSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product *
                  </label>
                  <select
                    {...registerTransfer('productId', { required: 'Product is required' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Available: {product.stock} {product.unit})
                      </option>
                    ))}
                  </select>
                  {transferErrors.productId && <p className="text-red-500 text-sm mt-1">{transferErrors.productId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Warehouse *
                    </label>
                    <select
                      {...registerTransfer('fromWarehouse', { required: 'From warehouse is required' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                      ))}
                    </select>
                    {transferErrors.fromWarehouse && <p className="text-red-500 text-sm mt-1">{transferErrors.fromWarehouse.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Warehouse *
                    </label>
                    <select
                      {...registerTransfer('toWarehouse', { required: 'To warehouse is required' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                      ))}
                    </select>
                    {transferErrors.toWarehouse && <p className="text-red-500 text-sm mt-1">{transferErrors.toWarehouse.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    {...registerTransfer('quantity', { required: 'Quantity is required', min: 0.1 })}
                    type="number"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  {transferErrors.quantity && <p className="text-red-500 text-sm mt-1">{transferErrors.quantity.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <textarea
                    {...registerTransfer('reason', { required: 'Reason is required' })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Provide reason for transfer..."
                  />
                  {transferErrors.reason && <p className="text-red-500 text-sm mt-1">{transferErrors.reason.message}</p>}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {processing ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransferForm(false);
                      resetTransfer();
                    }}
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