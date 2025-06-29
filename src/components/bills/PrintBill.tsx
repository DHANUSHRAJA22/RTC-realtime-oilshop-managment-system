import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Bill } from '../../types';
import { format } from 'date-fns';

export default function PrintBill() {
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

  useEffect(() => {
    // Auto-trigger print dialog after bill loads
    if (bill && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500); // Small delay to ensure content is rendered
      
      return () => clearTimeout(timer);
    }
  }, [bill, loading]);

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
          taxAmount: Number(billData.taxAmount) || 0,
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
    <>
      <style media="print">
        {`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 20px; }
            .print-container { 
              max-width: none !important; 
              margin: 0 !important; 
              padding: 0 !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button - Hidden in Print */}
          <div className="no-print mb-6">
            <button
              onClick={() => navigate('/staff/billing')}
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Billing</span>
            </button>
          </div>

          {/* Printable Bill */}
          <div className="print-container bg-white rounded-lg shadow-md p-8">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-amber-600 mb-2">Raja Trading Company</h1>
              <p className="text-gray-600">Premium Quality Oils Since 1970</p>
              <p className="text-sm text-gray-500">Phone: +91 98765 43210 | Email: info@rajatrading.com</p>
              <p className="text-sm text-gray-500">123 Bazaar Street, City</p>
            </div>

            {/* Bill Info */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Bill Information</h2>
                <div className="space-y-2">
                  <p><strong>Bill Number:</strong> {bill.billNumber}</p>
                  <p><strong>Date:</strong> {format(bill.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</p>
                  <p><strong>Staff:</strong> {bill.staffName}</p>
                  <p><strong>Payment Method:</strong> {bill.paymentMethod.toUpperCase()}</p>
                  <p><strong>Status:</strong> {bill.paymentStatus.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {bill.customerName}</p>
                  <p><strong>Phone:</strong> {bill.customerPhone}</p>
                  {bill.customerAddress && (
                    <p><strong>Address:</strong> {bill.customerAddress}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Items</h2>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Product</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{item.productName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        ₹{Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        ₹{Number(item.totalPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span>Subtotal:</span>
                    <span>₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Tax (18%):</span>
                    <span>₹{bill.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Discount:</span>
                    <span>₹{bill.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{bill.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {bill.notes && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Notes</h2>
                <p className="text-gray-700">{bill.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Thank you for your business!</p>
              <p>This is a computer generated bill.</p>
            </div>
          </div>

          {/* Print Button - Hidden in Print */}
          <div className="no-print mt-6 text-center">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Print Again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}