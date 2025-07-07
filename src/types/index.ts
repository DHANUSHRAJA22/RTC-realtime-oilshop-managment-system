import { Timestamp } from 'firebase/firestore';

export type UserRole = 'customer' | 'staff' | 'owner';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    name: string;
    phone: string;
    address: string;
    photoURL?: string;
  };
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  name: string;
  category: 'sunflower' | 'groundnut' | 'gingelly' | 'mustard' | 'coconut';
  type: 'edible' | 'non-edible';
  packaging: 'tin' | 'can' | 'bottle';
  basePrice: number;
  stock: number;
  unit: 'L' | 'KG';
  shelfLife: string;
  imageURL?: string;
  imageData?: string;
  imageUpdatedAt?: Timestamp;
  lowStockAlert: number;
  description: string;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number; // enforced as integer
  price: number;
  unit: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'upi' | 'credit';
  deliverySlot: string;
  deliveryAddress: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  quantity: number; // enforced as integer
  unit: string;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentMethod: 'cash' | 'gpay' | 'credit';
  staffId: string;
  staffName: string;
  createdAt: Timestamp;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null; // Allow undefined or null
  customerAddress?: string | null; // Allow undefined or null
  items: BillItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'gpay' | 'credit' | 'upi';
  paymentStatus: 'paid' | 'pending' | 'partial';
  staffId: string;
  staffName: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface BillItem {
  productId?: string; // Made optional for custom bills
  productName: string;
  quantity: number; // enforced as integer
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

// New interface for Custom Bills
export interface CustomBill {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string | null; // Allow undefined or null
  customerAddress?: string | null; // Allow undefined or null
  items: CustomBillItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'gpay' | 'credit' | 'upi';
  paymentStatus: 'paid' | 'pending' | 'partial';
  staffId: string;
  staffName: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface CustomBillItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  adjustmentType: 'increase' | 'decrease' | 'correction';
  quantity: number; // enforced as integer
  unit: string;
  reason: string;
  reasonCode: 'damaged' | 'expired' | 'theft' | 'recount' | 'supplier_return' | 'other';
  previousStock: number;
  newStock: number;
  attachmentURL?: string;
  staffId: string;
  staffName: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  approvedAt?: Timestamp;
}

export interface TransferRequest {
  id: string;
  fromWarehouse: string;
  toWarehouse: string;
  productId: string;
  productName: string;
  quantity: number; // enforced as integer
  unit: string;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'rejected';
  approvedBy?: string;
  completedBy?: string;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  completedAt?: Timestamp;
  notes?: string;
}

export interface CustomerCredit {
  id: string;
  customerName: string;
  customerPhone: string;
  totalCredit: number;
  creditLimit: number;
  transactions: CreditTransaction[];
  lastUpdated: Timestamp;
}

export interface CreditTransaction {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  saleId?: string;
  orderId?: string;
  createdAt: Timestamp;
}

export interface CreditRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  requestedAmount: number;
  reason: string;
  supportingDocs?: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  employeeComments?: string;
  ownerComments?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CartItem {
  product: Product;
  quantity: number; // enforced as integer
}

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  gpaySales: number;
  creditSales: number;
  topProducts: Array<{
    productName: string;
    quantitySold: number; // enforced as integer
    revenue: number;
  }>;
}

export interface ValidationRules {
  phone: RegExp;
  email: RegExp;
  quantity: RegExp;
}

export const VALIDATION_PATTERNS: ValidationRules = {
  phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  quantity: /^[1-9]\d*$/ // integers only, starting from 1
};

export interface ReportData {
  salesReport: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{
      name: string;
      quantity: number; // enforced as integer
      revenue: number;
    }>;
  };
  creditReport: {
    totalCredits: number;
    pendingCredits: number;
    approvedCredits: number;
    rejectedCredits: number;
  };
  inventoryReport: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalInventoryValue: number;
  };
}

export interface KPIData {
  monthlySales: {
    current: number;
    previous: number;
    ytd: number;
    lastYear: number;
    trend: Array<{ month: string; sales: number; }>;
  };
  weeklySales: {
    current: number;
    previous: number;
    chart: Array<{ day: string; sales: number; }>;
  };
  categoryBreakdown: Array<{
    category: string;
    sales: number;
    percentage: number;
  }>;
}

// New interfaces for enhanced functionality
export interface PendingPayment {
  id: string;
  saleId?: string;
  billId?: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  productName?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentMethod: 'cash' | 'gpay' | 'credit' | 'upi';
  staffId: string;
  staffName: string;
  status: 'pending' | 'paid' | 'partial';
  dueDate: Timestamp;
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MarketCredit {
  id: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  description: string;
  paid?: boolean;
  paidAt?: Timestamp;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Collection {
  id: string;
  amount: number;
  collectedBy: string;
  collectedByName: string;
  collectedAt: Timestamp;
  notes?: string;
}

export interface CustomerBalance {
  creditAmount: number;
  totalCollected: number;
  outstanding: number;
  collections: Collection[];
}