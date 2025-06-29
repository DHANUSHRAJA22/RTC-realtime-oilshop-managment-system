import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import AuthPage from './pages/AuthPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CartPage from './pages/customer/CartPage';
import ProfileManagement from './pages/customer/ProfileManagement';
import OrderHistory from './pages/customer/OrderHistory';
import CreditBalance from './pages/customer/CreditBalance';
import StaffDashboard from './pages/staff/StaffDashboard';
import POSPanel from './pages/staff/POSPanel';
import SalesHistory from './pages/staff/SalesHistory';
import CreditManagement from './pages/staff/CreditManagement';
import BillingModule from './pages/staff/BillingModule';
import StockManagement from './pages/staff/StockManagement';
import PendingPayments from './pages/staff/PendingPayments';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ProductManagement from './pages/owner/ProductManagement';
import SalesDashboard from './pages/owner/SalesDashboard';
import EnhancedSalesDashboard from './pages/owner/EnhancedSalesDashboard';
import CreditApprovalPage from './pages/owner/CreditApprovalPage';
import OrdersManagement from './pages/owner/OrdersManagement';
import MarketCredits from './pages/owner/MarketCredits';
import BillDetail from './components/bills/BillDetail';
import PrintBill from './components/bills/PrintBill';
import LoadingSpinner from './components/UI/LoadingSpinner';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Customer Routes */}
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/customer/cart" element={<CartPage />} />
                <Route path="/customer/profile" element={<ProfileManagement />} />
                <Route path="/customer/orders" element={<OrderHistory />} />
                <Route path="/customer/credit" element={<CreditBalance />} />
                
                {/* Staff Routes */}
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/pos" element={<POSPanel />} />
                <Route path="/staff/billing" element={<BillingModule />} />
                <Route path="/staff/sales" element={<SalesHistory />} />
                <Route path="/staff/credits" element={<CreditManagement />} />
                <Route path="/staff/stock" element={<StockManagement />} />
                <Route path="/staff/pending-payments" element={<PendingPayments />} />
                
                {/* Owner/Admin Routes */}
                <Route path="/admin" element={<OwnerDashboard />} />
                <Route path="/admin/products" element={<ProductManagement />} />
                <Route path="/admin/sales" element={<SalesDashboard />} />
                <Route path="/admin/enhanced-sales" element={<EnhancedSalesDashboard />} />
                <Route path="/admin/credits" element={<CreditApprovalPage />} />
                <Route path="/admin/orders" element={<OrdersManagement />} />
                <Route path="/admin/market-credits" element={<MarketCredits />} />
                <Route path="/admin/pos" element={<POSPanel />} />
                <Route path="/admin/customers" element={<div className="p-8 text-center">Customer management coming soon...</div>} />
                <Route path="/admin/reports" element={<div className="p-8 text-center">Reports coming soon...</div>} />
                
                {/* Bill Routes */}
                <Route path="/bills/:billId" element={<BillDetail />} />
                <Route path="/bills/:billId/print" element={<PrintBill />} />
                
                {/* Shared Routes */}
                <Route path="/pending-payments" element={<PendingPayments />} />
              </Routes>
            </main>
            <Footer />
            <Toaster 
              position="top-right" 
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}