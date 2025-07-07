import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Printer } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Bill } from '../../types';
import { format } from 'date-fns';

export default function BillDetail() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (billId) {
      fetchBill(billId);
    }
  }, [billId]);

  const fetchBill = async (id: string) => {
    try {
      const billDoc = await getDoc(doc(db, 'bills', id));
      if (billDoc.exists()) {
        const billData = billDoc.data();
        setBill({
          id: billDoc.id,
          ...billData,
          // Ensure numeric fields are properly converted
          subtotal: Number(billData.subtotal) || 0,
          discountAmount: Number(billData.discountAmount) || 0,
          totalAmount: Number(billData.totalAmount) || 0
        } as Bill);
      } else {
        setError('Bill not found');
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      setError('Failed to fetch bill');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    navigate(`/bills/${billId}/print`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Bill not found'}</p>
          <button
            onClick={() => navigate('/staff/billing')}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/staff/billing')}
            className="flex items-center space-x-2 text-amber-600 hover:text-amber-700"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Billing</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <Printer className="h-5 w-5" />
            <span>Print Bill</span>
          </button>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Bill Details</h1>
            <p className="text-gray-600">Bill Number: {bill.billNumber}</p>
          </div>

          {/* Bill Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Bill Information</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Date:</span> {format(bill.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}</p>
                <p><span className="font-medium">Staff:</span> {bill.staffName}</p>
                <p><span className="font-medium">Payment Method:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    bill.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                    bill.paymentMethod === 'gpay' ? 'bg-blue-100 text-blue-800' :
                    bill.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {bill.paymentMethod.toUpperCase()}
                  </span>
                </p>
                <p><span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    bill.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    bill.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {bill.paymentStatus.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Customer Details</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {bill.customerName}</p>
                <p><span className="font-medium">Phone:</span> {bill.customerPhone || 'Not provided'}</p>
                {bill.customerAddress && (
                  <p><span className="font-medium">Address:</span> {bill.customerAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Items</h2>
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
                  {bill.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{Number(item.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-80">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>₹{bill.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{bill.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <p className="text-gray-700">{bill.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}