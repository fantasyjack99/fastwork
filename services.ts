import { Task, User } from './types';
import { supabase } from './supabaseClient';

// ------------------------------------------------------------------
// 資料庫欄位名稱轉換 (Mapping Layer)
// 解決 Frontend (camelCase) 與 Database (snake_case) 命名不一致的問題
// ------------------------------------------------------------------

// 將資料庫格式 (snake_case) 轉為 應用程式格式 (camelCase)
const mapFromDb = (item: any): Task => ({
  id: item.id,
  title: item.title,
  content: item.content,
  category: item.category,
  color: item.color,
  status: item.status,
  // 優先使用 snake_case，若無則嘗試 camelCase (相容性)
  // 若資料庫為 null，轉回空字串以符合 TypeScript 定義
  dueDate: item.due_date || item.dueDate || '',
  userId: item.user_id || item.userId,
  createdAt: item.created_at || item.createdAt || '',
  completedAt: item.completed_at || item.completedAt || undefined, // undefined for optional
  isArchived: item.is_archived ?? item.isArchived ?? false,
});

// Types
export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  author_name: string;
  content: string;
  avatar_url: string | null;
  created_at: string;
}

// 將 應用程式格式 (camelCase) 轉為 資料庫格式 (snake_case)
const mapToDb = (task: Task) => ({
  id: task.id,
  title: task.title,
  content: task.content,
  category: task.category,
  color: task.color,
  status: task.status,
  // [Fix] 日期欄位若是空字串，必須轉為 null，否則 Postgres Timestamp 格式會報錯 (invalid input syntax)
  due_date: task.dueDate || null,
  user_id: task.userId,
  created_at: task.createdAt || null,
  completed_at: task.completedAt || null,
  is_archived: task.isArchived
});

// ------------------------------------------------------------------

export const api = {
  auth: {
    // Check if user is already logged in via Supabase Session
    getSession: async (): Promise<User | null> => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!session?.user) return null;

        return {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        };
      } catch (err) {
        console.warn("Session check failed", err);
        return null;
      }
    },

    // Login with Supabase
    login: async (email: string, password: string): Promise<User> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('Login failed');

        return {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || email.split('@')[0],
        };
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
           throw new Error('無法連接伺服器 (Failed to fetch)。請檢查 supabaseClient.ts 中的網址是否正確填入。');
        }
        throw err;
      }
    },

    // Login with Google (OAuth)
    loginWithGoogle: async (): Promise<void> => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin, 
          }
        });
        if (error) throw error;
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
            throw new Error('無法連接伺服器。請檢查 supabaseClient.ts 設定。');
         }
         throw err;
      }
    },

    // Register with Supabase
    register: async (name: string, email: string, password: string): Promise<User | null> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        });

        if (error) throw error;
        
        if (data.user && !data.session) {
          return null; 
        }

        if (!data.user) throw new Error('Registration failed');

        return {
          id: data.user.id,
          email: data.user.email || '',
          name: name,
        };
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
            throw new Error('無法連接伺服器。請檢查 supabaseClient.ts 設定。');
         }
         throw err;
      }
    },

    // Logout
    logout: async () => {
      await supabase.auth.signOut();
    },
  },

  tasks: {
    // Get all tasks for a user
    list: async (userId: string): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }

      // 將回傳的資料轉換回 App 格式
      return (data || []).map(mapFromDb);
    },

    // Get archived tasks
    listArchived: async (userId: string): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', true)
        .order('completed_at', { ascending: false });
    
      if (error) {
        console.error('Error fetching archived tasks:', error);
        return [];
      }
      
      return (data || []).map(mapFromDb);
    },

    // Create or Update a task (Upsert)
    save: async (userId: string, task: Task): Promise<Task> => {
      // 轉換成資料庫格式，並確保 user_id 正確
      const dbTask = mapToDb({ ...task, userId });

      const { data, error } = await supabase
        .from('tasks')
        .upsert(dbTask)
        .select()
        .single();

      if (error) throw error;
      // 將回傳的新資料轉換回 App 格式
      return mapFromDb(data);
    },

    // Delete a task
    delete: async (userId: string, taskId: string): Promise<void> => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId); // 使用 snake_case (user_id) 確保安全性

      if (error) throw error;
    },

    // Batch update
    batchUpdate: async (userId: string, tasks: Task[]): Promise<Task[]> => {
      if (tasks.length === 0) return [];
      
      // 批量轉換
      const dbTasks = tasks.map(t => mapToDb({ ...t, userId }));

      const { data, error } = await supabase
        .from('tasks')
        .upsert(dbTasks)
        .select();

      if (error) throw error;
      return (data || []).map(mapFromDb);
    }
  },

  // Comments API
  comments: {
    // Get comments for a task
    list: async (taskId: string): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Supabase comments error:', error)
        return []
      }
      
      return (data || []).map(comment => ({
        id: comment.id,
        task_id: taskId,
        user_id: comment.user_id,
        author_name: comment.profiles?.name || 'Unknown',
        avatar_url: comment.profiles?.avatar_url || null,
        content: comment.content,
        created_at: comment.created_at,
      }))
    },

    // Add a comment
    add: async (taskId: string, userId: string, authorName: string, content: string): Promise<Comment | null> => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          author_name: authorName,
          content,
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          author_name,
          profiles:user_id (avatar_url)
        `)
        .single()
      
      if (error) {
        console.error('Supabase add comment error:', error)
        return null
      }
      
      return {
        id: data.id,
        task_id: taskId,
        user_id: data.user_id,
        author_name: data.author_name || 'Unknown',
        avatar_url: data.profiles?.avatar_url || null,
        content: data.content,
        created_at: data.created_at,
      }
    },
  },
};

// Export supabase for realtime subscriptions
export { supabase };
