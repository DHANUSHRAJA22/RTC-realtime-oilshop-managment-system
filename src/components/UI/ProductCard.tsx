import React from 'react';
import { ShoppingCart, Package, AlertTriangle, Star } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatAmount } from '../../utils/formatters';
import StatusBadge from './StatusBadge';

interface ProductCardProps {
  product: Product;
  showStock?: boolean;
  className?: string;
}

export default function ProductCard({
  product,
  showStock = false,
  className = '',
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { userProfile } = useAuth();

  const handleAddToCart = () => {
    if (userProfile?.role === 'customer') {
      addToCart(product, 1);
    }
  };

  const isLowStock = product.stock <= product.lowStockAlert;
  const isOutOfStock = product.stock === 0;

  const getImageSrc = () => {
    if (product.imageData) return product.imageData;
    if (product.imageURL) return product.imageURL;
    return 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400';
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${className}`}
    >
      <div className="relative aspect-w-16 aspect-h-12 bg-gray-200">
        <img
          src={getImageSrc()}
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (
              t.src !==
              'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400'
            ) {
              t.src =
                'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400';
            }
          }}
        />

        {/* Premium Badge */}
        <div className="absolute top-3 left-3">
          <div className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
            <Star className="h-3 w-3 mr-1" />
            Premium
          </div>
        </div>

        {/* Stock Badge */}
        {showStock && (
          <div className="absolute top-3 right-3">
            {isOutOfStock ? (
              <StatusBadge status="out_of_stock" size="sm" />
            ) : isLowStock ? (
              <StatusBadge status="low_stock" size="sm" />
            ) : (
              <StatusBadge status="in_stock" size="sm" />
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
          <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-full">
            {product.packaging}
          </span>
        </div>

        <div className="flex items-center space-x-2 mb-3">
          <StatusBadge status={product.category} variant="outline" size="sm" />
          <StatusBadge status={product.type} variant="outline" size="sm" />
        </div>

        {showStock && (
          <div className="flex items-center space-x-2 mb-3">
            <Package className="h-4 w-4 text-gray-500" />
            <span className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
              Stock: {product.stock} {product.unit}
            </span>
            {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
        )}

        {/* PRICE + packaging label */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              ₹{formatAmount(product.basePrice)}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              per {product.packaging}
            </span>
          </div>
        </div>

        {userProfile?.role === 'customer' && (
          <div className="flex items-center justify-between">
            {isOutOfStock ? (
              <span className="text-red-600 font-medium text-sm">Out of Stock</span>
            ) : (
              <button
                onClick={handleAddToCart}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-200 flex items-center space-x-2 font-medium shadow-md"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        )}

        {product.shelfLife && (
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-medium">Shelf Life:</span> {product.shelfLife}
          </div>
        )}

        {product.description && (
          <div className="mt-2 text-xs text-gray-600">{product.description}</div>
        )}
      </div>
    </div>
  );
}
