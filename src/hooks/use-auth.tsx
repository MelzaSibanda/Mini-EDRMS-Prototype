import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Identity, Role, identity, isSupportedRole } from '../app/lib/enterprise';
import { SESSION_STORAGE_KEY } from '../app/lib/legacy-branding-compatibility';
interface AuthContextType {
  user: Identity | null;
  login: (role: Role) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (p: string) => boolean;
  hasRole: (r: Role | Role[]) => boolean;
}
const Context = createContext<AuthContextType | null>(null);
export function AuthProvider({
  children
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<Identity | null>(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      return data.expires > Date.now() && isSupportedRole(data.role) ? identity(data.role) : null;
    } catch {
      return null;
    }
  });
  const login = (role: Role) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      role,
      expires: Date.now() + 30 * 60 * 1000
    }));
    setUser(identity(role));
  };
  const logout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  };
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const touch = () => {
      clearTimeout(timer);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        role: user.role,
        expires: Date.now() + 30 * 60 * 1000
      }));
      timer = setTimeout(logout, 30 * 60 * 1000);
    };
    touch();
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [user]);
  return <Context.Provider value={{
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission: p => !!user?.permissions.includes(p),
    hasRole: r => !!user && (Array.isArray(r) ? r : [r]).includes(user.role)
  }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Authentication context is unavailable.');
  return value;
}
