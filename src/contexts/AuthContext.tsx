import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  currentUser: FirebaseUser | null; // Add this for compatibility
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUserProfile({ id: user.uid, ...userData });
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUserProfile({ id: firebaseUser.uid, ...userData });
            console.log('User profile loaded:', userData.role);
          } else {
            console.log('No user profile found');
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setUserProfile({ id: userCredential.user.uid, ...userData });
        
        toast.success(`Welcome back, ${userData.profile.name}!`);
        
        // Navigate based on role
        const role = userData.role;
        let redirectPath = '/';
        
        switch (role) {
          case 'customer':
            redirectPath = '/customer';
            break;
          case 'staff':
            redirectPath = '/staff';
            break;
          case 'owner':
            redirectPath = '/admin';
            break;
          default:
            redirectPath = '/';
        }
        
        // Use setTimeout to ensure state updates are complete
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 100);
        
      } else {
        throw new Error('User profile not found');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile
      const userProfileData: Omit<User, 'id'> = {
        email,
        role: userData.role || 'customer',
        profile: {
          name: userData.name || '',
          phone: userData.phone || '',
          address: userData.address || '',
        },
        createdAt: Timestamp.now(),
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfileData);
      setUserProfile({ id: userCredential.user.uid, ...userProfileData });
      
      toast.success('Account created successfully!');
      
      // Navigate based on role
      const role = userData.role || 'customer';
      let redirectPath = '/';
      
      switch (role) {
        case 'customer':
          redirectPath = '/customer';
          break;
        case 'staff':
          redirectPath = '/staff';
          break;
        case 'owner':
          redirectPath = '/admin';
          break;
        default:
          redirectPath = '/';
      }
      
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 100);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      toast.success('Logged out successfully');
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    currentUser: user, // Add this for compatibility
    login,
    register,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}