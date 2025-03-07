#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Finalizing Solana Traders Dashboard...${NC}"

# Install only necessary dependencies
echo -e "${YELLOW}Installing final dependencies...${NC}"
npm install -D tailwindcss postcss autoprefixer

# Create clean tailwind config
echo -e "${YELLOW}Creating final tailwind config...${NC}"
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Main theme colors
        'primary': '#3E442B',
        'secondary': '#6A7062',
        'accent': '#8D909B',
        
        // Background colors
        'lightBg': '#F9FAFB',
        'darkBg': '#3E442B',
        
        // Content block colors
        'oddBlock': '#AAADC4',
        'evenBlock': '#D6EEFF',
        'oddBlockDark': '#6A7062',
        'evenBlockDark': '#8D909B',
        
        // Text colors
        'textDark': '#3E442B',
        'textLight': '#D6EEFF',
        
        // Shortcuts for backward compatibility
        'drab-brown': '#3E442B',
        'ebony': '#6A7062',
        'cool-gray': '#8D909B',
        'cool-gray-light': '#AAADC4',
        'columbia-blue': '#D6EEFF',
      }
    },
  },
  plugins: [],
}
EOL

# Create final postcss config
echo -e "${YELLOW}Creating final PostCSS config...${NC}"
cat > postcss.config.js << 'EOL'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOL

# Create final index.css
echo -e "${YELLOW}Creating final index.css...${NC}"
cat > src/index.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global styles */
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

body {
  @apply bg-lightBg text-textDark transition-colors duration-300; /* Default light theme */
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}

.dark body {
  @apply bg-darkBg text-textLight; /* Dark theme */
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.dark ::-webkit-scrollbar-track {
  background: #2d2d2d;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Card hover effect */
.card-hover {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.dark .card-hover:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}
EOL

# Create final colors.js
echo -e "${YELLOW}Creating final colors.js...${NC}"
cat > src/colors.js << 'EOL'
// src/colors.js
const colors = {
  // New color palette
  primary: '#3E442B',       // Drab dark brown
  primaryDark: '#3E442B',   // Same for dark mode
  primaryForeground: '#FFFFFF',
  
  secondary: '#6A7062',     // Ebony
  secondaryDark: '#6A7062', // Same for dark mode
  secondaryForeground: '#FFFFFF',
  
  accent: '#8D909B',        // Cool gray
  accentForeground: '#FFFFFF',
  
  // UI feedback colors
  destructive: '#FF4444',
  destructiveDark: '#FF6666',
  destructiveForeground: '#FFFFFF',
  
  // Background colors
  background: '#FFFFFF',
  darkBg: '#3E442B',        // Using drab dark brown for dark background
  lightBg: '#F9FAFB',       // Light background
  
  // Content block colors
  oddBlock: '#AAADC4',      // Cool gray (lighter)
  evenBlock: '#D6EEFF',     // Columbia blue
  oddBlockDark: '#6A7062',  // Ebony
  evenBlockDark: '#8D909B', // Cool gray
  
  // Text colors
  textDark: '#3E442B',      // Drab dark brown for text
  textLight: '#D6EEFF',     // Columbia blue for light text
};

export default colors;
EOL

# Create final ThemeContext
echo -e "${YELLOW}Creating final ThemeContext...${NC}"
cat > src/contexts/ThemeContext.tsx << 'EOL'
// src/contexts/ThemeContext.tsx
import React, { createContext, useState, useEffect } from 'react';

interface ThemeContextProps {
  theme: string;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize theme based on local storage or default to 'light'
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      // Check user preference
      if (savedTheme) {
        return savedTheme;
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Update the root element class based on the theme
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save the current theme to local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme: string) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
EOL

# Create final SolanaTraders component
echo -e "${YELLOW}Creating final SolanaTraders component...${NC}"
cat > src/pages/SolanaTraders.tsx << 'EOL'
// src/pages/SolanaTraders.tsx
import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// Mock data interface
interface WhaleNotification {
  NOTIFICATION_ID: number;
  TIMESTAMP: string;
  ADDRESS: string;
  SYMBOL: string;
  NAME: string;
  TIME_INTERVAL: string;
  NUM_USERS_BOUGHT: number;
  NUM_USERS_SOLD: number;
  INSERTED_AT: string;
}

// Mock data
const mockWhaleData: WhaleNotification[] = [
  {
    NOTIFICATION_ID: 1,
    TIMESTAMP: new Date().toISOString(),
    ADDRESS: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    SYMBOL: 'SOL',
    NAME: 'Solana',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 245,
    NUM_USERS_SOLD: 124,
    INSERTED_AT: new Date().toISOString()
  },
  {
    NOTIFICATION_ID: 2,
    TIMESTAMP: new Date(Date.now() - 3600000).toISOString(),
    ADDRESS: '0x6b175474e89094c44da98b954eedeac495271d0f',
    SYMBOL: 'BONK',
    NAME: 'Bonk',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 187,
    NUM_USERS_SOLD: 203,
    INSERTED_AT: new Date(Date.now() - 3600000).toISOString()
  },
  {
    NOTIFICATION_ID: 3,
    TIMESTAMP: new Date(Date.now() - 7200000).toISOString(),
    ADDRESS: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    SYMBOL: 'JUP',
    NAME: 'Jupiter',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 312,
    NUM_USERS_SOLD: 98,
    INSERTED_AT: new Date(Date.now() - 7200000).toISOString()
  }
];

const SolanaTraders: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [whaleData, setWhaleData] = useState<WhaleNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate API call with setTimeout
    const timer = setTimeout(() => {
      setWhaleData(mockWhaleData);
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate summary metrics
  const uniqueTokens = loading ? 0 : [...new Set(whaleData.map(item => item.SYMBOL))].length;
  const totalBuys = loading ? 0 : whaleData.reduce((sum, item) => sum + item.NUM_USERS_BOUGHT, 0);
  const totalSells = loading ? 0 : whaleData.reduce((sum, item) => sum + item.NUM_USERS_SOLD, 0);
  const netActivity = totalBuys - totalSells;

  // Format timestamp
  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format address
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

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
          Solana Traders Dashboard
        </h1>
        <p className="text-center mt-2 text-textDark dark:text-textLight opacity-80">
          Monitor whale activity and trading patterns on Solana
        </p>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-oddBlock dark:bg-oddBlockDark h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-oddBlock dark:bg-oddBlockDark rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-oddBlock dark:bg-oddBlockDark rounded"></div>
                  <div className="h-4 bg-oddBlock dark:bg-oddBlockDark rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-oddBlock dark:bg-oddBlockDark p-6 rounded-lg shadow-md card-hover transition-colors duration-300">
                <h2 className="font-bold text-textDark dark:text-textLight">Tracked Tokens</h2>
                <p className="text-3xl mt-2 font-semibold text-textDark dark:text-textLight">{uniqueTokens}</p>
              </div>
              
              <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md card-hover transition-colors duration-300">
                <h2 className="font-bold text-textDark dark:text-textLight">Buy Transactions</h2>
                <p className="text-3xl mt-2 font-semibold text-textDark dark:text-textLight">{totalBuys}</p>
              </div>
              
              <div className="bg-oddBlock dark:bg-oddBlockDark p-6 rounded-lg shadow-md card-hover transition-colors duration-300">
                <h2 className="font-bold text-textDark dark:text-textLight">Sell Transactions</h2>
                <p className="text-3xl mt-2 font-semibold text-textDark dark:text-textLight">{totalSells}</p>
              </div>
              
              <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md card-hover transition-colors duration-300">
                <h2 className="font-bold text-textDark dark:text-textLight">Net Activity</h2>
                <p className="text-3xl mt-2 font-semibold text-textDark dark:text-textLight">
                  {netActivity > 0 ? `+${netActivity}` : netActivity}
                </p>
              </div>
            </div>
            
            {/* Whale Activity Table */}
            <div className="bg-evenBlock dark:bg-evenBlockDark p-6 rounded-lg shadow-md mb-8 transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
                Recent Whale Activity
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Time</th>
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Token</th>
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Address</th>
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Buyers</th>
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Sellers</th>
                      <th className="py-2 px-4 text-left text-textDark dark:text-textLight">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whaleData.map((item) => {
                      const netActivity = item.NUM_USERS_BOUGHT - item.NUM_USERS_SOLD;
                      return (
                        <tr key={item.NOTIFICATION_ID} className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-2 px-4 text-textDark dark:text-textLight">{formatDate(item.TIMESTAMP)}</td>
                          <td className="py-2 px-4 text-textDark dark:text-textLight font-medium">{item.NAME} <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">{item.SYMBOL}</span></td>
                          <td className="py-2 px-4 text-textDark dark:text-textLight font-mono text-sm">{formatAddress(item.ADDRESS)}</td>
                          <td className="py-2 px-4 text-textDark dark:text-textLight">{item.NUM_USERS_BOUGHT}</td>
                          <td className="py-2 px-4 text-textDark dark:text-textLight">{item.NUM_USERS_SOLD}</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-1 rounded ${netActivity > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {netActivity > 0 ? `+${netActivity}` : netActivity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* About This Dashboard */}
            <div className="bg-oddBlock dark:bg-oddBlockDark p-6 rounded-lg shadow-md mb-8 transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 text-textDark dark:text-textLight">
                About This Dashboard
              </h2>
              <p className="text-textDark dark:text-textLight mb-4">
                This dashboard monitors whale trading activity on the Solana blockchain. We track significant buy and sell transactions 
                for popular Solana tokens to identify market trends and potential price movements. The data is collected 
                in real-time and stored in our Snowflake database for analysis.
              </p>
              <p className="text-textDark dark:text-textLight">
                Use this information to identify which tokens are attracting trading activity from large wallets, 
                which can sometimes foreshadow broader market movements. This dashboard is part of our comprehensive 
                blockchain analytics suite at Agent Alpha.
              </p>
            </div>
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-oddBlock dark:bg-oddBlockDark py-4 px-6 text-center text-textDark dark:text-textLight transition-colors duration-300">
        <p className="opacity-70 text-sm">© 2025 Agent Alpha. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SolanaTraders;
EOL

# Create final main.tsx (without react-router-dom)
echo -e "${YELLOW}Creating final main.tsx without router dependency...${NC}"
cat > src/main.tsx << 'EOL'
// src/main.tsx - Simple entry point without react-router-dom
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import SolanaTraders from './pages/SolanaTraders';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SolanaTraders />
    </ThemeProvider>
  </React.StrictMode>
);
EOL

# Create a simple SnowflakeClient.ts with mock data
echo -e "${YELLOW}Creating SnowflakeClient service with mock data...${NC}"
mkdir -p src/services
cat > src/services/SnowflakeClient.ts << 'EOL'
// src/services/SnowflakeClient.ts
export interface WhaleNotification {
  NOTIFICATION_ID: number;
  TIMESTAMP: string;
  ADDRESS: string;
  SYMBOL: string;
  NAME: string;
  TIME_INTERVAL: string;
  NUM_USERS_BOUGHT: number;
  NUM_USERS_SOLD: number;
  INSERTED_AT: string;
}

export interface TokenStats {
  SYMBOL: string;
  NAME: string;
  NOTIFICATION_COUNT: number;
  TOTAL_BUYS: number;
  TOTAL_SELLS: number;
  NET_ACTIVITY: number;
  LATEST_ACTIVITY: string;
}

// Mock data for testing/development
const mockWhaleData: WhaleNotification[] = [
  {
    NOTIFICATION_ID: 1,
    TIMESTAMP: new Date().toISOString(),
    ADDRESS: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    SYMBOL: 'SOL',
    NAME: 'Solana',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 245,
    NUM_USERS_SOLD: 124,
    INSERTED_AT: new Date().toISOString()
  },
  {
    NOTIFICATION_ID: 2,
    TIMESTAMP: new Date(Date.now() - 3600000).toISOString(),
    ADDRESS: '0x6b175474e89094c44da98b954eedeac495271d0f',
    SYMBOL: 'BONK',
    NAME: 'Bonk',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 187,
    NUM_USERS_SOLD: 203,
    INSERTED_AT: new Date(Date.now() - 3600000).toISOString()
  },
  {
    NOTIFICATION_ID: 3,
    TIMESTAMP: new Date(Date.now() - 7200000).toISOString(),
    ADDRESS: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    SYMBOL: 'JUP',
    NAME: 'Jupiter',
    TIME_INTERVAL: '1h',
    NUM_USERS_BOUGHT: 312,
    NUM_USERS_SOLD: 98,
    INSERTED_AT: new Date(Date.now() - 7200000).toISOString()
  }
];

class SnowflakeClient {
  private baseUrl: string;
  private useMockData: boolean;

  constructor() {
    // Safely access environment variables
    const envBaseUrl = import.meta.env?.VITE_API_BASE_URL;
    this.baseUrl = envBaseUrl || 'http://localhost:8000/api';
    console.log('API Base URL:', this.baseUrl);
    
    // Set to true to use mock data, false to use actual API
    this.useMockData = true; // Change to false when API is ready
  }

  // Get whale notifications
  async getWhaleNotifications(limit: number = 100, symbol?: string): Promise<WhaleNotification[]> {
    // Use mock data if enabled
    if (this.useMockData) {
      let data = [...mockWhaleData];
      
      if (symbol) {
        data = data.filter(notification => notification.SYMBOL === symbol);
      }
      
      return data.slice(0, limit);
    }
    
    try {
      let url = `${this.baseUrl}/whale-notifications?limit=${limit}`;
      if (symbol) {
        url += `&symbol=${encodeURIComponent(symbol)}`;
      }

      console.log('Fetching from URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching whale notifications:', error);
      throw error;
    }
  }

  // Get token statistics
  async getTokenStats(): Promise<TokenStats[]> {
    // Generate mock stats if mock data is enabled
    if (this.useMockData) {
      const stats: TokenStats[] = [
        {
          SYMBOL: "SOL",
          NAME: "Solana",
          NOTIFICATION_COUNT: 12,
          TOTAL_BUYS: 1245,
          TOTAL_SELLS: 824,
          NET_ACTIVITY: 421,
          LATEST_ACTIVITY: new Date().toISOString()
        },
        {
          SYMBOL: "BONK",
          NAME: "Bonk",
          NOTIFICATION_COUNT: 8,
          TOTAL_BUYS: 987,
          TOTAL_SELLS: 1103,
          NET_ACTIVITY: -116,
          LATEST_ACTIVITY: new Date(Date.now() - 3600000).toISOString()
        },
        {
          SYMBOL: "JUP",
          NAME: "Jupiter",
          NOTIFICATION_COUNT: 10,
          TOTAL_BUYS: 1512,
          TOTAL_SELLS: 698,
          NET_ACTIVITY: 814,
          LATEST_ACTIVITY: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      
      return stats;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/token-stats`);
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching token stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const snowflakeClient = new SnowflakeClient();
export default snowflakeClient;
EOL

# Create a minimal vite.config.js
echo -e "${YELLOW}Creating minimal vite.config.js...${NC}"
cat > vite.config.js << 'EOL'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
  },
  define: {
    // Define any global constants here if needed
  }
});
EOL

# Create/update vite-env.d.ts
echo -e "${YELLOW}Creating vite-env.d.ts...${NC}"
mkdir -p src/types
cat > src/vite-env.d.ts << 'EOL'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOL

# Start the development server to verify everything works
echo -e "${GREEN}Final setup complete!${NC}"
echo -e "${YELLOW}Cleaning previous build artifacts...${NC}"
rm -rf node_modules/.vite || true

# Remove unnecessary files
echo -e "${YELLOW}Removing unnecessary temporary files...${NC}"
rm -f src/App.tsx # Remove App.tsx that has router dependency
rm -f src/routes.tsx # Remove routes file if it exists
rm -f src/pages/SolanaTraders-basic.tsx # Remove test files
rm -f src/pages/SolanaTradersBasic.tsx # Remove test files
rm -f src/pages/SolanaTradersComplete.tsx # Remove test files
rm -f src/main-standalone.tsx # Remove test files
rm -f src/simplest-main.tsx # Remove test files
rm -f src/basic-main.tsx # Remove test files
rm -f src/minimal-starter.tsx # Remove test files

echo -e "${GREEN}Starting the development server...${NC}"
echo -e "${YELLOW}Press Ctrl+C when done...${NC}"
npm run dev