import { createContext, useContext, useState, useEffect } from 'react';

const SavedContentContext = createContext();

export function SavedContentProvider({ children }) {
  const [savedContent, setSavedContent] = useState([]);

  // Load saved content from localStorage on initial render
  useEffect(() => {
    const saved = localStorage.getItem('savedContent');
    if (saved) {
      setSavedContent(JSON.parse(saved));
    }
  }, []);

  // Save content to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('savedContent', JSON.stringify(savedContent));
  }, [savedContent]);

  const addToSaved = (content) => {
    setSavedContent((prev) => [...prev, content]);
  };

  const removeFromSaved = (contentId) => {
    setSavedContent((prev) => prev.filter((item) => item.id !== contentId));
  };

  const isContentSaved = (contentId) => {
    return savedContent.some((item) => item.id === contentId);
  };

  return (
    <SavedContentContext.Provider
      value={{
        savedContent,
        addToSaved,
        removeFromSaved,
        isContentSaved,
      }}
    >
      {children}
    </SavedContentContext.Provider>
  );
}

export function useSavedContent() {
  const context = useContext(SavedContentContext);
  if (!context) {
    throw new Error('useSavedContent must be used within a SavedContentProvider');
  }
  return context;
} 