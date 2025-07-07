import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, where, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FileText, Printer, Download, Search, Plus, Eye, Calculator, ShoppingCart, CreditCard, Banknote, Package, Edit3 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Product, Bill, BillItem, CustomBill, CustomBillItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { parseNumber, formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import StatusBadge from '../../components/UI/StatusBadge';
import toast from 'react-hot-toast';

interface BillFormData {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod: 'cash' | 'gpay' | 'credit' | 'upi';
  discountAmount: number;
  notes: string;
}

interface CustomBillFormData {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod: 'cash' | 'gpay' | 'credit' | 'upi';
  discountAmount: number;
  notes: string;
}

export default function BillingModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customBills, setCustomBills] = useState<CustomBill[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customBillItems, setCustomBillItems] = useState<CustomBillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBill, setShowNewBill] = useState(false);
  const [billType, setBillType] = useState<'regular' | 'custom'>('regular');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<BillFormData>({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      paymentMethod: 'cash',
      discountAmount: 0,
      notes: ''
    }
  });
  
  const { register: registerCustom, handleSubmit: handleSubmitCustom, reset: resetCustom, formState: { errors: errorsCustom } } = useForm<CustomBillFormData>({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      paymentMethod: 'cash',
      discountAmount: 0,
      notes: ''
    }
  });

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

      // Fetch regular bills
      const billsQuery = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
      const billsSnapshot = await getDocs(billsQuery);
      const billsData = billsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          subtotal: parseNumber(data.subtotal),
          discountAmount: parseNumber(data.discountAmount),
          totalAmount: parseNumber(data.totalAmount)
        };
      }) as Bill[];
      setBills(billsData);

      // Fetch custom bills
      const customBillsQuery = query(collection(db, 'customBills'), orderBy('createdAt', 'desc'));
      const customBillsSnapshot = await getDocs(customBillsQuery);
      const customBillsData = customBillsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          subtotal: parseNumber(data.subtotal),
          discountAmount: parseNumber(data.discountAmount),
          totalAmount: parseNumber(data.totalAmount)
        };
      }) as CustomBill[];
      setCustomBills(customBillsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const addBillItem = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock < quantity) {
      toast.error(`Insufficient stock. Available: ${product.stock} ${product.unit}`);
      return;
    }

    const existingItem = billItems.find(item => item.productId === productId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        toast.error(`Insufficient stock. Available: ${product.stock} ${product.unit}`);
        return;
      }
      setBillItems(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
          : item
      ));
    } else {
      const newItem: BillItem = {
        productId: product.id,
        productName: product.name,
        quantity,
        unit: product.unit,
        unitPrice: product.basePrice,
        totalPrice: quantity * product.basePrice
      };
      setBillItems(prev => [...prev, newItem]);
    }
  };

  const addCustomBillItem = (productName: string, quantity: number, unit: string, unitPrice: number) => {
    if (!productName.trim() || quantity <= 0 || unitPrice <= 0) {
      toast.error('Please fill all item details');
      return;
    }

    const newItem: CustomBillItem = {
      productName: productName.trim(),
      quantity,
      unit,
      unitPrice,
      totalPrice: quantity * unitPrice
    };
    setCustomBillItems(prev => [...prev, newItem]);
  };

  const removeBillItem = (productId: string) => {
    setBillItems(prev => prev.filter(item => item.productId !== productId));
  };

  const removeCustomBillItem = (index: number) => {
    setCustomBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateBillItemQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (quantity > product.stock) {
      toast.error(`Insufficient stock. Available: ${product.stock} ${product.unit}`);
      return;
    }

    setBillItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const updateCustomBillItemQuantity = (index: number, quantity: number) => {
    setCustomBillItems(prev => prev.map((item, i) =>
      i === index
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const calculateTotals = () => {
    const items = billType === 'regular' ? billItems : customBillItems;
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { subtotal };
  };

  const onSubmit = async (data: BillFormData) => {
    if (!userProfile || billItems.length === 0) {
      toast.error('Please add items to the bill');
      return;
    }

    setProcessing(true);
    try {
      const { subtotal } = calculateTotals();
      const discountAmount = parseNumber(data.discountAmount);
      const totalAmount = subtotal - discountAmount;

      const billData: Omit<Bill, 'id'> = {
        billNumber: `BILL-${Date.now()}`,
        customerId: '',
        customerName: data.customerName.trim(),
        // Only include customerPhone if it has content
        ...(data.customerPhone?.trim() ? { customerPhone: data.customerPhone.trim() } : {}),
        // Only include customerAddress if it has content
        ...(data.customerAddress?.trim() ? { customerAddress: data.customerAddress.trim() } : {}),
        items: billItems,
        subtotal: parseNumber(subtotal),
        discountAmount: parseNumber(discountAmount),
        totalAmount: parseNumber(totalAmount),
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === 'credit' ? 'pending' : 'paid',
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        notes: data.notes?.trim() || '',
        createdAt: Timestamp.now()
      };

      // Create the bill
      const billRef = await addDoc(collection(db, 'bills'), billData);

      // Update product stock for each item
      for (const item of billItems) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const productData = productDoc.data() as Product;
            const newStock = Math.max(0, productData.stock - item.quantity);
            
            await updateDoc(productRef, {
              stock: newStock,
              updatedAt: Timestamp.now()
            });
          }
        }
      }

      // If payment method is credit, create a pending payment record
      if (data.paymentMethod === 'credit') {
        await addDoc(collection(db, 'pendingPayments'), {
          billId: billRef.id,
          billNumber: billData.billNumber,
          customerId: billData.customerId,
          customerName: billData.customerName,
          customerPhone: billData.customerPhone || '',
          amount: totalAmount,
          dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      toast.success('Bill created successfully!');
      
      reset();
      setBillItems([]);
      setDiscountAmount(0);
      setShowNewBill(false);
      fetchData();
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
    } finally {
      setProcessing(false);
    }
  };

  const onSubmitCustom = async (data: CustomBillFormData) => {
    if (!userProfile || customBillItems.length === 0) {
      toast.error('Please add items to the custom bill');
      return;
    }

    setProcessing(true);
    try {
      const { subtotal } = calculateTotals();
      const discountAmount = parseNumber(data.discountAmount);
      const totalAmount = subtotal - discountAmount;

      const customBillData: Omit<CustomBill, 'id'> = {
        billNumber: `CUSTOM-${Date.now()}`,
        customerName: data.customerName.trim(),
        // Only include customerPhone if it has content
        ...(data.customerPhone?.trim() ? { customerPhone: data.customerPhone.trim() } : {}),
        // Only include customerAddress if it has content
        ...(data.customerAddress?.trim() ? { customerAddress: data.customerAddress.trim() } : {}),
        items: customBillItems,
        subtotal: parseNumber(subtotal),
        discountAmount: parseNumber(discountAmount),
        totalAmount: parseNumber(totalAmount),
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentMethod === 'credit' ? 'pending' : 'paid',
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        notes: data.notes?.trim() || '',
        createdAt: Timestamp.now()
      };

      // Create the custom bill
      await addDoc(collection(db, 'customBills'), customBillData);

      toast.success('Custom bill created successfully!');
      
      resetCustom();
      setCustomBillItems([]);
      setDiscountAmount(0);
      setShowNewBill(false);
      fetchData();
    } catch (error) {
      console.error('Error creating custom bill:', error);
      toast.error('Failed to create custom bill');
    } finally {
      setProcessing(false);
    }
  };

  const exportToExcel = () => {
    const allBills = [...bills, ...customBills];
    const headers = ['Bill Number', 'Customer', 'Date', 'Total Amount', 'Payment Method', 'Status', 'Type'];
    const csvData = allBills.map(bill => [
      bill.billNumber,
      bill.customerName,
      format(bill.createdAt.toDate(), 'yyyy-MM-dd'),
      formatCurrency(bill.totalAmount),
      bill.paymentMethod.toUpperCase(),
      bill.paymentStatus.toUpperCase(),
      bill.billNumber.startsWith('CUSTOM-') ? 'Custom' : 'Regular'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewBill = (billId: string, isCustom: boolean = false) => {
    if (isCustom) {
      navigate(`/custom-bills/${billId}`);
    } else {
      navigate(`/bills/${billId}`);
    }
  };

  const handlePrintBill = (billId: string, isCustom: boolean = false) => {
    if (isCustom) {
      navigate(`/custom-bills/${billId}/print`);
    } else {
      navigate(`/bills/${billId}/print`);
    }
  };

  const allBills = [...bills, ...customBills].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  const filteredBills = allBills.filter(bill =>
    bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bill.customerPhone && bill.customerPhone.includes(searchTerm))
  );

  const getTotalAmount = () => {
    const { subtotal } = calculateTotals();
    return subtotal - discountAmount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="xl" text="Loading billing data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-xl shadow-lg mr-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing Module</h1>
              <p className="text-gray-600 mt-1">Create and manage customer bills</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => {
                setBillType('regular');
                setShowNewBill(true);
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Package className="h-5 w-5" />
              <span>New Bill</span>
            </button>
            <button
              onClick={() => {
                setBillType('custom');
                setShowNewBill(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Edit3 className="h-5 w-5" />
              <span>Custom Bill</span>
            </button>
            <button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {!showNewBill ? (
          <>
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by customer name, phone, or bill number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="flex items-center space-x-2 text-gray-600 font-medium">
                  <FileText className="h-5 w-5" />
                  <span>{filteredBills.length} Bills</span>
                </div>
              </div>
            </div>

            {/* Bills Table */}
            {filteredBills.length > 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredBills.map((bill, index) => {
                        const isCustom = bill.billNumber.startsWith('CUSTOM-');
                        return (
                          <tr key={bill.id} className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {bill.billNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{bill.customerName}</div>
                              <div className="text-sm text-gray-500">{bill.customerPhone || 'No phone'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(bill.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrency(bill.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {bill.paymentMethod === 'cash' && <Banknote className="h-4 w-4 text-green-600" />}
                                {bill.paymentMethod === 'credit' && <CreditCard className="h-4 w-4 text-red-600" />}
                                {(bill.paymentMethod === 'gpay' || bill.paymentMethod === 'upi') && <ShoppingCart className="h-4 w-4 text-blue-600" />}
                                <span className="text-sm font-medium capitalize">{bill.paymentMethod}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={bill.paymentStatus} size="sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isCustom ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {isCustom ? 'Custom' : 'Regular'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleViewBill(bill.id, isCustom)}
                                  className="text-amber-600 hover:text-amber-800 transition-colors duration-200"
                                  title="View Details"
                                >
                                  <Eye className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handlePrintBill(bill.id, isCustom)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                  title="Print Bill"
                                >
                                  <Printer className="h-5 w-5" />
                                </button>
                              </div>
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
                icon={FileText}
                title="No Bills Found"
                description="No bills match your search criteria. Try adjusting your search terms or create a new bill."
                actionLabel="Create New Bill"
                onAction={() => setShowNewBill(true)}
              />
            )}
          </>
        ) : (
          /* New Bill Form */
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {billType === 'regular' ? 'Create New Bill' : 'Create Custom Bill'}
                </h2>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setBillType('regular')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      billType === 'regular'
                        ? 'bg-white text-amber-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Package className="h-4 w-4 inline mr-2" />
                    Regular Bill
                  </button>
                  <button
                    onClick={() => setBillType('custom')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      billType === 'custom'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit3 className="h-4 w-4 inline mr-2" />
                    Custom Bill
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewBill(false);
                  setBillItems([]);
                  setCustomBillItems([]);
                  setDiscountAmount(0);
                  reset();
                  resetCustom();
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={billType === 'regular' ? handleSubmit(onSubmit) : handleSubmitCustom(onSubmitCustom)} className="space-y-8">
              {/* Customer Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      {...(billType === 'regular' ? register('customerName', { required: 'Customer name is required' }) : registerCustom('customerName', { required: 'Customer name is required' }))}
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter customer name"
                    />
                    {(billType === 'regular' ? errors.customerName : errorsCustom.customerName) && 
                      <p className="text-red-500 text-sm mt-1">{(billType === 'regular' ? errors.customerName?.message : errorsCustom.customerName?.message)}</p>
                    }
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      {...(billType === 'regular' ? register('customerPhone') : registerCustom('customerPhone'))}
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter phone number (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      {...(billType === 'regular' ? register('paymentMethod', { required: 'Payment method is required' }) : registerCustom('paymentMethod', { required: 'Payment method is required' }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="gpay">GPay</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                    </select>
                    {(billType === 'regular' ? errors.paymentMethod : errorsCustom.paymentMethod) && 
                      <p className="text-red-500 text-sm mt-1">{(billType === 'regular' ? errors.paymentMethod?.message : errorsCustom.paymentMethod?.message)}</p>
                    }
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Address (Optional)
                  </label>
                  <textarea
                    {...(billType === 'regular' ? register('customerAddress') : registerCustom('customerAddress'))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter customer address (optional)"
                  />
                </div>
              </div>

              {/* Add Products/Items */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {billType === 'regular' ? 'Add Products' : 'Add Custom Items'}
                </h3>
                
                {billType === 'regular' ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <select
                      id="product-select"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select Product</option>
                      {products.filter(p => p.stock > 0).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.basePrice)}/{product.unit} (Stock: {product.stock})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="Quantity"
                      id="quantity-input"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const productSelect = document.getElementById('product-select') as HTMLSelectElement;
                        const quantityInput = document.getElementById('quantity-input') as HTMLInputElement;
                        if (productSelect.value && quantityInput.value) {
                          addBillItem(productSelect.value, parseFloat(quantityInput.value));
                          productSelect.value = '';
                          quantityInput.value = '';
                        }
                      }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Add Item
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                    <input
                      type="text"
                      placeholder="Product Name"
                      id="custom-product-name"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="Quantity"
                      id="custom-quantity"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <select
                      id="custom-unit"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Unit</option>
                      <option value="L">Litres</option>
                      <option value="KG">Kilograms</option>
                      <option value="PCS">Pieces</option>
                      <option value="BOX">Box</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Unit Price"
                      id="custom-unit-price"
                      className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nameInput = document.getElementById('custom-product-name') as HTMLInputElement;
                        const quantityInput = document.getElementById('custom-quantity') as HTMLInputElement;
                        const unitSelect = document.getElementById('custom-unit') as HTMLSelectElement;
                        const priceInput = document.getElementById('custom-unit-price') as HTMLInputElement;
                        
                        if (nameInput.value && quantityInput.value && unitSelect.value && priceInput.value) {
                          addCustomBillItem(
                            nameInput.value,
                            parseFloat(quantityInput.value),
                            unitSelect.value,
                            parseFloat(priceInput.value)
                          );
                          nameInput.value = '';
                          quantityInput.value = '';
                          unitSelect.value = '';
                          priceInput.value = '';
                        }
                      }}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Add Item
                    </button>
                  </div>
                )}

                {/* Bill Items */}
                {((billType === 'regular' && billItems.length > 0) || (billType === 'custom' && customBillItems.length > 0)) && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {(billType === 'regular' ? billItems : customBillItems).map((item, index) => (
                          <tr key={billType === 'regular' ? (item as BillItem).productId : index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    if (billType === 'regular') {
                                      updateBillItemQuantity((item as BillItem).productId!, parseFloat(e.target.value) || 0);
                                    } else {
                                      updateCustomBillItemQuantity(index, parseFloat(e.target.value) || 0);
                                    }
                                  }}
                                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                                <span className="text-gray-500">{item.unit}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  if (billType === 'regular') {
                                    removeBillItem((item as BillItem).productId!);
                                  } else {
                                    removeCustomBillItem(index);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              {((billType === 'regular' && billItems.length > 0) || (billType === 'custom' && customBillItems.length > 0)) && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-4">
                      <div className="flex justify-between text-lg">
                        <span className="font-medium">Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(calculateTotals().subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-medium">Discount:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">₹</span>
                          <input
                            {...(billType === 'regular' ? register('discountAmount') : registerCustom('discountAmount'))}
                            type="number"
                            step="0.01"
                            min="0"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(parseNumber(e.target.value))}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-xl border-t border-gray-300 pt-4">
                        <span>Total:</span>
                        <span className="text-amber-600">{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  {...(billType === 'regular' ? register('notes') : registerCustom('notes'))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                  placeholder="Add any additional notes (optional)"
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={processing || ((billType === 'regular' && billItems.length === 0) || (billType === 'custom' && customBillItems.length === 0))}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Calculator className="h-5 w-5" />
                  <span>{processing ? 'Creating Bill...' : `Create ${billType === 'regular' ? 'Bill' : 'Custom Bill'}`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewBill(false);
                    setBillItems([]);
                    setCustomBillItems([]);
                    setDiscountAmount(0);
                    reset();
                    resetCustom();
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