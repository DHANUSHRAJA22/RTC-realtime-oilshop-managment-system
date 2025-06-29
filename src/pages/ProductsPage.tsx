import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Search, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const categories = ['sunflower', 'groundnut', 'gingelly', 'mustard', 'coconut'];
  const types = ['edible', 'non-edible'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(product => product.type === selectedType);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, selectedType]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Our Products</h1>
          
          {/* Search and Filters */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category} className="capitalize">
                    {category}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {types.map(type => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center text-gray-600">
                <Filter className="h-5 w-5 mr-2" />
                <span>{filteredProducts.length} Products</span>
              </div>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}