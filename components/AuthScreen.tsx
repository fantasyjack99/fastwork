import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { User } from '../types';
import { LayoutDashboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setVerificationSent(false);
    
    try {
        if (isLogin) {
            const user = await api.auth.login(email, password);
            onLogin(user);
        } else {
            const user = await api.auth.register(name, email, password);
            if (user) {
              onLogin(user);
            } else {
              // User created but session null => Needs email verification
              setVerificationSent(true);
              setIsLogin(true); // Switch to login view
            }
        }
    } catch (e: any) {
        console.error(e);
        let msg = '操作失敗，請稍後再試。';
        if (e.message.includes('Invalid login credentials')) msg = '帳號或密碼錯誤';
        if (e.message.includes('User already registered')) msg = '此 Email 已被註冊';
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <LayoutDashboard className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">快速工作記事</h1>
        <p className="text-gray-500 mt-2 text-center max-w-sm">
          極簡、直覺的專案管理工具。專注於任務流動與時效管理。
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in zoom-in duration-300">
        <div className="flex border-b">
          <button
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setIsLogin(true); setError(''); setVerificationSent(false); }}
          >
            登入
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
              !isLogin ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setIsLogin(false); setError(''); setVerificationSent(false); }}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {verificationSent && (
             <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg flex items-start">
                <CheckCircle2 size={18} className="mr-2 shrink-0 mt-0.5"/>
                <div>
                   <p className="font-bold">註冊成功！</p>
                   <p>驗證信已寄至您的信箱，請點擊信中連結完成啟用，然後再次登入。</p>
                </div>
             </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center">
                <AlertCircle size={16} className="mr-2 shrink-0"/>
                {error}
            </div>
          )}

          {!isLogin && (
            <Input
              label="暱稱"
              type="text"
              placeholder="您的稱呼"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
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
              className="w-full h-11 relative"
              disabled={loading}
            >
              {loading ? (
                  <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      處理中...
                  </span>
              ) : (
                  isLogin ? '進入看板' : '建立帳戶'
              )}
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