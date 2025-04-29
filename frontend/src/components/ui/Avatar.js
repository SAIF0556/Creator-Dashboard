// src/components/ui/Avatar.js
import React from 'react';
import Image from 'next/image';

const Avatar = ({ 
  src, 
  alt = 'Avatar', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Default placeholder if no image
  const fallback = (
    <div className="flex items-center justify-center h-full w-full bg-gray-200 text-gray-600 font-medium uppercase">
      {alt.charAt(0)}
    </div>
  );
  
  // Size classes
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };
  
  return (
    <div 
      className={`relative overflow-hidden rounded-full ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100%"
          className="object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : fallback}
    </div>
  );
};

export default Avatar;