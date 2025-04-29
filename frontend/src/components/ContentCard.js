'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ContentCard({ content, viewMode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save functionality
  };

  const handleShare = () => {
    // TODO: Implement share functionality
  };

  const handleReport = () => {
    // TODO: Implement report functionality
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${
      viewMode === 'list' ? 'flex' : ''
    }`}>
      {content.image && (
        <div className={`relative ${viewMode === 'list' ? 'w-1/3' : 'w-full h-48'}`}>
          <Image
            src={content.image}
            alt={content.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      <div className={`p-4 ${viewMode === 'list' ? 'w-2/3' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-500">{content.source}</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm text-gray-500">{content.date}</span>
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
        
        <p className={`text-gray-600 mb-4 ${!isExpanded ? 'line-clamp-3' : ''}`}>
          {content.description}
        </p>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`p-2 rounded-full ${
                isSaved ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
            </button>
            <button
              onClick={handleReport}
              className="p-2 rounded-full bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-500 hover:text-blue-700"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>
    </div>
  );
} 