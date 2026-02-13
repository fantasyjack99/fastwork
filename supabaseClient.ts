import { createClient } from '@supabase/supabase-js';

// TODO: 請到 Supabase Dashboard -> Settings -> API
// 1. 複製 "Project URL" 貼到下方第一個引號中
// 2. 複製 "anon public" Key 貼到下方第二个引號中
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// 檢查是否已設定 (用來控制 App 顯示設定畫面)
export const isConfigured = SUPABASE_URL !== 'https://your-project-url.supabase.co' && SUPABASE_ANON_KEY !== 'your-anon-key';

if (!isConfigured) {
  console.warn('⚠️ Supabase 尚未設定！請在 supabaseClient.ts 中填入你的 URL 和 Key。');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);