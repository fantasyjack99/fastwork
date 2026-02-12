import React, { useMemo } from 'react';
import { X, Calendar, ArrowLeft, ChevronDown } from 'lucide-react';
import { Task } from '../types';
import { cn, getWeekRange } from '../utils';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  if (!isOpen) return null;

  // Group tasks by week
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    
    // Sort tasks by completion date desc first
    const sorted = [...tasks].sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt).getTime();
      const dateB = new Date(b.completedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    sorted.forEach(task => {
      const dateKey = task.completedAt || task.createdAt;
      const weekRange = getWeekRange(dateKey);
      if (!groups[weekRange]) {
        groups[weekRange] = [];
      }
      groups[weekRange].push(task);
    });

    return groups;
  }, [tasks]);

  const groupKeys = Object.keys(groupedTasks);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      {/* Responsive container: Full screen on mobile, limited on desktop */}
      <div className="bg-white w-full h-full md:h-[80vh] md:max-w-3xl md:rounded-xl shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b shrink-0 bg-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-gray-100 rounded-lg text-gray-600 hidden md:block">
               <Calendar size={20} />
             </div>
             <div>
               <h2 className="text-lg md:text-xl font-bold text-gray-900">完成工作記錄</h2>
               <p className="text-xs md:text-sm text-gray-500">已完成的任務歷史 ({tasks.length})</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar size={32} />
               </div>
               <p>目前沒有完成的任務記錄</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupKeys.map((weekLabel) => (
                <div key={weekLabel} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">週報表</span>
                    <h3 className="text-sm font-semibold text-gray-600">{weekLabel}</h3>
                    <span className="text-xs text-gray-400 ml-auto">本週完成 {groupedTasks[weekLabel].length} 項</span>
                  </div>
                  
                  <div className="space-y-3">
                    {groupedTasks[weekLabel].map((task) => (
                      <div 
                        key={task.id} 
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4"
                      >
                        <div className="w-1.5 h-1.5 sm:w-1.5 sm:h-auto self-start sm:self-stretch rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {task.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              完成於 {task.completedAt ? new Date(task.completedAt).toLocaleString('zh-TW', { weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未知時間'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{task.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end md:rounded-b-xl shrink-0 pb-safe">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors w-full md:w-auto"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};