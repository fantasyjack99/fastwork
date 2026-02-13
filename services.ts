import { createClient } from '@supabase/supabase-js'
import type { Task, User } from './types'

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'example-key'
)

// Auth helpers
export const auth = {
  // Get current user
  getUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return profile ? {
      id: profile.id,
      email: profile.email,
      name: profile.name,
    } : null
  },

  // Login with email/password
  login: async (email: string, password: string): Promise<User> => {
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw new Error(error.message)
    
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    
    return {
      id: profile?.id || user!.id,
      email: profile?.email || email,
      name: profile?.name || email.split('@')[0],
    }
  },

  // Register with email/password
  register: async (name: string, email: string, password: string): Promise<User> => {
    const { data: { user, session }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    
    if (error) throw new Error(error.message)
    
    // Profile should be auto-created by trigger, but ensure it
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email,
          name,
        })
        .select()
        .single()
      
      if (profileError) console.warn('Profile creation warning:', profileError)
    }
    
    return {
      id: user?.id || email,
      email,
      name,
    }
  },

  // Logout
  logout: async () => {
    await supabase.auth.signOut()
  },
}

// Tasks API
export const tasks = {
  // Get all tasks for current user
  list: async (userId: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    
    return (data || []).map(task => ({
      id: task.id,
      title: task.title,
      content: task.content || '',
      category: task.category,
      color: task.color,
      status: task.status,
      dueDate: task.due_date,
      userId: task.user_id,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      isArchived: task.is_archived,
    }))
  },

  // Save task (create or update)
  save: async (userId: string, task: Task): Promise<Task> => {
    const taskData = {
      id: task.id,
      user_id: userId,
      title: task.title,
      content: task.content || null,
      category: task.category,
      color: task.color,
      status: task.status,
      due_date: task.dueDate || null,
      completed_at: task.completedAt || null,
      is_archived: task.isArchived || false,
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(taskData)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    
    return {
      id: data.id,
      title: data.title,
      content: data.content || '',
      category: data.category,
      color: data.color,
      status: data.status,
      dueDate: data.due_date,
      userId: data.user_id,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      isArchived: data.is_archived,
    }
  },

  // Delete task
  delete: async (userId: string, taskId: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)
    
    if (error) throw new Error(error.message)
  },

  // Archive task
  archive: async (userId: string, taskId: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_archived: true })
      .eq('id', taskId)
      .eq('user_id', userId)
    
    if (error) throw new Error(error.message)
  },

  // Get archived tasks
  listArchived: async (userId: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', true)
      .order('completed_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    
    return (data || []).map(task => ({
      id: task.id,
      title: task.title,
      content: task.content || '',
      category: task.category,
      color: task.color,
      status: task.status,
      dueDate: task.due_date,
      userId: task.user_id,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      isArchived: task.is_archived,
    }))
  },
}
