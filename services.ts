import { Task, User } from './types';
import { supabase } from './supabaseClient';

export const api = {
  auth: {
    // Check if user is already logged in via Supabase Session
    getSession: async (): Promise<User | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return null;

      return {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
      };
    },

    // Login with Supabase
    login: async (email: string, password: string): Promise<User> => {
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
    },

    // Register with Supabase
    register: async (name: string, email: string, password: string): Promise<User> => {
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
      
      // Note: By default Supabase requires email confirmation. 
      // If you disabled "Confirm email" in Supabase Auth settings, this works immediately.
      // Otherwise, the user won't be logged in until they click the link.
      if (!data.user) throw new Error('Registration failed');

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: name,
      };
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
        .eq('userId', userId); // Ensure we only get this user's tasks (RLS covers this too)

      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }

      return data as Task[];
    },

    // Create or Update a task (Upsert)
    save: async (userId: string, task: Task): Promise<Task> => {
      // Ensure the task object has the correct userId attached
      const taskToSave = { ...task, userId };

      const { data, error } = await supabase
        .from('tasks')
        .upsert(taskToSave)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },

    // Delete a task
    delete: async (userId: string, taskId: string): Promise<void> => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('userId', userId); // Extra safety check

      if (error) throw error;
    },

    // Batch update (for drag and drop reordering / status changes)
    batchUpdate: async (userId: string, tasks: Task[]): Promise<Task[]> => {
      if (tasks.length === 0) return [];
      
      // Upsert all tasks in the array
      // Note: This helps persist status changes and potential reordering data if we added an order column later.
      const { data, error } = await supabase
        .from('tasks')
        .upsert(tasks)
        .select();

      if (error) throw error;
      return data as Task[];
    }
  },
};