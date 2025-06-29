import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, Lock, Camera, Save, CheckCircle } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { validatePhone, validateEmail } from '../../utils/validation';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

interface ProfileFormData {
  name: string;
  phone: string;
  address: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileManagement() {
  const { userProfile, user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, setValue, formState: { errors: profileErrors }, watch } = useForm<ProfileFormData>();
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, watch: watchPassword, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordFormData>();

  const watchNewPassword = watchPassword('newPassword');

  useEffect(() => {
    if (userProfile) {
      setValue('name', userProfile.profile.name || '');
      setValue('phone', userProfile.profile.phone || '');
      setValue('address', userProfile.profile.address || '');
      setValue('email', userProfile.email || '');
      setImagePreview(userProfile.profile.photoURL || '');
    }
  }, [userProfile, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!userProfile || !user) {
      toast.error('Please log in to update your profile');
      return;
    }

    // Validate phone and email
    if (data.phone && !validatePhone(data.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!validateEmail(data.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setUpdating(true);
    try {
      let photoURL = userProfile.profile.photoURL || '';

      // Use Base64 image data if new image is selected
      if (imageFile && imagePreview) {
        photoURL = imagePreview; // Base64 string
      }

      // Update profile in Firestore
      const updateData = {
        email: data.email,
        profile: {
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          photoURL: photoURL || ''
        }
      };

      await updateDoc(doc(db, 'users', userProfile.id), updateData);

      // Update email in Firebase Auth if changed
      if (data.email !== userProfile.email) {
        try {
          await updateEmail(user, data.email);
        } catch (emailError: any) {
          if (emailError.code === 'auth/requires-recent-login') {
            toast.error('Please log out and log back in to update your email');
          } else {
            console.error('Email update error:', emailError);
            toast.error('Profile updated but email change failed. Please try again.');
          }
        }
      }

      toast.success('Profile updated successfully!');
      setImageFile(null);
      
      // Refresh the profile data
      await refreshProfile();
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user) {
      toast.error('Please log in to change your password');
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (data.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setUpdating(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, data.newPassword);

      toast.success('Password updated successfully!');
      resetPassword();
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('New password is too weak');
      } else {
        toast.error('Failed to update password. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" text="Loading profile..." />
      </div>
    );
  }

  if (!userProfile || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Please log in to access your profile</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
          <p className="text-gray-600 mt-2">Update your personal information and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-amber-600" />
              Profile Picture
            </h2>
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shadow-lg">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 rounded-full cursor-pointer hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={updating}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-4 text-center">
                Click the camera icon to upload a new profile picture
              </p>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Max size: 2MB • Formats: JPG, PNG, WebP
              </p>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold mb-8 flex items-center">
              <User className="h-5 w-5 mr-2 text-amber-600" />
              Personal Information
            </h2>
            
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <User className="inline h-4 w-4 mr-2 text-amber-600" />
                    Full Name *
                  </label>
                  <input
                    {...registerProfile('name', { required: 'Name is required' })}
                    type="text"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                  />
                  {profileErrors.name && <p className="text-red-500 text-sm mt-2">{profileErrors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Mail className="inline h-4 w-4 mr-2 text-amber-600" />
                    Email Address *
                  </label>
                  <input
                    {...registerProfile('email', { 
                      required: 'Email is required',
                      validate: (value) => validateEmail(value) || 'Please enter a valid email address'
                    })}
                    type="email"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your email address"
                  />
                  {profileErrors.email && <p className="text-red-500 text-sm mt-2">{profileErrors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Phone className="inline h-4 w-4 mr-2 text-amber-600" />
                    Phone Number
                  </label>
                  <input
                    {...registerProfile('phone', { 
                      validate: (value) => !value || validatePhone(value) || 'Please enter a valid phone number'
                    })}
                    type="tel"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your phone number"
                  />
                  {profileErrors.phone && <p className="text-red-500 text-sm mt-2">{profileErrors.phone.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <MapPin className="inline h-4 w-4 mr-2 text-amber-600" />
                    Address
                  </label>
                  <textarea
                    {...registerProfile('address')}
                    rows={3}
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Updating Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Update Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold flex items-center">
              <Lock className="h-5 w-5 mr-2 text-amber-600" />
              Change Password
            </h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              disabled={updating}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{showPasswordForm ? 'Cancel' : 'Change Password'}</span>
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Current Password *
                  </label>
                  <input
                    {...registerPassword('currentPassword', { required: 'Current password is required' })}
                    type="password"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                  {passwordErrors.currentPassword && <p className="text-red-500 text-sm mt-2">{passwordErrors.currentPassword.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    New Password *
                  </label>
                  <input
                    {...registerPassword('newPassword', { 
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    type="password"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="Enter new password"
                  />
                  {passwordErrors.newPassword && <p className="text-red-500 text-sm mt-2">{passwordErrors.newPassword.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Confirm New Password *
                  </label>
                  <input
                    {...registerPassword('confirmPassword', { 
                      required: 'Please confirm your password',
                      validate: (value) => value === watchNewPassword || 'Passwords do not match'
                    })}
                    type="password"
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                    placeholder="Confirm new password"
                  />
                  {passwordErrors.confirmPassword && <p className="text-red-500 text-sm mt-2">{passwordErrors.confirmPassword.message}</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}