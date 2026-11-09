import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting, getAllRecords, addRecord, STORES } from '../database/db.js';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [factoryName, setFactoryName] = useState('Siam Plastic Factory');
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem('siam_authed');
    if (remembered === 'true') setIsAuthenticated(true);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const dm = await getSetting('darkMode');
      const fn = await getSetting('factoryName');
      if (dm !== null) setDarkMode(dm);
      if (fn) setFactoryName(fn);
      loadNotifications();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const all = await getAllRecords(STORES.notifications);
      setNotifications(all.filter(n => !n.read));
    } catch (e) {}
  };

  const login = async (pin) => {
    const storedPin = await getSetting('pin');
    const correctPin = storedPin || '1234';
    if (pin === correctPin) {
      setIsAuthenticated(true);
      localStorage.setItem('siam_authed', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('siam_authed');
  };

  const toggleDarkMode = async () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    await setSetting('darkMode', newVal);
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const logActivity = async (type, message) => {
    try {
      await addRecord(STORES.activity_log, { type, message, createdAt: new Date().toISOString() });
    } catch (e) {}
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout,
      darkMode, toggleDarkMode,
      factoryName, setFactoryName,
      notifications, loadNotifications,
      toast, showToast,
      sidebarOpen, setSidebarOpen,
      isLoading,
      logActivity,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
