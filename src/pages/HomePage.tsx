import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import {
  ShoppingBag,
  Users,
  Award,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Mail,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/UI/ProductCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const q = query(collection(db, 'products'), limit(6));
        const snap = await getDocs(q);
        setFeaturedProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
        );
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  // lazy-load the map when in view
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !mapVisible) {
            setMapVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    if (mapRef.current) obs.observe(mapRef.current);
    return () => obs.disconnect();
  }, [mapVisible]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Raja Trading Company
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Premium Quality Oils Since 1970
          </p>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
            Serving traditional bazaar needs with modern convenience. Fresh, pure,
            and authentic oils delivered to your doorstep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Shop Now
            </Link>
            <a
              href="tel:+919443328042"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Phone className="h-5 w-5" />
              <span>Call Us</span>
            </a>
            <a
              href="https://wa.me/919443328042"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
          <p className="text-lg text-gray-600">Three generations of trust and quality</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
          <div className="text-center p-6">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
            <p className="text-gray-600">Sourced from the finest ingredients, tested for purity and quality.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Trusted by Thousands</h3>
            <p className="text-gray-600">Over 50 years of serving families and businesses with reliability.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Ordering</h3>
            <p className="text-gray-600">Simple online ordering with flexible delivery options.</p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Our most popular oils</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
          {featuredProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </section>

      {/* About Us & Map */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Heading */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              About Raja Trading Company
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Established in 1970, Raja Trading Company has been a cornerstone of
              quality oil trading in our community. With over five decades of
              experience, we pride ourselves on delivering premium oils that meet
              the highest standards of purity and freshness.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Company Info & Contact */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-xl border border-amber-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  What started as a small family business has grown into a trusted
                  name in the oil trading industry. We specialize in premium quality
                  edible oils, sourced directly from the finest producers and
                  processed with traditional methods that preserve their natural
                  goodness.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Our commitment to quality, customer satisfaction, and fair pricing
                  has earned us the trust of thousands of families and businesses
                  across the region.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Get in Touch
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-amber-600" />
                    <span className="text-gray-700">+91 94433 28042</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-amber-600" />
                    <span className="text-gray-700">
                      rdhanush22raja@gmail.com
                    </span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-amber-600 mt-1" />
                    <div className="text-gray-700">
                      <p>No 103, Mundy Street</p>
                      <p>Vellore, Tamil Nadu 632002</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div className="text-gray-700">
                      <p className="font-medium">Monday – Saturday</p>
                      <p className="text-sm">9:00 AM – 8:30 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lazy-loaded Google Map */}
            <div ref={mapRef} className="space-y-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <MapPin className="h-6 w-6 mr-2" />
                    Find Us Here
                  </h3>
                  <p className="text-amber-100 text-sm mt-1">
                    Visit our store for the best selection
                  </p>
                </div>
                <div className="w-full h-96">
                  {mapVisible ? (
                    <iframe
                      title="Raja Trading Company Location"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.7792279461933!2d79.13068417386675!3d12.921906315968277!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bad38eabc6f0491%3A0x666709db8125bdba!2sRAJA%20TRADING%20COMPANY!5e0!3m2!1sen!2sin!4v1751531338717!5m2!1sen!2sin" 
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 flex gap-3">
                  <a
                    href="https://www.google.com/maps/place/RAJA+TRADING+COMPANY/@12.9219011,79.1332591,17z"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition"
                  >
                    View on Google Maps
                  </a>
                  <a
                    href="https://www.google.com/maps/dir//RAJA+TRADING+COMPANY,+No+103,+Mundy+St,+Vellore,+Tamil+Nadu+632002"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-center hover:bg-green-700 transition"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
