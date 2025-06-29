import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { convertFileToBase64, validateImageFile } from '../utils/imageUpload';

interface ProductImageUploaderProps {
  onImageSelect: (base64Data: string) => void;
  onImageRemove: () => void;
  currentImage?: string;
  disabled?: boolean;
  className?: string;
}

export default function ProductImageUploader({
  onImageSelect,
  onImageRemove,
  currentImage,
  disabled = false,
  className = ''
}: ProductImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError('');
    setIsProcessing(true);

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      // Convert to Base64
      const base64Data = await convertFileToBase64(file);
      onImageSelect(base64Data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      console.error('Image upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemoveImage = () => {
    setError('');
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Product Image
      </label>

      {/* Image Preview or Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors duration-200 ${
          dragOver
            ? 'border-amber-400 bg-amber-50'
            : currentImage
            ? 'border-gray-300'
            : 'border-gray-300 hover:border-amber-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!currentImage ? handleClick : undefined}
      >
        {currentImage ? (
          <div className="relative">
            <img
              src={currentImage}
              alt="Product preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Click to change
            </div>
            {!disabled && (
              <div
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 rounded-lg cursor-pointer flex items-center justify-center"
                onClick={handleClick}
              >
                <Upload className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            {isProcessing ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing image...</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WebP up to 2MB
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="text-xs text-gray-500">
        <p>• Recommended size: 800x600 pixels</p>
        <p>• Maximum file size: 2MB</p>
        <p>• Supported formats: JPG, PNG, WebP</p>
      </div>
    </div>
  );
}