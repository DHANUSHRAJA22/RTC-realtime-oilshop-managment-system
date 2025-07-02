import React from 'react';
import { Store, Phone, Mail, MapPin, Clock, Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-lg shadow-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">Raja Trading Co.</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Your trusted partner for quality products and exceptional service. 
              Serving the community with dedication since our establishment.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors duration-200">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors duration-200">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-500 transition-colors duration-200">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-500">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-amber-500" />
                <span className="text-gray-300">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-amber-500" />
                <span className="text-gray-300">info@rajatradingco.com</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-amber-500 mt-1" />
                <span className="text-gray-300">
                  No 103,<br />
                  mundy street,<br />
                </span>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-500">Business Hours</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div className="text-gray-300">
                  <p className="font-medium">Monday - Saturday</p>
                  <p className="text-sm">9:00 AM - 8:30 PM</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                
                <div className="text-gray-300">
                  
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-500">Quick Links</h3>
            <div className="space-y-2">
              <a href="/products" className="block text-gray-300 hover:text-amber-500 transition-colors duration-200">
                Products
              </a>
              <a href="/about" className="block text-gray-300 hover:text-amber-500 transition-colors duration-200">
                About Us
              </a>
              <a href="/contact" className="block text-gray-300 hover:text-amber-500 transition-colors duration-200">
                Contact
              </a>
              <a href="/privacy" className="block text-gray-300 hover:text-amber-500 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="/terms" className="block text-gray-300 hover:text-amber-500 transition-colors duration-200">
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Raja Trading Co. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm">
              © Dhanush Raja ❤️ 
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}