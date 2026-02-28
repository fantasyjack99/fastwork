export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  status: TaskStatus;
  dueDate: string; // ISO string
  userId: string;
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  isArchived?: boolean;
}

export interface Column {
  id: TaskStatus;
  title: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export const PRIORITY_CONFIG = {
  normal: { label: '一般', color: '#22c55e', value: 'normal' },   // Green
  important: { label: '重要', color: '#eab308', value: 'important' }, // Yellow
  urgent: { label: '緊急', color: '#ef4444', value: 'urgent' },    // Red
} as const;

export type PriorityKey = keyof typeof PRIORITY_CONFIG;
