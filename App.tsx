import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Board } from './components/Board';
import { User } from './types';
import { api } from './services';
import { isConfigured } from './supabaseClient';
import { Database, ArrowRight } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session via API
    const checkSession = async () => {
      // If not configured, stop loading immediately to show setup screen
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const sessionUser = await api.auth.getSession();
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
    await api.auth.logout();
    setUser(null);
  };

  // 1. 顯示設定引導畫面 (當使用者還沒填入 API Key 時)
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Database size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">連接到 Supabase 資料庫</h1>
          <p className="text-gray-500 mb-6">
            恭喜！你的應用程式介面已經準備好了。<br/>
            現在需要連接到你的資料庫才能開始儲存任務。
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-700 space-y-3 mb-6 border border-gray-200">
            <p className="font-semibold text-gray-900 flex items-center">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-2">1</span>
              開啟 supabaseClient.ts 檔案
            </p>
            <p className="font-semibold text-gray-900 flex items-center">
               <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-2">2</span>
               填入你的 Supabase 資訊：
            </p>
            <div className="pl-7 space-y-2 font-mono text-xs text-gray-500">
               <div className="p-2 bg-gray-200 rounded">const SUPABASE_URL = '...'</div>
               <div className="p-2 bg-gray-200 rounded">const SUPABASE_ANON_KEY = '...'</div>
            </div>
            <p className="text-xs text-gray-400 pl-7">
              * 你可以在 Supabase Dashboard 的 Settings &gt; API 中找到這些資訊。
            </p>
          </div>

          <div className="text-xs text-gray-400">
            修改完成並儲存後，此畫面將會自動刷新。
          </div>
        </div>
      </div>
    );
  }

  // 2. 載入中畫面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 text-sm animate-pulse">系統啟動中...</p>
        </div>
      </div>
    );
  }

  // 3. 主程式畫面
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