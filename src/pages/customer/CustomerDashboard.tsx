import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Package, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

export default function CustomerDashboard() {
  const { userProfile } = useAuth();
  const { getTotalItems, getTotalPrice } = useCart();

  const dashboardCards = [
    {
      title: 'My Cart',
      value: `${getTotalItems()} items`,
      subtitle: `₹${getTotalPrice().toFixed(2)}`,
      icon: ShoppingCart,
      link: '/customer/cart',
      color: 'bg-blue-500',
    },
    {
      title: 'My Orders',
      value: 'View History',
      subtitle: 'Track orders',
      icon: Package,
      link: '/customer/orders',
      color: 'bg-green-500',
    },
    {
      title: 'Credit Balance',
      value: '₹0.00',
      subtitle: 'Available credit',
      icon: CreditCard,
      link: '/customer/credit',
      color: 'bg-purple-500',
    },
    {
      title: 'My Profile',
      value: 'Update Info',
      subtitle: 'Manage account',
      icon: User,
      link: '/customer/profile',
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userProfile?.profile.name}!
          </h1>
          <p className="text-gray-600 mt-2">Manage your account and orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-full text-white mr-4`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/products"
              className="bg-amber-600 text-white p-4 rounded-lg text-center hover:bg-amber-700 transition-colors duration-200"
            >
              <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Browse Products</span>
            </Link>
            
            <Link
              to="/customer/cart"
              className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition-colors duration-200"
            >
              <Package className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">View Cart</span>
            </Link>
            
            <a
              href="tel:+919876543210"
              className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition-colors duration-200"
            >
              <div className="h-8 w-8 mx-auto mb-2 flex items-center justify-center">📞</div>
              <span className="font-medium">Call Shop</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}