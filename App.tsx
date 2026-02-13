import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Board } from './components/Board';
import { User } from './types';
import { auth } from './services';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session via Supabase
    const checkSession = async () => {
      try {
        const sessionUser = await auth.getUser();
        setUser(sessionUser);
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 text-sm animate-pulse">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Board user={user} onLogout={handleLogout} />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
