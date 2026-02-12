import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Calendar, ExternalLink, Clock } from 'lucide-react';
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

// Time Constants
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'];

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
  
  // Date/Time Split State
  const [dueDate, setDueDate] = useState(''); // The final ISO string
  const [datePart, setDatePart] = useState('');
  const [hourPart, setHourPart] = useState('09');
  const [minutePart, setMinutePart] = useState('00');

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Initialize State when modal opens or task changes
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setContent(initialTask.content);
      
      const foundKey = (Object.keys(PRIORITY_CONFIG) as PriorityKey[]).find(
        key => PRIORITY_CONFIG[key].label === initialTask.category
      );
      setPriorityKey(foundKey || 'normal');
      
      if (initialTask.dueDate) {
        const d = new Date(initialTask.dueDate);
        // Format YYYY-MM-DD for date input
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        setDatePart(`${y}-${m}-${day}`);

        // Set Hours
        setHourPart(d.getHours().toString().padStart(2, '0'));

        // Set Minutes (Round down to nearest 10 for safety, though UI enforces it)
        const min = d.getMinutes();
        const roundedMin = Math.floor(min / 10) * 10;
        setMinutePart(roundedMin.toString().padStart(2, '0'));
        
        setDueDate(initialTask.dueDate);
      } else {
        setDatePart('');
        setHourPart('09');
        setMinutePart('00');
        setDueDate('');
      }
    } else {
      setTitle('');
      setContent('');
      setPriorityKey('normal');
      setDatePart('');
      setHourPart('09');
      setMinutePart('00');
      setDueDate('');
    }
  }, [initialTask, isOpen]);

  // Sync date/time parts to final dueDate string
  useEffect(() => {
    if (!datePart) {
      setDueDate('');
      return;
    }
    // Create date object from parts (interpreted as local time)
    const d = new Date(`${datePart}T${hourPart}:${minutePart}:00`);
    setDueDate(d.toISOString());
  }, [datePart, hourPart, minutePart]);

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
      dueDate: dueDate, 
      userId,
      createdAt: initialTask?.createdAt || now,
      completedAt: initialTask?.completedAt,
      isArchived: initialTask?.isArchived || false,
    };

    onSave(task);
    onClose();
  };

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                預計完成時間 (選填)
              </label>
              <div className="space-y-2">
                {/* Simplified Date Picker - Click anywhere to trigger */}
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    className="w-full rounded-md border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                    value={datePart}
                    onChange={(e) => setDatePart(e.target.value)}
                    onClick={() => {
                        try {
                            if ('showPicker' in HTMLInputElement.prototype) {
                                dateInputRef.current?.showPicker();
                            }
                        } catch (e) {
                            console.log('showPicker not supported');
                        }
                    }}
                  />
                  <Calendar 
                    size={18} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                  />
                </div>

                {/* Time Pickers (Visible only if date is selected) */}
                {datePart && (
                  <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative flex-1">
                      <select
                        value={hourPart}
                        onChange={(e) => setHourPart(e.target.value)}
                        className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer text-center font-mono"
                      >
                        {HOURS.map(h => (
                          <option key={h} value={h}>{h} 時</option>
                        ))}
                      </select>
                      <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    
                    <span className="text-gray-400 font-bold">:</span>

                    <div className="relative flex-1">
                      <select
                        value={minutePart}
                        onChange={(e) => setMinutePart(e.target.value)}
                        className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer text-center font-mono"
                      >
                        {MINUTES.map(m => (
                          <option key={m} value={m}>{m} 分</option>
                        ))}
                      </select>
                      <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
              
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