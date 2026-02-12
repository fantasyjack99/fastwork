import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Task, Column as ColumnType, User, TaskStatus, PRIORITY_CONFIG } from '../types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ArchiveModal } from './ArchiveModal';
import { Plus, LogOut, Layout, Archive, Filter, ListFilter } from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';
import { cn, isOverdue, isToday, getPriorityWeight, isCriticalTask } from '../utils';

// Column Component (Internal to Board to share context easily)
interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: () => void;
  onCardClick: (task: Task) => void;
  onArchive: (task: Task) => void;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, onAddTask, onCardClick, onArchive }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  // SortableContext needs IDs
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="flex flex-col w-80 shrink-0 h-full max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-700 text-lg">{column.title}</h2>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        {column.id === 'todo' && (
           <button 
             onClick={onAddTask}
             className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded p-1 transition-colors"
           >
             <Plus size={20} />
           </button>
        )}
      </div>

      {/* Column Body (Droppable Area) */}
      <div 
        ref={setNodeRef}
        className="flex-1 bg-gray-100/50 rounded-xl p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent border border-gray-200/60 shadow-inner"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} onArchive={onArchive} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm italic">
            拖曳至此處
          </div>
        )}
      </div>
    </div>
  );
};

interface BoardProps {
  user: User;
  onLogout: () => void;
}

const DEFAULT_COLUMNS: ColumnType[] = [
  { id: 'todo', title: '待辦事項 (To-do)' },
  { id: 'doing', title: '進行中 (Doing)' },
  { id: 'done', title: '已完成 (Done)' },
];

type FilterTime = 'all' | 'overdue' | 'today';
type FilterPriority = 'all' | 'urgent' | 'important' | 'normal';

export const Board: React.FC<BoardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(`micro_kanban_tasks_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTask, setActiveTask] = useState<Task | null>(null); // For Drag Overlay
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false); // Archive Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter States
  const [filterTime, setFilterTime] = useState<FilterTime>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');

  // Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevent accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save to local storage whenever tasks change
  React.useEffect(() => {
    localStorage.setItem(`micro_kanban_tasks_${user.id}`, JSON.stringify(tasks));
  }, [tasks, user.id]);

  // Handlers
  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      if (exists) {
        return prev.map((t) => (t.id === task.id ? task : t));
      }
      return [...prev, task];
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleArchiveTask = (task: Task) => {
    setTasks((prev) => 
      prev.map(t => t.id === task.id ? { ...t, isArchived: true } : t)
    );
  };

  // Drag and Drop Logic
  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task);
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    if (!isActiveTask) return;

    // Helper to update status
    const updateTaskStatus = (t: Task, newStatus: TaskStatus): Task => {
        const updates: Partial<Task> = { status: newStatus };
        if (newStatus === 'done' && t.status !== 'done') {
            updates.completedAt = new Date().toISOString();
        }
        return { ...t, ...updates };
    };

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        const newTasks = [...tasks];
        const newStatus = newTasks[overIndex].status;
        
        if (newTasks[activeIndex].status !== newStatus) {
           newTasks[activeIndex] = updateTaskStatus(newTasks[activeIndex], newStatus);
        }

        return arrayMove(newTasks, activeIndex, overIndex);
      });
    }

    const isOverColumn = DEFAULT_COLUMNS.some(col => col.id === overId);
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        if (tasks[activeIndex].status !== overId) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = updateTaskStatus(newTasks[activeIndex], overId as TaskStatus);
          return newTasks;
        }
        return tasks;
      });
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
  };

  // Filter and Sort Logic
  const visibleTasks = useMemo(() => {
    // 1. Initial Filter (Not Archived)
    let filtered = tasks.filter(t => !t.isArchived);

    // 2. Apply Priority Filter
    if (filterPriority !== 'all') {
      const targetLabel = PRIORITY_CONFIG[filterPriority].label;
      filtered = filtered.filter(t => t.category === targetLabel);
    }

    // 3. Apply Time Filter
    if (filterTime !== 'all') {
      if (filterTime === 'overdue') {
        filtered = filtered.filter(t => isOverdue(t.dueDate, t.status));
      } else if (filterTime === 'today') {
        filtered = filtered.filter(t => isToday(t.dueDate));
      }
    }

    // 4. Apply Sorting Logic
    // Rule: Critical (Overdue/Today) > Priority (Urgent>Important>Normal) > DueDate
    return filtered.sort((a, b) => {
      const aCritical = isCriticalTask(a.dueDate, a.status);
      const bCritical = isCriticalTask(b.dueDate, b.status);

      // Status Check: Done items should arguably be at the bottom, but assuming sorting applies mostly to active columns
      // If one is critical and other is not, critical wins
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;

      // If both are critical OR both are not critical, compare Priority
      const aWeight = getPriorityWeight(a.category);
      const bWeight = getPriorityWeight(b.category);

      if (aWeight !== bWeight) {
        return bWeight - aWeight; // Higher weight first (3 > 2 > 1)
      }

      // If Priority is same, compare Due Date (Earliest first)
      // Empty due date goes last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  }, [tasks, filterPriority, filterTime]);

  const archivedTasks = useMemo(() => tasks.filter(t => t.isArchived), [tasks]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">快速工作記事</h1>
            <p className="text-xs text-gray-500">Quick Work Notes</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-1 justify-center md:justify-end md:mr-4">
            <div className="flex items-center bg-gray-100 rounded-md p-1 gap-2">
                <div className="flex items-center px-2 text-gray-500">
                    <Filter size={14} className="mr-1.5"/>
                    <span className="text-xs font-medium">狀態:</span>
                </div>
                <select 
                    value={filterTime} 
                    onChange={(e) => setFilterTime(e.target.value as FilterTime)}
                    className="bg-white text-sm border-0 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 text-gray-700 cursor-pointer"
                >
                    <option value="all">全部</option>
                    <option value="overdue">已逾期</option>
                    <option value="today">今天到期</option>
                </select>
            </div>

            <div className="flex items-center bg-gray-100 rounded-md p-1 gap-2">
                 <div className="flex items-center px-2 text-gray-500">
                    <ListFilter size={14} className="mr-1.5"/>
                    <span className="text-xs font-medium">等級:</span>
                </div>
                <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                    className="bg-white text-sm border-0 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 text-gray-700 cursor-pointer"
                >
                    <option value="all">全部</option>
                    <option value="urgent">緊急</option>
                    <option value="important">重要</option>
                    <option value="normal">一般</option>
                </select>
            </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 border-l pl-4 border-gray-200">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-blue-600"
            onClick={() => setIsArchiveModalOpen(true)}
          >
             <Archive size={18} className="mr-1.5" />
             <span className="hidden sm:inline">完成工作記錄</span>
          </Button>

          <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>
          
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <Button variant="ghost" onClick={onLogout} size="sm" className="text-gray-500 hover:text-red-600">
            <LogOut size={18} className="mr-1" />
            <span className="hidden sm:inline">登出</span>
          </Button>
        </div>
      </header>

      {/* Kanban Board Area */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="h-full flex gap-6 p-6 min-w-max">
             {DEFAULT_COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={visibleTasks.filter((t) => t.status === col.id)}
                  onAddTask={handleAddTask}
                  onCardClick={handleEditTask}
                  onArchive={handleArchiveTask}
                />
             ))}
          </div>

          {createPortal(
            <DragOverlay>
              {activeTask && (
                <div className="opacity-90 rotate-2 scale-105 cursor-grabbing w-[300px]">
                   <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <button
          onClick={handleAddTask}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        userId={user.id}
      />

      <ArchiveModal 
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        tasks={archivedTasks}
      />
    </div>
  );
};