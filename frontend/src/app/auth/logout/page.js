'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { removeAuthCookies } from '../../../utils/auth';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Remove auth cookies
    removeAuthCookies();
    
    // Redirect to login page
    router.push('/auth/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
} 