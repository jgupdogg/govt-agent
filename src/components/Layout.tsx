import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg transition-colors duration-300">
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      
      {/* Header */}
      <header className="bg-oddBlock dark:bg-oddBlockDark p-8 mb-8 transition-colors duration-300">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-textDark dark:text-textLight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-center mt-2 text-textDark dark:text-textLight opacity-80">
            {subtitle}
          </p>
        )}
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-oddBlock dark:bg-oddBlockDark py-4 px-6 text-center text-textDark dark:text-textLight transition-colors duration-300">
        <p className="opacity-70 text-sm">© 2025 Knowledge Base Search. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;