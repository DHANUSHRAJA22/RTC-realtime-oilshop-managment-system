import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Users, CreditCard, BarChart3, FileText, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffDashboard() {
  const { userProfile } = useAuth();

  const dashboardCards = [
    {
      title: 'Point of Sale',
      description: 'Process customer sales',
      icon: ShoppingCart,
      link: '/staff/pos',
      color: 'bg-green-500',
    },
    {
      title: 'Billing',
      description: 'Generate bills and invoices',
      icon: FileText,
      link: '/staff/billing',
      color: 'bg-indigo-500',
    },
    {
      title: 'Stock Management',
      description: 'View and manage inventory',
      icon: Package,
      link: '/staff/stock',
      color: 'bg-blue-500',
    },
    {
      title: 'Customer Credits',
      description: 'Manage customer credit accounts',
      icon: CreditCard,
      link: '/staff/credits',
      color: 'bg-purple-500',
    },
    {
      title: 'Sales History',
      description: 'View recent transactions',
      icon: BarChart3,
      link: '/staff/sales',
      color: 'bg-amber-500',
    },
    {
      title: 'Pending Payments',
      description: 'Track pending customer payments',
      icon: DollarSign,
      link: '/staff/pending-payments',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {userProfile?.profile.name}!
          </h1>
          <p className="text-gray-600 mt-2">Staff Dashboard - Manage daily operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboardCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="flex items-center mb-4">
                <div className={`${card.color} p-3 rounded-full text-white group-hover:scale-110 transition-transform duration-200`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Link
              to="/staff/pos"
              className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition-colors duration-200"
            >
              <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">New Sale</span>
            </Link>
            
            <Link
              to="/staff/billing"
              className="bg-indigo-600 text-white p-4 rounded-lg text-center hover:bg-indigo-700 transition-colors duration-200"
            >
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Create Bill</span>
            </Link>
            
            <Link
              to="/staff/stock"
              className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition-colors duration-200"
            >
              <Package className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Check Stock</span>
            </Link>
            
            <Link
              to="/staff/credits"
              className="bg-purple-600 text-white p-4 rounded-lg text-center hover:bg-purple-700 transition-colors duration-200"
            >
              <CreditCard className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Customer Credits</span>
            </Link>

            <Link
              to="/staff/pending-payments"
              className="bg-red-600 text-white p-4 rounded-lg text-center hover:bg-red-700 transition-colors duration-200"
            >
              <DollarSign className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Pending Payments</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}