// src/app/layout.js
'use client';

import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { SavedContentProvider } from '@/contexts/SavedContentContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Creator Dashboard',
  description: 'Manage your creator profile, earn credits, and discover content',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SavedContentProvider>
            {children}
          </SavedContentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}