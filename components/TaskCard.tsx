import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, AlertCircle, Archive, Calendar } from 'lucide-react';
import { Task } from '../types';
import { cn, isOverdue, formatDate } from '../utils';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onArchive?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onArchive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.dueDate, task.status);

  // Format creation date for display
  const createdDate = task.createdAt 
    ? new Date(task.createdAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
    : '';

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-32 mb-3"
      />
    );
  }

  // Handler to stop propagation of all events that might trigger drag
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={cn(
        "group relative bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing mb-3 hover:shadow-md transition-all flex flex-col gap-2",
        overdue && "border-l-4 border-l-red-500 border-red-200 bg-red-50/30"
      )}
    >
      {/* Color Category Strip */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg" 
        style={{ backgroundColor: task.color || '#e5e7eb' }} 
      />

      <div className="mt-2">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 truncate max-w-[120px]">
            {task.category || '未分類'}
          </span>
          {overdue && (
            <div className="flex items-center text-red-600 text-xs font-bold animate-pulse">
              <AlertCircle size={12} className="mr-1" />
              逾期
            </div>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight">
          {task.title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-2 line-clamp-2 min-h-[1.25rem]">
          {task.content}
        </p>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2 mt-auto">
          <div className="flex flex-col gap-1">
             {/* Creation Date */}
             {createdDate && (
              <div className="flex items-center text-gray-400" title="建立時間">
                <Calendar size={10} className="mr-1.5" />
                <span>建於 {createdDate}</span>
              </div>
            )}
            
            {/* Due Date */}
            {task.dueDate && (
              <div className={cn("flex items-center", overdue ? "text-red-500 font-medium" : "")} title="預計完成時間">
                <Clock size={10} className="mr-1.5" />
                <span>{formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Archive Button for Done Tasks */}
        {task.status === 'done' && onArchive && (
          <button
            type="button"
            onPointerDown={stopPropagation}
            onMouseDown={stopPropagation}
            onTouchStart={stopPropagation}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onArchive(task);
            }}
            className="absolute bottom-2 right-2 z-20 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 bg-white shadow-sm border border-gray-200 rounded-full transition-all cursor-pointer"
            title="移至完成記錄"
          >
            <Archive size={16} />
          </button>
        )}
      </div>
    </div>
  );
};