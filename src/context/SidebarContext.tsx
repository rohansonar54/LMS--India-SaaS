'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  desktopOpen: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore saved desktop sidebar preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lms_sidebar_open');
      if (saved !== null) {
        setDesktopOpen(saved === 'true');
      }
    }
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopOpen((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('lms_sidebar_open', String(next));
        }
        return next;
      });
    }
  };

  const closeSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen(false);
    } else {
      setDesktopOpen(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lms_sidebar_open', 'false');
      }
    }
  };

  const openSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      setDesktopOpen(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lms_sidebar_open', 'true');
      }
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        desktopOpen,
        mobileOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    return {
      desktopOpen: true,
      mobileOpen: false,
      toggleSidebar: () => {},
      openSidebar: () => {},
      closeSidebar: () => {},
      setMobileOpen: () => {},
    };
  }
  return context;
}

