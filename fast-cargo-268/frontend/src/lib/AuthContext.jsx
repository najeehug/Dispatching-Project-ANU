import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, login as apiLogin } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fc268_token');
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('fc268_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (phone, password) => {
    const { token, user } = await apiLogin(phone, password);
    localStorage.setItem('fc268_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('fc268_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
