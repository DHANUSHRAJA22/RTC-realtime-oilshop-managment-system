import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Users, Download, Calendar } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale } from '../../types';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

interface SalesData {
  date: string;
  sales: number;
  transactions: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
}

export default function SalesDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    topProduct: ''
  });

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = endOfDay(now);

      switch (dateRange) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = startOfWeek(now);
      }

      const q = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const salesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];

      setSales(salesData);
      processChartData(salesData, startDate, endDate);
      calculateStats(salesData);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (salesData: Sale[], startDate: Date, endDate: Date) => {
    const chartData: SalesData[] = [];
    const paymentMethods: { [key: string]: number } = {};

    // Generate date range
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process sales by date
    dates.forEach(date => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = salesData.filter(sale => {
        const saleDate = sale.createdAt.toDate();
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const totalSales = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      
      chartData.push({
        date: format(date, 'MMM dd'),
        sales: totalSales,
        transactions: daySales.length
      });
    });

    // Process payment methods
    salesData.forEach(sale => {
      paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + sale.totalAmount;
    });

    const paymentData: PaymentMethodData[] = Object.entries(paymentMethods).map(([method, amount]) => ({
      name: method.toUpperCase(),
      value: amount,
      color: method === 'cash' ? '#10B981' : method === 'gpay' ? '#3B82F6' : '#EF4444'
    }));

    setSalesData(chartData);
    setPaymentMethodData(paymentData);
  };

  const calculateStats = (salesData: Sale[]) => {
    const totalSales = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = salesData.length;
    const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Find top product
    const productSales: { [key: string]: number } = {};
    salesData.forEach(sale => {
      productSales[sale.productName] = (productSales[sale.productName] || 0) + sale.quantity;
    });

    const topProduct = Object.entries(productSales).reduce((top, [product, quantity]) => 
      quantity > (productSales[top] || 0) ? product : top, ''
    );

    setStats({
      totalSales,
      totalTransactions,
      averageOrderValue,
      topProduct
    });
  };

  const exportSalesReport = () => {
    const headers = ['Date', 'Customer', 'Product', 'Quantity', 'Amount', 'Payment Method', 'Staff'];
    const csvData = sales.map(sale => [
      format(sale.createdAt.toDate(), 'yyyy-MM-dd HH:mm'),
      sale.customerName,
      sale.productName,
      `${sale.quantity} ${sale.unit}`,
      `₹${sale.totalAmount}`,
      sale.paymentMethod.toUpperCase(),
      sale.staffName
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
          <div className="flex space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={exportSalesReport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalSales.toFixed(2)}</p>
                <p className="text-gray-600">Total Sales</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                <p className="text-gray-600">Transactions</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">₹{stats.averageOrderValue.toFixed(2)}</p>
                <p className="text-gray-600">Avg Order Value</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-amber-500 mr-3" />
              <div>
                <p className="text-lg font-bold text-gray-900 truncate">{stats.topProduct || 'N/A'}</p>
                <p className="text-gray-600">Top Product</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Sales Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} />
                <Line type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Methods Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Transactions Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Daily Transactions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transactions" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Sales Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Recent Sales</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(sale.createdAt.toDate(), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{sale.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                        sale.paymentMethod === 'gpay' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}