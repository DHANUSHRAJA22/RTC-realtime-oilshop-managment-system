import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Users, Download, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale, KPIData } from '../../types';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
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

interface CategoryData {
  category: string;
  sales: number;
  percentage: number;
}

export default function EnhancedSalesDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    monthlySales: {
      current: 0,
      previous: 0,
      ytd: 0,
      lastYear: 0,
      trend: []
    },
    weeklySales: {
      current: 0,
      previous: 0,
      chart: []
    },
    categoryBreakdown: []
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
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
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
      await processChartData(salesData, startDate, endDate);
      await calculateKPIs(salesData, now);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = async (salesData: Sale[], startDate: Date, endDate: Date) => {
    const chartData: SalesData[] = [];
    const paymentMethods: { [key: string]: number } = {};
    const categories: { [key: string]: number } = {};

    // Generate date range
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      if (dateRange === 'year') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Process sales by date
    dates.forEach(date => {
      let dayStart: Date, dayEnd: Date;
      
      if (dateRange === 'year') {
        dayStart = startOfMonth(date);
        dayEnd = endOfMonth(date);
      } else {
        dayStart = startOfDay(date);
        dayEnd = endOfDay(date);
      }
      
      const daySales = salesData.filter(sale => {
        const saleDate = sale.createdAt.toDate();
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const totalSales = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      
      chartData.push({
        date: dateRange === 'year' ? format(date, 'MMM') : format(date, 'MMM dd'),
        sales: totalSales,
        transactions: daySales.length
      });
    });

    // Process payment methods
    salesData.forEach(sale => {
      paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + sale.totalAmount;
    });

    // Process categories (from product names)
    salesData.forEach(sale => {
      const category = sale.productName.toLowerCase().includes('sunflower') ? 'Sunflower' :
                     sale.productName.toLowerCase().includes('groundnut') ? 'Groundnut' :
                     sale.productName.toLowerCase().includes('gingelly') ? 'Gingelly' :
                     sale.productName.toLowerCase().includes('mustard') ? 'Mustard' :
                     sale.productName.toLowerCase().includes('coconut') ? 'Coconut' : 'Other';
      
      categories[category] = (categories[category] || 0) + sale.totalAmount;
    });

    const totalCategorySales = Object.values(categories).reduce((sum, value) => sum + value, 0);
    const categoryBreakdown: CategoryData[] = Object.entries(categories).map(([category, sales]) => ({
      category,
      sales,
      percentage: totalCategorySales > 0 ? (sales / totalCategorySales) * 100 : 0
    }));

    const paymentData: PaymentMethodData[] = Object.entries(paymentMethods).map(([method, amount]) => ({
      name: method.toUpperCase(),
      value: amount,
      color: method === 'cash' ? '#10B981' : method === 'gpay' ? '#3B82F6' : method === 'credit' ? '#EF4444' : '#8B5CF6'
    }));

    setSalesData(chartData);
    setPaymentMethodData(paymentData);
    setCategoryData(categoryBreakdown);
  };

  const calculateKPIs = async (currentSales: Sale[], now: Date) => {
    try {
      // Current month sales
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const currentMonthSales = currentSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

      // Previous month sales
      const previousMonth = subMonths(now, 1);
      const previousMonthStart = startOfMonth(previousMonth);
      const previousMonthEnd = endOfMonth(previousMonth);
      
      const prevMonthQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(previousMonthStart)),
        where('createdAt', '<=', Timestamp.fromDate(previousMonthEnd))
      );
      const prevMonthSnapshot = await getDocs(prevMonthQuery);
      const previousMonthSales = prevMonthSnapshot.docs.reduce((sum, doc) => {
        const sale = doc.data() as Sale;
        return sum + sale.totalAmount;
      }, 0);

      // YTD sales
      const yearStart = startOfYear(now);
      const ytdQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(yearStart)),
        where('createdAt', '<=', Timestamp.fromDate(now))
      );
      const ytdSnapshot = await getDocs(ytdQuery);
      const ytdSales = ytdSnapshot.docs.reduce((sum, doc) => {
        const sale = doc.data() as Sale;
        return sum + sale.totalAmount;
      }, 0);

      // Last year same period
      const lastYear = subYears(now, 1);
      const lastYearStart = startOfYear(lastYear);
      const lastYearEnd = new Date(lastYear.getFullYear(), now.getMonth(), now.getDate());
      
      const lastYearQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(lastYearStart)),
        where('createdAt', '<=', Timestamp.fromDate(lastYearEnd))
      );
      const lastYearSnapshot = await getDocs(lastYearQuery);
      const lastYearSales = lastYearSnapshot.docs.reduce((sum, doc) => {
        const sale = doc.data() as Sale;
        return sum + sale.totalAmount;
      }, 0);

      // Monthly trend (last 12 months)
      const monthlyTrend = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthQuery = query(
          collection(db, 'sales'),
          where('createdAt', '>=', Timestamp.fromDate(monthStart)),
          where('createdAt', '<=', Timestamp.fromDate(monthEnd))
        );
        const monthSnapshot = await getDocs(monthQuery);
        const monthSales = monthSnapshot.docs.reduce((sum, doc) => {
          const sale = doc.data() as Sale;
          return sum + sale.totalAmount;
        }, 0);

        monthlyTrend.push({
          month: format(monthDate, 'MMM yyyy'),
          sales: monthSales
        });
      }

      // Weekly sales
      const currentWeekStart = startOfWeek(now);
      const currentWeekEnd = endOfWeek(now);
      const currentWeekSales = currentSales
        .filter(sale => {
          const saleDate = sale.createdAt.toDate();
          return saleDate >= currentWeekStart && saleDate <= currentWeekEnd;
        })
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      const previousWeek = subDays(currentWeekStart, 7);
      const previousWeekStart = startOfWeek(previousWeek);
      const previousWeekEnd = endOfWeek(previousWeek);
      
      const prevWeekQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(previousWeekStart)),
        where('createdAt', '<=', Timestamp.fromDate(previousWeekEnd))
      );
      const prevWeekSnapshot = await getDocs(prevWeekQuery);
      const previousWeekSales = prevWeekSnapshot.docs.reduce((sum, doc) => {
        const sale = doc.data() as Sale;
        return sum + sale.totalAmount;
      }, 0);

      // Weekly chart (last 7 days)
      const weeklyChart = [];
      for (let i = 6; i >= 0; i--) {
        const dayDate = subDays(now, i);
        const dayStart = startOfDay(dayDate);
        const dayEnd = endOfDay(dayDate);
        
        const daySales = currentSales
          .filter(sale => {
            const saleDate = sale.createdAt.toDate();
            return saleDate >= dayStart && saleDate <= dayEnd;
          })
          .reduce((sum, sale) => sum + sale.totalAmount, 0);

        weeklyChart.push({
          day: format(dayDate, 'EEE'),
          sales: daySales
        });
      }

      setKpiData({
        monthlySales: {
          current: currentMonthSales,
          previous: previousMonthSales,
          ytd: ytdSales,
          lastYear: lastYearSales,
          trend: monthlyTrend
        },
        weeklySales: {
          current: currentWeekSales,
          previous: previousWeekSales,
          chart: weeklyChart
        },
        categoryBreakdown: categoryData
      });

    } catch (error) {
      console.error('Error calculating KPIs:', error);
    }
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

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Sales Dashboard</h1>
          <div className="flex space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiData.monthlySales.current)}</p>
                <div className="flex items-center mt-2">
                  {getPercentageChange(kpiData.monthlySales.current, kpiData.monthlySales.previous) >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    getPercentageChange(kpiData.monthlySales.current, kpiData.monthlySales.previous) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {Math.abs(getPercentageChange(kpiData.monthlySales.current, kpiData.monthlySales.previous)).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiData.weeklySales.current)}</p>
                <div className="flex items-center mt-2">
                  {getPercentageChange(kpiData.weeklySales.current, kpiData.weeklySales.previous) >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    getPercentageChange(kpiData.weeklySales.current, kpiData.weeklySales.previous) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {Math.abs(getPercentageChange(kpiData.weeklySales.current, kpiData.weeklySales.previous)).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last week</span>
                </div>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">YTD Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpiData.monthlySales.ytd)}</p>
                <div className="flex items-center mt-2">
                  {getPercentageChange(kpiData.monthlySales.ytd, kpiData.monthlySales.lastYear) >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    getPercentageChange(kpiData.monthlySales.ytd, kpiData.monthlySales.lastYear) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {Math.abs(getPercentageChange(kpiData.monthlySales.ytd, kpiData.monthlySales.lastYear)).toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last year</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Avg: {formatCurrency(sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0)}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">12-Month Sales Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={kpiData.monthlySales.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#F59E0B" fill="#FEF3C7" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Weekly Sales Pattern</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={kpiData.weeklySales.chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
                <Bar dataKey="sales" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Sales by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sales"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Methods */}
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
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Period Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {dateRange === 'today' ? 'Today\'s Sales' : 
             dateRange === 'week' ? 'This Week\'s Sales' :
             dateRange === 'month' ? 'This Month\'s Sales' : 'This Year\'s Sales'}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Sales']} />
              <Line type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}