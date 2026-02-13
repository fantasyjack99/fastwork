import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------
// [重要] 請將下方的字串替換成你自己的 Supabase 專案資訊
// --------------------------------------------------------

// 1. 請將 'https://your-project-url.supabase.co' 換成你的 Project URL
const SUPABASE_URL: string = 'https://mcnxtcomzzcuwriwlbky.supabase.co';

// 2. 請將 'your-anon-key' 換成你的 Anon Public Key (通常是以 eyJ 開頭的很長字串)
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbnh0Y29tenpjdXdyaXdsYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTY5NzIsImV4cCI6MjA4NjQ5Mjk3Mn0.8xmJFvchGtxVsf7YCIxfRIOHHCf85dNOqIkDy_j8STQ';

// --------------------------------------------------------

// 檢查是否已正確設定 (請不要修改這裡的程式碼)
const isUrlConfigured = SUPABASE_URL !== 'https://your-project-url.supabase.co';
const isKeyConfigured = SUPABASE_ANON_KEY !== 'your-anon-key';

export const isConfigured = isUrlConfigured && isKeyConfigured;

if (!isConfigured) {
  console.warn('⚠️ Supabase 尚未設定！請在 supabaseClient.ts 最上方填入正確的 URL 和 Key。');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);