import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------
// 使用環境變數讀取 Supabase 設定
// 請確保專案根目錄有 .env 檔案，並包含以下變數：
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
// --------------------------------------------------------

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mcnxtcomzzcuwriwlbky.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbnh0Y29tenpjdXdyaXdsYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTY5NzIsImV4cCI6MjA4NjQ5Mjk3Mn0.8xmJFvchGtxVsf7YCIxfRIOHHCf85dNOqIkDy_j8STQ';

// 檢查是否已正確設定
const isConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

if (!isConfigured) {
  console.warn('⚠️ Supabase 尚未設定！請建立 .env 檔案並填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
}

export { isConfigured };
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);