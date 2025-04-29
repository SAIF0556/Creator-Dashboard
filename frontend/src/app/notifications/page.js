'use client';

import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const { notifications, markAsRead, markAllAsRead, loading, error } = useNotifications();

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-4">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Mark All as Read
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            <option value="credit">Credits</option>
            <option value="content">Content</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center my-8">
          Error loading notifications. Please try again.
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center my-8 text-gray-500">
          No notifications to display.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-md ${
                notification.read ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      notification.read ? 'bg-gray-400' : 'bg-blue-500'
                    }`}></span>
                    <span className="text-sm text-gray-500">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm font-medium text-gray-700">
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-gray-800">{notification.message}</p>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 