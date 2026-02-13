-- Fastwork Database Schema for Supabase
-- 執行方式：Supabase → SQL Editor → 貼上並執行

-- ============================================
-- 1. 建立資料表
-- ============================================

-- Profiles 表（關聯 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks 表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Markdown 說明
  category TEXT NOT NULL DEFAULT '一般', -- 一般/重要/緊急
  color TEXT NOT NULL DEFAULT '#22c55e',
  status TEXT NOT NULL DEFAULT 'todo', -- todo/doing/done
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT FALSE
);

-- Task Comments 表
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. 建立 Index（提升查詢效能）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- ============================================
-- 3. 啟用 Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies（安全政策）
-- ============================================

-- Profiles：用户只能看到和編輯自己的資料
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks：用戶只能看到和編輯自己的卡片
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (user_id = auth.uid());

-- Task Comments：用戶只能看到和編輯自己創建的留言
CREATE POLICY "Users can view own comments" ON task_comments
  FOR SELECT USING (
    user_id = auth.uid() OR 
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own comments" ON task_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 5. 自動建立 Profile（當用戶註冊時）
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. 開啟 Realtime（可選）
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;

-- 完成！
-- ============================================
