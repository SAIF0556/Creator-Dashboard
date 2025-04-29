'use client';

import React from 'react';

export default function RoleSelector({ selectedRole, onRoleChange }) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Account Type
      </label>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onRoleChange('user')}
          className={`relative rounded-lg border p-4 flex flex-col items-center ${
            selectedRole === 'user'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <span className="text-sm font-medium text-gray-900">User</span>
          <span className="mt-1 text-xs text-gray-500">Content Creator</span>
        </button>
        
        <button
          type="button"
          onClick={() => onRoleChange('admin')}
          className={`relative rounded-lg border p-4 flex flex-col items-center ${
            selectedRole === 'admin'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <span className="text-sm font-medium text-gray-900">Admin</span>
          <span className="mt-1 text-xs text-gray-500">Platform Administrator</span>
        </button>
      </div>
    </div>
  );
} 