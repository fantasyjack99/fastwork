import { createClient } from '@supabase/supabase-js';

// TODO: 請替換成你從 Supabase Dashboard 獲取的 URL 和 Anon Key
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// 檢查是否已設定 (避免在未設定時報錯，但在實際使用時必須設定)
const isConfigured = SUPABASE_URL !== 'https://your-project-url.supabase.co';

if (!isConfigured) {
  console.warn('⚠️ Supabase 尚未設定！請在 supabaseClient.ts 中填入你的 URL 和 Key。目前將無法連接資料庫。');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);