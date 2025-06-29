import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { Package, TrendingUp, Users, CreditCard, Calendar, AlertTriangle, ShoppingCart, ClipboardList, DollarSign } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Product, Sale, CustomerCredit, CreditRequest, PendingPayment } from '../../types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatAmount, parseNumber } from '../../utils/formatters';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatsCard from '../../components/UI/StatsCard';

export default function OwnerDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    totalCustomers: 0,
    pendingCredits: 0,
    pendingCreditRequests: 0,
    pendingPayments: 0,
    totalPendingAmount: 0
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [pendingCreditRequests, setPendingCreditRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      const lowStock = products.filter(p => p.stock <= p.lowStockAlert);
      setLowStockProducts(lowStock);

      // Fetch today's sales
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      
      const salesQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', startOfToday),
        where('createdAt', '<=', endOfToday)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const todaySalesData = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      
      const todayRevenue = todaySalesData.reduce((sum, sale) => sum + parseNumber(sale.totalAmount), 0);

      // Fetch recent sales
      const recentSalesQuery = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSalesSnapshot = await getDocs(recentSalesQuery);
      const recentSalesData = recentSalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      setRecentSales(recentSalesData);

      // Fetch customer credits
      const creditsSnapshot = await getDocs(collection(db, 'customerCredits'));
      const credits = creditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomerCredit[];
      const totalPendingCredits = credits.reduce((sum, credit) => sum + parseNumber(credit.totalCredit), 0);

      // Fetch pending credit requests
      const creditRequestsQuery = query(
        collection(db, 'creditRequests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const creditRequestsSnapshot = await getDocs(creditRequestsQuery);
      const creditRequestsData = creditRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CreditRequest[];
      setPendingCreditRequests(creditRequestsData);

      // Fetch pending payments
      const pendingPaymentsQuery = query(
        collection(db, 'pendingPayments'),
        where('status', 'in', ['pending', 'partially_paid'])
      );
      const pendingPaymentsSnapshot = await getDocs(pendingPaymentsQuery);
      const pendingPaymentsData = pendingPaymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PendingPayment[];
      
      const totalPendingAmount = pendingPaymentsData.reduce((sum, payment) => sum + parseNumber(payment.pendingAmount), 0);

      setStats({
        totalProducts: products.length,
        lowStockProducts: lowStock.length,
        todaySales: todayRevenue,
        totalCustomers: credits.length,
        pendingCredits: totalPendingCredits,
        pendingCreditRequests: creditRequestsData.length,
        pendingPayments: pendingPaymentsData.length,
        totalPendingAmount
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue' as const,
      link: '/admin/products'
    },
    {
      title: 'Low Stock Alert',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'red' as const,
      link: '/admin/products'
    },
    {
      title: "Today's Sales",
      value: `₹${formatAmount(stats.todaySales)}`,
      icon: TrendingUp,
      color: 'green' as const,
      link: '/admin/enhanced-sales'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'purple' as const,
      link: '/admin/customers'
    },
    {
      title: 'Pending Credits',
      value: `₹${formatAmount(stats.pendingCredits)}`,
      icon: CreditCard,
      color: 'amber' as const,
      link: '/admin/credits'
    },
    {
      title: 'Credit Requests',
      value: stats.pendingCreditRequests,
      icon: Calendar,
      color: 'blue' as const,
      link: '/admin/orders'
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: DollarSign,
      color: 'yellow' as const,
      link: '/pending-payments'
    },
    {
      title: 'Pending Amount',
      value: `₹${formatAmount(stats.totalPendingAmount)}`,
      icon: DollarSign,
      color: 'red' as const,
      link: '/pending-payments'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your business today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card, index) => (
            <StatsCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              onClick={() => window.location.href = card.link}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Sales */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
              <Link to="/admin/enhanced-sales" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div>
                      <p className="font-medium text-gray-900">{sale.customerName}</p>
                      <p className="text-sm text-gray-600">{sale.productName}</p>
                      <p className="text-xs text-gray-500">
                        {format(sale.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{formatAmount(sale.totalAmount)}</p>
                      <p className="text-sm text-gray-600 capitalize">{sale.paymentMethod}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent sales</p>
              )}
            </div>
          </div>

          {/* Pending Credit Requests */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pending Credit Requests</h2>
              <Link to="/admin/orders" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {pendingCreditRequests.length > 0 ? (
                pendingCreditRequests.map((request) => {
                  const amount = parseNumber(request.requestedAmount);
                  
                  return (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors duration-200">
                      <div>
                        <p className="font-medium text-gray-900">{request.customerName}</p>
                        <p className="text-sm text-gray-600">{request.reason}</p>
                        <p className="text-xs text-gray-500">
                          {format(request.createdAt.toDate(), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{formatAmount(amount)}</p>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">No pending credit requests</p>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        {lowStockProducts.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
              <Link to="/admin/products" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                Manage Stock
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors duration-200">
                  <div className="flex items-center">
                    <img
                      src={product.imageData || product.imageURL || 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=50'}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded mr-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=50') {
                          target.src = 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=50';
                        }
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{product.stock} {product.unit}</p>
                    <p className="text-xs text-gray-500">Alert: {product.lowStockAlert}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Link
              to="/admin/pos"
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-lg text-center hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">New Sale (POS)</span>
            </Link>
            
            <Link
              to="/admin/products"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg text-center hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <Package className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Manage Products</span>
            </Link>
            
            <Link
              to="/admin/orders"
              className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg text-center hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <ClipboardList className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Orders & Credits</span>
            </Link>
            
            <Link
              to="/admin/market-credits"
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-lg text-center hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <CreditCard className="h-8 w-8 mx-auto mb-2" />
              <span className="font-medium">Market Credits</span>
            </Link>
            
            <Link
              to="/pending-payments"
              className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg text-center hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg transform hover:scale-105"
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