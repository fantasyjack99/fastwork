import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PRIORITY_CONFIG } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOverdue(dueDateString: string, status: string): boolean {
  if (status === 'done' || !dueDateString) return false;
  
  const now = new Date();
  const dueDate = new Date(dueDateString);
  
  // Set time to end of day for fair comparison if user didn't specify time
  dueDate.setHours(23, 59, 59, 999);
  
  return now > dueDate;
}

export function isToday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Get the start and end of the week for a given date
export function getWeekRange(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDay(); // 0 is Sunday
  
  // Calculate Monday (if Sunday (0), go back 6 days, else go back day-1)
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${monday.getFullYear()}年 第${getWeekNumber(monday)}週 (${format(monday)} - ${format(sunday)})`;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
}

export function generateGoogleCalendarUrl(title: string, content: string, dueDateString: string): string {
  if (!dueDateString) return '';
  
  const startDate = new Date(dueDateString);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration
  
  const formatGCalDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: content || '',
    dates: `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

// Helper to get numeric weight for priority
export function getPriorityWeight(categoryLabel: string): number {
  if (categoryLabel === PRIORITY_CONFIG.urgent.label) return 3;
  if (categoryLabel === PRIORITY_CONFIG.important.label) return 2;
  if (categoryLabel === PRIORITY_CONFIG.normal.label) return 1;
  return 0;
}

// Helper to check if a task is "Critical" (Overdue or Due Today)
export function isCriticalTask(dueDate: string, status: string): boolean {
  if (status === 'done') return false;
  return isOverdue(dueDate, status) || isToday(dueDate);
}