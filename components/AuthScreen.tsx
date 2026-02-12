import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { User } from '../types';
import { LayoutDashboard } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulating API call
    setTimeout(() => {
      // Create a mock user
      const user: User = {
        id: 'user-1',
        email,
        name: isLogin ? email.split('@')[0] : name,
      };
      
      // Store token (simulated)
      localStorage.setItem('micro_kanban_token', 'mock_jwt_token');
      localStorage.setItem('micro_kanban_user', JSON.stringify(user));
      
      onLogin(user);
      setLoading(false);
    }, 800);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    // Simulate Google Login Delay
    setTimeout(() => {
        const user: User = {
            id: 'google-user-123',
            email: 'google_user@gmail.com',
            name: 'Google User',
        };
        localStorage.setItem('micro_kanban_token', 'mock_google_token');
        localStorage.setItem('micro_kanban_user', JSON.stringify(user));
        onLogin(user);
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <LayoutDashboard className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">快速工作記事</h1>
        <p className="text-gray-500 mt-2 text-center max-w-sm">
          極簡、直覺的專案管理工具。專注於任務流動與時效管理。
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setIsLogin(true)}
          >
            登入
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              !isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setIsLogin(false)}
          >
            註冊
          </button>
        </div>

        <div className="p-8 pb-0">
             <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
             >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                {loading ? '登入中...' : '使用 Google 帳號登入'}
             </button>
             
             <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">或使用電子郵件</span>
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-2 space-y-6">
          {!isLogin && (
            <Input
              label="暱稱"
              type="text"
              placeholder="您的稱呼"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          
          <Input
            label="電子郵件"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="密碼"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? '處理中...' : isLogin ? '進入看板' : '建立帳戶'}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            點擊即表示您同意我們的服務條款與隱私政策。
          </p>
        </form>
      </div>
    </div>
  );
};