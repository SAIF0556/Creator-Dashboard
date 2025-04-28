import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const Feed = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['feed', page],
    async () => {
      const response = await axios.get(`/api/feed?page=${page}`);
      return response.data;
    }
  );

  const savePostMutation = useMutation(
    async (postId) => {
      const response = await axios.post(`/api/feed/${postId}/save`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('feed');
      }
    }
  );

  const sharePostMutation = useMutation(
    async (postId) => {
      const response = await axios.post(`/api/feed/${postId}/share`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('feed');
      }
    }
  );

  const reportPostMutation = useMutation(
    async ({ postId, reason }) => {
      const response = await axios.post(`/api/feed/${postId}/report`, { reason });
      return response.data;
    }
  );

  if (isLoading) return <Layout>Loading...</Layout>;
  if (error) return <Layout>Error loading feed</Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Feed</h1>
        
        <div className="space-y-6">
          {data.posts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">{post.source}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <a
                    href={post.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {post.author}
                  </a>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-gray-700 mb-4">{post.content}</p>

              {post.media && post.media.length > 0 && (
                <div className="mb-4">
                  {post.media.map((media, index) => (
                    <img
                      key={index}
                      src={media.url}
                      alt={`Media ${index + 1}`}
                      className="max-w-full h-auto rounded"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => savePostMutation.mutate(post._id)}
                    className="text-sm text-gray-500 hover:text-primary-600"
                    disabled={!user}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => sharePostMutation.mutate(post._id)}
                    className="text-sm text-gray-500 hover:text-primary-600"
                    disabled={!user}
                  >
                    Share
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Please enter the reason for reporting:');
                      if (reason) {
                        reportPostMutation.mutate({ postId: post._id, reason });
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-red-600"
                    disabled={!user}
                  >
                    Report
                  </button>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{post.likes} likes</span>
                  <span>{post.shares} shares</span>
                  <span>{post.comments} comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Feed; 