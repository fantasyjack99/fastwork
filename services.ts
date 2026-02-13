import { Task, User } from './types';
import { generateId } from './utils';

// Keys for LocalStorage (Simulating Database Tables)
const DB_KEYS = {
  SESSION: 'micro_kanban_session',
  USERS: 'micro_kanban_users_db',
  TASKS: (userId: string) => `micro_kanban_tasks_${userId}`,
};

// Simulate network latency (300ms - 800ms)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  auth: {
    // Check if user is already logged in
    getSession: async (): Promise<User | null> => {
      await delay(500); // Simulate check
      const sessionStr = localStorage.getItem(DB_KEYS.SESSION);
      if (!sessionStr) return null;
      try {
        return JSON.parse(sessionStr);
      } catch {
        return null;
      }
    },

    // Login (Mock)
    login: async (email: string, password: string): Promise<User> => {
      await delay(800);
      
      // In a real app, verify password hash here.
      // For now, we simulate a successful login or create a mock user.
      const user: User = {
        id: email.replace(/[^a-zA-Z0-9]/g, ''),
        email,
        name: email.split('@')[0],
      };

      // Save Session
      localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
      return user;
    },

    // Register (Mock)
    register: async (name: string, email: string, password: string): Promise<User> => {
      await delay(800);
      const user: User = {
        id: email.replace(/[^a-zA-Z0-9]/g, ''),
        email,
        name,
      };
      localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
      return user;
    },

    // Logout
    logout: async () => {
      await delay(300);
      localStorage.removeItem(DB_KEYS.SESSION);
    },
  },

  tasks: {
    // Get all tasks for a user
    list: async (userId: string): Promise<Task[]> => {
      await delay(600); // Simulate network load
      const json = localStorage.getItem(DB_KEYS.TASKS(userId));
      return json ? JSON.parse(json) : [];
    },

    // Create or Update a task
    save: async (userId: string, task: Task): Promise<Task> => {
      await delay(400); // Simulate save delay
      
      const key = DB_KEYS.TASKS(userId);
      const currentTasksStr = localStorage.getItem(key);
      let tasks: Task[] = currentTasksStr ? JSON.parse(currentTasksStr) : [];

      const existingIndex = tasks.findIndex(t => t.id === task.id);
      
      if (existingIndex >= 0) {
        // Update
        tasks[existingIndex] = task;
      } else {
        // Create
        tasks.push(task);
      }

      localStorage.setItem(key, JSON.stringify(tasks));
      return task;
    },

    // Delete a task
    delete: async (userId: string, taskId: string): Promise<void> => {
      await delay(300);
      const key = DB_KEYS.TASKS(userId);
      const currentTasksStr = localStorage.getItem(key);
      if (!currentTasksStr) return;

      const tasks: Task[] = JSON.parse(currentTasksStr);
      const newTasks = tasks.filter(t => t.id !== taskId);
      localStorage.setItem(key, JSON.stringify(newTasks));
    },

    // Batch update (for drag and drop reordering)
    batchUpdate: async (userId: string, tasks: Task[]): Promise<Task[]> => {
        // Note: Drag and drop needs to be snappy, so we might want lower simulated latency here
        // or handle it optimistically in the UI (which we do).
        // This persists the final order.
        const key = DB_KEYS.TASKS(userId);
        localStorage.setItem(key, JSON.stringify(tasks));
        return tasks;
    }
  },
};