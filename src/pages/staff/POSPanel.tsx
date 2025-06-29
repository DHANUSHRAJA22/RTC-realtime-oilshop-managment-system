import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { ShoppingCart, Calculator, CreditCard, Smartphone, Banknote, User, Phone, Package } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Product, Sale, CustomerCredit, CreditTransaction, PendingPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatAmount, parseNumber, parseInteger, isValidInteger } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import EmptyState from '../../components/UI/EmptyState';
import toast from 'react-hot-toast';

interface SaleFormData {
  productId: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  paymentMethod: 'CASH' | 'GPAY' | 'CREDIT';
  paidAmount?: number;
}

export default function POSPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [saleData, setSaleData] = useState<any>(null);
  const { userProfile } = useAuth();
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<SaleFormData>();
  
  const watchedValues = watch();
  const totalAmount = selectedProduct && watchedValues.quantity 
    ? selectedProduct.basePrice * parseInteger(watchedValues.quantity)
    : 0;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setValue('quantity', 1);
  };

  const validateStock = (quantity: number) => {
    if (!selectedProduct) return false;
    const intQuantity = parseInteger(quantity);
    return intQuantity <= selectedProduct.stock && intQuantity >= 1;
  };

  const onSubmit = async (data: SaleFormData) => {
    if (!selectedProduct || !userProfile) return;
    
    const intQuantity = parseInteger(data.quantity);
    
    if (!isValidInteger(intQuantity)) {
      toast.error('Quantity must be a whole number (integer) greater than 0');
      return;
    }
    
    if (!validateStock(intQuantity)) {
      toast.error('Insufficient stock available or invalid quantity');
      return;
    }

    const calculatedTotal = selectedProduct.basePrice * intQuantity;
    let paidAmount = calculatedTotal;
    let creditAmount = 0;

    // Apply credit logic for both CASH and GPAY when paid amount is less than total
    if (data.paymentMethod === 'CREDIT') {
      paidAmount = 0;
      creditAmount = calculatedTotal;
    } else if ((data.paymentMethod === 'CASH' || data.paymentMethod === 'GPAY') && data.paidAmount && data.paidAmount < calculatedTotal) {
      paidAmount = parseNumber(data.paidAmount, 0);
      creditAmount = calculatedTotal - paidAmount;
    }

    const saleInfo = {
      ...data,
      quantity: intQuantity,
      productName: selectedProduct.name,
      unitPrice: selectedProduct.basePrice,
      unit: selectedProduct.unit,
      totalAmount: parseNumber(calculatedTotal),
      paidAmount: parseNumber(paidAmount),
      creditAmount: parseNumber(creditAmount),
      staffName: userProfile.profile.name
    };

    setSaleData(saleInfo);
    setShowSummary(true);
  };

  const confirmSale = async () => {
    if (!saleData || !selectedProduct || !userProfile) return;
    
    setProcessing(true);
    try {
      // Create sale record with properly typed numeric values
      const saleRecord: Omit<Sale, 'id'> = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        quantity: parseInteger(saleData.quantity),
        unit: selectedProduct.unit,
        unitPrice: parseNumber(selectedProduct.basePrice),
        totalAmount: parseNumber(saleData.totalAmount),
        paidAmount: parseNumber(saleData.paidAmount, 0),
        creditAmount: parseNumber(saleData.creditAmount, 0),
        paymentMethod: saleData.paymentMethod,
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        createdAt: Timestamp.now()
      };

      const saleDocRef = await addDoc(collection(db, 'sales'), saleRecord);

      // Update product stock
      const newStock = selectedProduct.stock - parseInteger(saleData.quantity);
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        stock: newStock,
        updatedAt: Timestamp.now()
      });

      // Handle credit if applicable
      if (parseNumber(saleData.creditAmount, 0) > 0) {
        await updateCustomerCredit(saleData.customerName, saleData.customerPhone, parseNumber(saleData.creditAmount), saleDocRef.id);
      }

      // Create pending payment record if there's a pending amount
      const pendingAmount = parseNumber(saleData.totalAmount) - parseNumber(saleData.paidAmount, 0);
      if (pendingAmount > 0) {
        await createPendingPayment(saleDocRef.id, saleData, pendingAmount);
      }

      toast.success('Sale completed successfully!');
      
      // Reset form and state
      reset();
      setSelectedProduct(null);
      setShowSummary(false);
      setSaleData(null);
      fetchProducts(); // Refresh products to update stock
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const createPendingPayment = async (saleId: string, saleData: any, pendingAmount: number) => {
    if (!userProfile) return;

    try {
      const pendingPaymentData: Omit<PendingPayment, 'id'> = {
        saleId,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone,
        productName: saleData.productName,
        totalAmount: parseNumber(saleData.totalAmount),
        paidAmount: parseNumber(saleData.paidAmount, 0),
        pendingAmount: parseNumber(pendingAmount),
        paymentMethod: saleData.paymentMethod,
        staffId: userProfile.id,
        staffName: userProfile.profile.name,
        status: 'pending',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'pendingPayments'), pendingPaymentData);
    } catch (error) {
      console.error('Error creating pending payment:', error);
      throw error;
    }
  };

  const updateCustomerCredit = async (customerName: string, customerPhone: string, creditAmount: number, saleId: string) => {
    const creditDocRef = doc(db, 'customerCredits', customerPhone);
    
    try {
      const creditDoc = await getDoc(creditDocRef);
      
      const newTransaction: CreditTransaction = {
        id: Date.now().toString(),
        type: 'debit',
        amount: parseNumber(creditAmount),
        description: `Sale - ${saleData.productName}`,
        saleId,
        createdAt: Timestamp.now()
      };

      if (creditDoc.exists()) {
        const existingCredit = creditDoc.data() as CustomerCredit;
        const updatedCredit: CustomerCredit = {
          ...existingCredit,
          totalCredit: parseNumber(existingCredit.totalCredit, 0) + parseNumber(creditAmount),
          transactions: [...existingCredit.transactions, newTransaction],
          lastUpdated: Timestamp.now()
        };
        await updateDoc(creditDocRef, updatedCredit);
      } else {
        const newCredit: CustomerCredit = {
          id: customerPhone,
          customerName,
          customerPhone,
          totalCredit: parseNumber(creditAmount),
          transactions: [newTransaction],
          lastUpdated: Timestamp.now()
        };
        await setDoc(creditDocRef, newCredit);
      }
    } catch (error) {
      console.error('Error updating customer credit:', error);
      throw error;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon={Package}
            title="No Products Available"
            description="There are no products in stock available for sale. Please check with the inventory manager."
            actionLabel="Refresh Products"
            onAction={fetchProducts}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center mb-8">
          <ShoppingCart className="h-8 w-8 text-amber-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
        </div>

        {!showSummary ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Product *
                </label>
                <select
                  {...register('productId', { required: 'Please select a product' })}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors duration-200"
                >
                  <option value="">Choose a product...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ₹{product.basePrice}/{product.unit} (Stock: {product.stock} {product.unit})
                    </option>
                  ))}
                </select>
                {errors.productId && <p className="text-red-500 text-sm mt-2">{errors.productId.message}</p>}
              </div>

              {selectedProduct && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-6">
                    <img
                      src={selectedProduct.imageData || selectedProduct.imageURL || 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100'}
                      alt={selectedProduct.name}
                      className="w-20 h-20 object-cover rounded-lg shadow-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100') {
                          target.src = 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100';
                        }
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedProduct.name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Price:</span> ₹{selectedProduct.basePrice} per {selectedProduct.unit}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Available:</span> {selectedProduct.stock} {selectedProduct.unit}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Category:</span> {selectedProduct.category}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Packaging:</span> {selectedProduct.packaging}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <User className="inline h-5 w-5 mr-2 text-amber-600" />
                    Customer Name *
                  </label>
                  <input
                    {...register('customerName', { required: 'Customer name is required' })}
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors duration-200"
                    placeholder="Enter customer name"
                  />
                  {errors.customerName && <p className="text-red-500 text-sm mt-2">{errors.customerName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Phone className="inline h-5 w-5 mr-2 text-amber-600" />
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors duration-200"
                    placeholder="Enter phone number"
                  />
                  {errors.customerPhone && <p className="text-red-500 text-sm mt-2">{errors.customerPhone.message}</p>}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quantity ({selectedProduct?.unit || 'Unit'}) - Whole Numbers Only *
                </label>
                <input
                  {...register('quantity', { 
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' },
                    validate: (value) => {
                      const intValue = parseInteger(value);
                      if (!Number.isInteger(intValue) || intValue < 1) {
                        return 'Quantity must be a whole number (integer) greater than 0';
                      }
                      if (!validateStock(intValue)) {
                        return 'Insufficient stock available';
                      }
                      return true;
                    }
                  })}
                  type="number"
                  min="1"
                  step="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors duration-200"
                  placeholder="Enter quantity (whole numbers only)"
                />
                {errors.quantity && <p className="text-red-500 text-sm mt-2">{errors.quantity.message}</p>}
                <p className="text-xs text-gray-500 mt-1">Note: Only whole numbers (integers) are allowed for quantity</p>
              </div>

              {/* Price Calculation */}
              {totalAmount > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between text-xl font-semibold">
                    <span className="flex items-center text-gray-700">
                      <Calculator className="h-6 w-6 mr-3 text-amber-600" />
                      Total Amount:
                    </span>
                    <span className="text-amber-600 text-2xl">₹{formatAmount(totalAmount)}</span>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Payment Method *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                    <input
                      {...register('paymentMethod', { required: 'Please select payment method' })}
                      type="radio"
                      value="CASH"
                      className="sr-only"
                    />
                    <Banknote className="h-6 w-6 mr-3 text-green-600" />
                    <span className="font-medium">Cash</span>
                  </label>
                  
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                    <input
                      {...register('paymentMethod', { required: 'Please select payment method' })}
                      type="radio"
                      value="GPAY"
                      className="sr-only"
                    />
                    <Smartphone className="h-6 w-6 mr-3 text-blue-600" />
                    <span className="font-medium">GPay</span>
                  </label>
                  
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                    <input
                      {...register('paymentMethod', { required: 'Please select payment method' })}
                      type="radio"
                      value="CREDIT"
                      className="sr-only"
                    />
                    <CreditCard className="h-6 w-6 mr-3 text-purple-600" />
                    <span className="font-medium">Credit</span>
                  </label>
                </div>
                {errors.paymentMethod && <p className="text-red-500 text-sm mt-2">{errors.paymentMethod.message}</p>}
              </div>

              {/* Paid Amount (for cash/gpay) */}
              {(watchedValues.paymentMethod === 'CASH' || watchedValues.paymentMethod === 'GPAY') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Amount Paid
                  </label>
                  <input
                    {...register('paidAmount', {
                      min: { value: 0, message: 'Amount must be positive' },
                      max: { value: totalAmount, message: 'Amount cannot exceed total' }
                    })}
                    type="number"
                    step="0.01"
                    placeholder={`Enter amount (Max: ₹${formatAmount(totalAmount)})`}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors duration-200"
                  />
                  {errors.paidAmount && <p className="text-red-500 text-sm mt-2">{errors.paidAmount.message}</p>}
                  
                  {watchedValues.paidAmount && parseNumber(watchedValues.paidAmount) < totalAmount && (
                    <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium">
                        Pending Amount: ₹{formatAmount(totalAmount - parseNumber(watchedValues.paidAmount))}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedProduct || totalAmount === 0}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Review Sale
              </button>
            </form>
          </div>
        ) : (
          /* Sale Summary */
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-8 text-center text-gray-900">Sale Summary</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Product:</span>
                    <span className="text-gray-900">{saleData.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Customer:</span>
                    <span className="text-gray-900">{saleData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-900">{saleData.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Quantity:</span>
                    <span className="text-gray-900">{saleData.quantity} {saleData.unit}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Unit Price:</span>
                    <span className="text-gray-900">₹{formatAmount(saleData.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Payment Method:</span>
                    <span className="text-gray-900 capitalize">{saleData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Amount Paid:</span>
                    <span className="text-green-600 font-semibold">₹{formatAmount(saleData.paidAmount)}</span>
                  </div>
                  {parseNumber(saleData.creditAmount, 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Pending Amount:</span>
                      <span className="text-red-600 font-semibold">₹{formatAmount(saleData.creditAmount)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 mt-6 pt-6">
                <div className="flex justify-between text-2xl font-bold">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="text-amber-600">₹{formatAmount(saleData.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={confirmSale}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 shadow-lg"
              >
                {processing ? 'Processing...' : 'Confirm Sale'}
              </button>
              <button
                onClick={() => setShowSummary(false)}
                disabled={processing}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg"
              >
                Back to Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}