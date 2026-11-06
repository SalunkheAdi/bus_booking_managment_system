import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    checkUser();
    loadDemoAccounts();
  }, []);

  async function checkUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.me();
      if (res.success) {
        setUser(res.user);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadDemoAccounts() {
    try {
      const res = await api.getDemoAccounts();
      if (res.success) {
        setDemoAccounts(res.demoAccounts);
      }
    } catch (e) {
      console.error('Failed to load demo accounts', e);
    }
  }

  async function login(email, password) {
    const res = await api.login(email, password);
    if (res.success) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Login failed');
  }

  async function register(userData) {
    const res = await api.register(userData);
    if (res.success) {
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || 'Registration failed');
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  // Quick 1-click switch for reviewers
  async function quickSwitch(roleOrEmail) {
    setLoading(true);
    try {
      const target = demoAccounts.find(a => a.email === roleOrEmail || a.role === roleOrEmail) || demoAccounts[0];
      if (target) {
        await login(target.email, target.password);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      quickSwitch,
      demoAccounts
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
