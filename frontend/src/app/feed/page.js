'use client';

import { useState, useEffect } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import ContentCard from '@/components/ContentCard';
import FilterControls from '@/components/FilterControls';
import { useContent } from '@/contexts/ContentContext';

export default function FeedPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    source: 'all',
    contentType: 'all',
    dateRange: 'all'
  });

  const { content, loading, error, fetchMore } = useContent();
  const { loadMoreRef } = useInfiniteScroll(fetchMore);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Content Feed</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            List View
          </button>
        </div>
      </div>

      <FilterControls filters={filters} setFilters={setFilters} />

      <div className={`mt-6 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
        {content.map((item) => (
          <ContentCard key={item.id} content={item} viewMode={viewMode} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center my-8">
          Error loading content. Please try again.
        </div>
      )}

      <div ref={loadMoreRef} className="h-10" />
    </div>
  );
} 