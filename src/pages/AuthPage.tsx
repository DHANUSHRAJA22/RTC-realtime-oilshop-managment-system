import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Eye, EyeOff, User, Mail, Phone, MapPin, Shield } from 'lucide-react';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

interface AuthFormData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { user, userProfile, login, register, loading } = useAuth();
  
  const { register: registerField, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && userProfile) {
      const role = userProfile.role;
      switch (role) {
        case 'customer':
          navigate('/customer');
          break;
        case 'staff':
          navigate('/staff');
          break;
        case 'owner':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    }
  }, [user, userProfile, loading, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setProcessing(true);
    try {
      if (isLogin) {
        await login(data.email, data.password);
      } else {
        await register(data.email, data.password, {
          name: data.name,
          phone: data.phone,
          address: data.address,
          role: data.role || 'customer'
        });
      }
    } catch (error) {
      // Error handling is done in the auth context
    } finally {
      setProcessing(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
    setShowPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-amber-600 hover:text-amber-500 transition-colors duration-200"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Full Name *
                  </label>
                  <input
                    {...registerField('name', { required: !isLogin ? 'Name is required' : false })}
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    {...registerField('phone', {
                      pattern: {
                        value: /^[6-9]\d{9}$/,
                        message: 'Please enter a valid 10-digit phone number'
                      }
                    })}
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Address
                  </label>
                  <textarea
                    {...registerField('address')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your address"
                  />
                </div>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Account Type *
                  </label>
                  <select
                    {...registerField('role', { required: !isLogin ? 'Please select account type' : false })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select Account Type</option>
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </select>
                  {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address *
              </label>
              <input
                {...registerField('email', { 
                  required: 'Email is required', 
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email address'
                  }
                })}
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email address"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  {...registerField('password', { 
                    required: 'Password is required', 
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
            
            <div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {processing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">Demo Accounts (for testing):</p>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>customer@demo.com / demo123</span>
              </div>
              <div className="flex justify-between">
                <span>Staff:</span>
                <span>staff@demo.com / demo123</span>
              </div>
              <div className="flex justify-between">
                <span>Owner:</span>
                <span>owner@demo.com / demo123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}