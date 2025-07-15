import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ProductImageUploader from '../../components/ProductImageUploader';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  category: string;
  type: string;
  packaging: string;
  basePrice: number;
  stock: number;
  unit: 'L' | 'KG';
  shelfLife: string;
  description: string;
  lowStockAlert: number;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageData, setImageData] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { userProfile } = useAuth();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductFormData>();

  const categories = [
    { value: 'sunflower', label: 'Sunflower Oil' },
    { value: 'groundnut', label: 'Groundnut Oil' },
    { value: 'gingelly', label: 'Gingelly Oil' },
    { value: 'mustard', label: 'Mustard Oil' },
    { value: 'coconut', label: 'Coconut Oil' },
    { value: 'vanaspathi', label: 'Vanaspathi' }
  ];

  const descriptions = [
    'Premium Quality Cold Pressed',
    'Traditional Extraction Method',
    'Pure and Natural',
    'Rich in Nutrients',
    'Ideal for Cooking',
    'Long Shelf Life',
    'Chemical Free',
    'Organic Certified'
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!userProfile) {
      toast.error('User not authenticated');
      return;
    }
    
    setUploading(true);
    
    try {
      // Prepare product data
      const productData = {
        name: data.name.trim(),
        category: data.category,
        type: data.type,
        packaging: data.packaging,
        basePrice: Number(data.basePrice),
        stock: Number(data.stock),
        unit: data.unit,
        shelfLife: data.shelfLife.trim(),
        description: data.description,
        lowStockAlert: Number(data.lowStockAlert),
        updatedAt: Timestamp.now(),
        createdBy: userProfile.id,
        // Add image data if present
        ...(imageData && {
          imageData: imageData,
          imageUpdatedAt: Timestamp.now()
        })
      };

      console.log('Saving product data:', { ...productData, imageData: imageData ? '[Base64 Data]' : 'None' });

      // Save to Firestore
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        toast.success('Product updated successfully!');
        console.log('Product updated in Firestore');
      } else {
        const docRef = await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: Timestamp.now()
        });
        toast.success('Product added successfully!');
        console.log('Product added to Firestore with ID:', docRef.id);
      }

      // Reset form and refresh data
      handleCancel();
      await fetchProducts();
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save product');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('category', product.category);
    setValue('type', product.type);
    setValue('packaging', product.packaging);
    setValue('basePrice', product.basePrice);
    setValue('stock', product.stock);
    setValue('unit', product.unit);
    setValue('shelfLife', product.shelfLife);
    setValue('description', product.description);
    setValue('lowStockAlert', product.lowStockAlert);
    
    // Set existing image data
    setImageData(product.imageData || product.imageURL || '');
    setShowAddForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleCancel = () => {
    reset();
    setImageData('');
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleImageSelect = (base64Data: string) => {
    setImageData(base64Data);
  };

  const handleImageRemove = () => {
    setImageData('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Add/Edit Product Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="md:col-span-2">
                  <ProductImageUploader
                    onImageSelect={handleImageSelect}
                    onImageRemove={handleImageRemove}
                    currentImage={imageData}
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    {...register('name', { required: 'Product name is required' })}
                    type="text"
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    {...register('type', { required: 'Type is required' })}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">Select Type</option>
                    <option value="edible">Edible</option>
                    <option value="non-edible">Non-Edible</option>
                  </select>
                  {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Packaging *
                  </label>
                  <select
                    {...register('packaging', { required: 'Packaging is required' })}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">Select Packaging</option>
                    <option value="tin">Tin</option>
                    <option value="can">Can</option>
                    <option value="bottle">Bottle</option>
                    <option value="box">Box</option>
                  </select>
                  {errors.packaging && <p className="text-red-500 text-sm mt-1">{errors.packaging.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit *
                  </label>
                  <select
                    {...register('unit', { required: 'Unit is required' })}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">Select Unit</option>
                    <option value="L">Litres (L)</option>
                    <option value="KG">Kilograms (KG)</option>
                  </select>
                  {errors.unit && <p className="text-red-500 text-sm mt-1">{errors.unit.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity *
                  </label>
                  <input
                    {...register('stock', { required: 'Stock is required', min: 0 })}
                    type="number"
                    step="0.1"
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  />
                  {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Unit (₹) *
                  </label>
                  <input
                    {...register('basePrice', { required: 'Price is required', min: 0 })}
                    type="number"
                    step="0.01"
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  />
                  {errors.basePrice && <p className="text-red-500 text-sm mt-1">{errors.basePrice.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Alert
                  </label>
                  <input
                    {...register('lowStockAlert', { min: 0 })}
                    type="number"
                    step="0.1"
                    defaultValue={10}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shelf Life
                  </label>
                  <input
                    {...register('shelfLife')}
                    type="text"
                    placeholder="e.g., 12 months"
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <select
                    {...register('description')}
                    disabled={uploading}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                  >
                    <option value="">Select Description</option>
                    {descriptions.map(desc => (
                      <option key={desc} value={desc}>{desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{uploading ? 'Saving...' : 'Save Product'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={uploading}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Products ({products.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={product.imageData || product.imageURL || 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=100';
                          }}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{product.packaging}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 capitalize">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.stock} {product.unit}
                      </div>
                      {product.stock <= product.lowStockAlert && (
                        <div className="text-xs text-red-600 font-medium">Low Stock!</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{product.basePrice}/{product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-amber-600 hover:text-amber-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}