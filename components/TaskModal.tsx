import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, ExternalLink } from 'lucide-react';
import { Task, PRIORITY_CONFIG, PriorityKey, TaskStatus } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { generateId, cn, generateGoogleCalendarUrl } from '../utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task | null;
  userId: string;
  defaultStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  userId,
  defaultStatus = 'todo',
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priorityKey, setPriorityKey] = useState<PriorityKey>('normal');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setContent(initialTask.content);
      
      // Try to match existing category to a priority key, default to normal if not found
      const foundKey = (Object.keys(PRIORITY_CONFIG) as PriorityKey[]).find(
        key => PRIORITY_CONFIG[key].label === initialTask.category
      );
      setPriorityKey(foundKey || 'normal');
      
      setDueDate(initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().slice(0, 16) : '');
    } else {
      setTitle('');
      setContent('');
      setPriorityKey('normal');
      setDueDate('');
    }
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const priorityConfig = PRIORITY_CONFIG[priorityKey];
    const now = new Date().toISOString();

    const task: Task = {
      id: initialTask?.id || generateId(),
      title,
      content,
      category: priorityConfig.label,
      color: priorityConfig.color,
      status: initialTask?.status || defaultStatus,
      dueDate: dueDate, // Empty string is valid for optional date
      userId,
      createdAt: initialTask?.createdAt || now, // Preserve existing createdAt or set new
      completedAt: initialTask?.completedAt,
      isArchived: initialTask?.isArchived || false,
    };

    onSave(task);
    onClose();
  };

  // Generate Google Calendar Link if date is set
  const calendarUrl = dueDate ? generateGoogleCalendarUrl(title, content, dueDate) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialTask ? '編輯任務' : '新增任務'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="輸入任務標題..."
            required
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              內容描述
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="詳細說明..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                優先級與分類
              </label>
              <select
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priorityKey}
                onChange={(e) => setPriorityKey(e.target.value as PriorityKey)}
              >
                <option value="normal">一般 (綠色)</option>
                <option value="important">重要 (黃色)</option>
                <option value="urgent">緊急 (紅色)</option>
              </select>
            </div>
            
            <div>
              <Input
                label="預計完成時間 (選填)"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                step="600"
                className="[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:bg-blue-100 [&::-webkit-calendar-picker-indicator]:hover:bg-blue-200 [&::-webkit-calendar-picker-indicator]:p-1.5 [&::-webkit-calendar-picker-indicator]:rounded-md [&::-webkit-calendar-picker-indicator]:transition-colors"
                onClick={(e) => {
                  // Explicitly try to open the picker on click for better UX
                  try {
                    const input = e.currentTarget as HTMLInputElement;
                    if (typeof input.showPicker === 'function') {
                      input.showPicker();
                    }
                  } catch (err) {
                    // Ignore errors if showPicker is not supported or fails
                  }
                }}
              />
              
              {dueDate && (
                 <div className="mt-2 flex justify-end">
                   <a
                     href={calendarUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-100"
                     title="新增至 Google 日曆"
                   >
                     <Calendar size={14} />
                     加入 Google 日曆
                     <ExternalLink size={10} />
                   </a>
                 </div>
              )}
            </div>
          </div>

          {/* Color preview bar */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-500">標籤顏色預覽：</span>
            <div 
              className="h-4 w-full rounded-full transition-colors duration-300"
              style={{ backgroundColor: PRIORITY_CONFIG[priorityKey].color }}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-6">
            <div>
              {initialTask && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                  onClick={() => {
                    if (window.confirm('確定要刪除此任務嗎？')) {
                      onDelete(initialTask.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={18} className="mr-2" />
                  刪除
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">
                {initialTask ? '儲存變更' : '建立任務'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};