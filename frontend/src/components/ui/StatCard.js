// src/components/ui/StatCard.js
import React from 'react';

const StatCard = ({
  title,
  value,
  icon,
  color = 'indigo',
  footer,
  progress,
  progressText,
}) => {
  // Color classes
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      progress: 'bg-indigo-500',
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      progress: 'bg-blue-500',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      progress: 'bg-green-500',
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-600',
      progress: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      progress: 'bg-red-500',
    },
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses[color].bg} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className={`text-lg font-semibold ${value && typeof value === 'string' && value.startsWith('+') ? 'text-green-600' : 'text-gray-900'}`}>
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
        
        {progress !== undefined && (
          <div className="mt-4">
            <div className="relative">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${progress}%` }} 
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colorClasses[color].progress}`}
                ></div>
              </div>
            </div>
            {progressText && (
              <div className="text-xs font-medium text-gray-500 mt-1">
                {progressText}
              </div>
            )}
          </div>
        )}
        
        {footer && (
          <div className="mt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;