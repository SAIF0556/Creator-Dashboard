import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

const AdminDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery(
    'adminAnalytics',
    async () => {
      const response = await axios.get('/api/admin/analytics');
      return response.data;
    }
  );

  const { data: users, isLoading: isLoadingUsers } = useQuery(
    'adminUsers',
    async () => {
      const response = await axios.get('/api/admin/users');
      return response.data;
    }
  );

  const { data: reportedPosts, isLoading: isLoadingReports } = useQuery(
    'reportedPosts',
    async () => {
      const response = await axios.get('/api/admin/reported-posts');
      return response.data;
    }
  );

  const updateCreditsMutation = useMutation(
    async ({ userId, credits }) => {
      const response = await axios.put(`/api/admin/users/${userId}/credits`, { credits });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
      }
    }
  );

  const deletePostMutation = useMutation(
    async (postId) => {
      const response = await axios.delete(`/api/admin/posts/${postId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('reportedPosts');
      }
    }
  );

  if (!user || user.role !== 'admin') {
    router.push('/');
    return null;
  }

  if (isLoadingAnalytics || isLoadingUsers || isLoadingReports) {
    return <Layout>Loading...</Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        {/* Analytics Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Platform Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-bold">{analytics.totalUsers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Posts</h3>
              <p className="text-2xl font-bold">{analytics.totalPosts}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Reported Posts</h3>
              <p className="text-2xl font-bold">{analytics.totalReports}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Avg Credits</h3>
              <p className="text-2xl font-bold">
                {Math.round(analytics.userCreditsDistribution.avgCredits)}
              </p>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">User Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={user.credits}
                        onChange={(e) => {
                          updateCreditsMutation.mutate({
                            userId: user._id,
                            credits: parseInt(e.target.value)
                          });
                        }}
                        className="w-20 border rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this user?')) {
                            // Implement user deletion
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reported Posts Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Reported Posts</h2>
          <div className="space-y-4">
            {reportedPosts.map((post) => (
              <div key={post._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{post.content.substring(0, 150)}...</p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Reported by: {post.reportedBy.map(r => r.user.username).join(', ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Reasons: {post.reportedBy.map(r => r.reason).join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this post?')) {
                        deletePostMutation.mutate(post._id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard; 