// src/components/ui/Card.js
import React from 'react';

const Card = ({ 
  children, 
  title,
  subtitle,
  footer,
  className = '',
  noPadding = false,
  ...props 
}) => {
  return (
    <div 
      className={`bg-white shadow rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          {title && (
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className={noPadding ? '' : 'px-4 py-5 sm:p-6'}>
        {children}
      </div>
      
      {footer && (
        <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;