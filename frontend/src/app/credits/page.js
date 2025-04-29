// src/app/credits/page.js
'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CreditCard, Check, Calendar, Award } from 'lucide-react';

const Credits = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCredits: 0,
    thisWeekCredits: 0,
    thisMonthCredits: 0,
    nextLevel: 0
  });
  const [earningOpportunities, setEarningOpportunities] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchCreditData = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, these would be API calls
        // const statsResponse = await fetch('/api/credits/stats');
        // const transactionsResponse = await fetch('/api/credits/transactions');
        // const opportunitiesResponse = await fetch('/api/credits/opportunities');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        setStats({
          totalCredits: 1240,
          thisWeekCredits: 85,
          thisMonthCredits: 320,
          nextLevel: 1500
        });
        
        setTransactions([
          {
            id: 1,
            description: 'Daily Login Bonus',
            amount: 10,
            type: 'earned',
            timestamp: '2023-04-29T08:30:00Z'
          },
          {
            id: 2,
            description: 'Saved Content',
            amount: 5,
            type: 'earned',
            timestamp: '2023-04-28T14:15:00Z'
          },
          {
            id: 3,
            description: 'Shared to Twitter',
            amount: 15,
            type: 'earned',
            timestamp: '2023-04-27T16:45:00Z'
          },
          {
            id: 4,
            description: 'Profile Completion',
            amount: 50,
            type: 'earned',
            timestamp: '2023-04-25T11:20:00Z'
          },
          {
            id: 5,
            description: 'Weekly Streak Bonus',
            amount: 25,
            type: 'earned',
            timestamp: '2023-04-23T09:10:00Z'
          }
        ]);
        
        setEarningOpportunities([
          {
            id: 1,
            title: 'Complete Your Profile',
            description: 'Add a profile picture, bio, and other details to earn credits.',
            amount: 50,
            completed: true
          },
          {
            id: 2,
            title: 'Daily Login',
            description: 'Log in every day to earn daily bonus credits.',
            amount: 10,
            completed: true
          },
          {
            id: 3,
            title: 'Save 10 Content Items',
            description: 'Save interesting content to your collection.',
            amount: 25,
            completed: false,
            progress: 4,
            total: 10
          },
          {
            id: 4,
            title: 'Share Content on Social Media',
            description: 'Share content with your network on social platforms.',
            amount: 15,
            completed: false
          },
          {
            id: 5,
            title: 'Maintain a 14-Day Login Streak',
            description: 'Log in every day for two weeks without missing a day.',
            amount: 100,
            completed: false,
            progress: 5,
            total: 14
          }
        ]);
        
      } catch (error) {
        console.error('Error fetching credit data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCreditData();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(transaction => {
    if (activeTab === 'all') return true;
    return transaction.type === activeTab;
  });

  // Credit history chart data
  const chartData = [
    { name: 'Mon', credits: 10 },
    { name: 'Tue', credits: 15 },
    { name: 'Wed', credits: 5 },
    { name: 'Thu', credits: 20 },
    { name: 'Fri', credits: 25 },
    { name: 'Sat', credits: 10 },
    { name: 'Sun', credits: 0 }
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Credits & Rewards</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Credit Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Credits
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-indigo-600">
                  {stats.totalCredits}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Credits This Week
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-green-600">
                  +{stats.thisWeekCredits}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Credits This Month
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-600">
                  +{stats.thisMonthCredits}
                </dd>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Next Level
                </dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.nextLevel} credits
                  <div className="mt-1">
                    <div className="relative">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{width: `${(stats.totalCredits/stats.nextLevel)*100}%`}} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-gray-500 mt-1">
                      {stats.nextLevel - stats.totalCredits} credits to go
                    </div>
                  </div>
                </dd>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Credit History Chart */}
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Credit History</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="credits" fill="#6366F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Credit Earning Opportunities */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Earning Opportunities</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {earningOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-6 w-6 rounded-full ${
                          opportunity.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        } flex items-center justify-center`}>
                          {opportunity.completed ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-semibold">{opportunity.id}</span>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{opportunity.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{opportunity.description}</p>
                          {opportunity.progress !== undefined && (
                            <div className="mt-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(opportunity.progress/opportunity.total)*100}%` }}></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{opportunity.progress} of {opportunity.total} completed</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +{opportunity.amount} credits
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Credit Transactions</h2>
              <div>
                <select
                  className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                >
                  <option value="all">All Transactions</option>
                  <option value="earned">Earned Only</option>
                  <option value="spent">Spent Only</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(transaction.timestamp)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'earned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
              <nav className="flex items-center justify-between" aria-label="Pagination">
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredTransactions.length}</span> of <span className="font-medium">{filteredTransactions.length}</span> results
                  </p>
                </div>
                <div className="flex-1 flex justify-between sm:justify-end">
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Credits;