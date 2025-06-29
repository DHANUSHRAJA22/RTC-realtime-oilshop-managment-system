import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { ShoppingBag, Users, Award, Phone, MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const q = query(collection(db, 'products'), limit(6));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setFeaturedProducts(products);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Raja Trading Company
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Premium Quality Oils Since 1970
            </p>
            <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
              Serving traditional bazaar needs with modern convenience. 
              Fresh, pure, and authentic oils delivered to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors duration-200"
              >
                Shop Now
              </Link>
              <div className="flex gap-2">
                <a
                  href="tel:+919876543210"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Phone className="h-5 w-5" />
                  <span>Call Us</span>
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
            <p className="text-lg text-gray-600">Three generations of trust and quality</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-gray-600">
                Sourced from the finest ingredients, tested for purity and quality
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted by Thousands</h3>
              <p className="text-gray-600">
                Over 50 years of serving families and businesses with reliability
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Ordering</h3>
              <p className="text-gray-600">
                Simple online ordering with flexible delivery options
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-lg text-gray-600">Our most popular oils</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link
              to="/products"
              className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors duration-200"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}