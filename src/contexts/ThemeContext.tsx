import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

// Bridge direto ao plugin nativo StatusBar (evita depender do pacote JS no build web)
const Style = { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' } as const;
const StatusBar = registerPlugin<{
  setStyle(opts: { style: string }): Promise<void>;
  setBackgroundColor(opts: { color: string }): Promise<void>;
}>('StatusBar');

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);

    // Dynamic HTML Meta Theme-Color: Sempre #0D0D0D oficial
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', '#0D0D0D');

    let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaStatusBar) {
      metaStatusBar = document.createElement('meta');
      metaStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaStatusBar);
    }
    metaStatusBar.setAttribute('content', 'black-translucent');

    // Dynamic Capacitor Native StatusBar styling: sempre fundo nativo oficial #0D0D0D com ícones claros
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#0D0D0D' }).catch(() => {});
      } catch (e) {
        console.error('Error setting native status bar theme:', e);
      }
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
