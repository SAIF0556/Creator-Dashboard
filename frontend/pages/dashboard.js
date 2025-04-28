import { useQuery } from 'react-query';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: savedPosts, isLoading } = useQuery(
    'savedPosts',
    async () => {
      const response = await axios.get('/api/feed', {
        params: {
          saved: true
        }
      });
      return response.data;
    },
    {
      enabled: !!user
    }
  );

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to view your dashboard</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Your Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Username:</span> {user.username}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">Credits:</span> {user.credits}</p>
                <p><span className="font-medium">Role:</span> {user.role}</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Activity Stats</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Last Login:</span> {new Date(user.lastLogin).toLocaleString()}</p>
                <p><span className="font-medium">Saved Posts:</span> {savedPosts?.posts?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Saved Posts</h2>
          
          {isLoading ? (
            <p>Loading saved posts...</p>
          ) : savedPosts?.posts?.length > 0 ? (
            <div className="space-y-4">
              {savedPosts.posts.map((post) => (
                <div key={post._id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{post.content.substring(0, 150)}...</p>
                  <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                    <span>{post.source}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No saved posts yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard; 