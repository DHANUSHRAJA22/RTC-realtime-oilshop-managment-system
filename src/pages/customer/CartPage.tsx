import React, { useState } from 'react';
import { Minus, Plus, Trash2, Phone, MessageCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
  const { userProfile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!userProfile || items.length === 0) return;
    
    if (!deliverySlot) {
      toast.error('Please select a delivery slot');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customerId: userProfile.id,
        customerName: userProfile.profile.name,
        customerPhone: userProfile.profile.phone,
        customerEmail: userProfile.email,
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.basePrice,
          unit: item.product.unit,
        })),
        total: getTotalPrice(),
        status: 'pending',
        paymentMethod,
        deliverySlot,
        deliveryAddress: userProfile.profile.address || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      // If payment method is credit, create a credit request
      if (paymentMethod === 'credit') {
        const creditRequestData = {
          customerId: userProfile.id,
          customerName: userProfile.profile.name,
          customerPhone: userProfile.profile.phone,
          customerEmail: userProfile.email,
          requestedAmount: getTotalPrice(),
          reason: `Order payment - ${items.length} items`,
          status: 'pending',
          orderId: '', // Will be updated after order creation
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await addDoc(collection(db, 'creditRequests'), creditRequestData);
        toast.success('Order placed! Credit request submitted for approval.');
      } else {
        toast.success('Order placed successfully!');
      }

      clearCart();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some products to get started</p>
            <a
              href="/products"
              className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200"
            >
              Browse Products
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
              
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.product.imageURL || 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                      <p className="text-gray-600 capitalize">{item.product.category} • {item.product.packaging}</p>
                      <p className="text-lg font-bold text-gray-900">₹{item.product.basePrice}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="cash">Cash on Delivery</option>
                    <option value="upi">UPI Payment</option>
                    <option value="credit">Credit (Approval Required)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Slot
                  </label>
                  <select
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">Select a time slot</option>
                    <option value="morning">Morning (9AM - 12PM)</option>
                    <option value="afternoon">Afternoon (12PM - 4PM)</option>
                    <option value="evening">Evening (4PM - 8PM)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

              <div className="mt-4 space-y-2">
                <a
                  href="tel:+919876543210"
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call to Order</span>
                </a>
                
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Order</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}