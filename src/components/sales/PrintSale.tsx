import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale } from '../../types';
import { format } from 'date-fns';

export default function PrintSale() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (saleId) {
      fetchSale(saleId);
    }
  }, [saleId]);

  useEffect(() => {
    // Auto-trigger print dialog after sale loads
    if (sale && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500); // Small delay to ensure content is rendered
      
      return () => clearTimeout(timer);
    }
  }, [sale, loading]);

  const fetchSale = async (id: string) => {
    try {
      const saleDoc = await getDoc(doc(db, 'sales', id));
      if (saleDoc.exists()) {
        const saleData = saleDoc.data();
        setSale({
          id: saleDoc.id,
          ...saleData,
          // Ensure numeric fields are properly converted
          totalAmount: Number(saleData.totalAmount) || 0,
          paidAmount: Number(saleData.paidAmount) || 0,
          creditAmount: Number(saleData.creditAmount) || 0,
          unitPrice: Number(saleData.unitPrice) || 0,
          quantity: Number(saleData.quantity) || 0
        } as Sale);
      } else {
        setError('Sale not found');
      }
    } catch (error) {
      console.error('Error fetching sale:', error);
      setError('Failed to fetch sale');
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

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Sale not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Display customer name properly
  const displayCustomerName = sale.customerName === 'customer' ? 'Walk-in Customer' : sale.customerName;
  const displayCustomerPhone = sale.customerPhone === 'nil' ? 'Not provided' : sale.customerPhone;

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
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Sales</span>
            </button>
          </div>

          {/* Printable Sale Receipt */}
          <div className="print-container bg-white rounded-lg shadow-md p-8">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-amber-600 mb-2">Raja Trading Company</h1>
              <p className="text-gray-600">Premium Quality Oils Since 1970</p>
              <p className="text-sm text-gray-500">Phone: +91 94433 28042 | Email: rdhanush22raja@gmail.com</p>
              <p className="text-sm text-gray-500">No 103, Mundy Street, Vellore 632002</p>
            </div>

            {/* Sale Info */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Sale Information</h2>
                <div className="space-y-2">
                  <p><strong>Sale ID:</strong> #{sale.id.slice(-8).toUpperCase()}</p>
                  <p><strong>Date:</strong> {format(sale.createdAt.toDate(), 'dd/MM/yyyy HH:mm')}</p>
                  <p><strong>Staff:</strong> {sale.staffName}</p>
                  <p><strong>Payment Method:</strong> {sale.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {displayCustomerName}</p>
                  <p><strong>Phone:</strong> {displayCustomerPhone}</p>
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Product Details</h2>
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
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">{sale.productName}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {sale.quantity} {sale.unit}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      ₹{sale.unitPrice.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      ₹{sale.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Details */}
            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span>Total Amount:</span>
                    <span>₹{sale.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Amount Paid:</span>
                    <span>₹{sale.paidAmount.toFixed(2)}</span>
                  </div>
                  {sale.creditAmount > 0 && (
                    <div className="flex justify-between py-2 text-red-600">
                      <span>Credit Amount:</span>
                      <span>₹{sale.creditAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 font-bold text-lg">
                    <span>Payment Method:</span>
                    <span>{sale.paymentMethod.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Thank you for your business!</p>
              <p>This is a computer generated receipt.</p>
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