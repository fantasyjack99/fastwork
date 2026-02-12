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
import { Dashboard } from './Dashboard'; // Import Dashboard
import { Plus, LogOut, Layout, Archive, Filter, ListFilter, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';
import { cn, isOverdue, isToday, getPriorityWeight, isCriticalTask } from '../utils';

// Column Component
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

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className="flex flex-col w-80 shrink-0 h-full max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={cn(
              "w-3 h-3 rounded-full",
              column.id === 'todo' ? "bg-gray-400" : 
              column.id === 'doing' ? "bg-blue-500" : "bg-green-500"
          )} />
          <h2 className="font-bold text-gray-700 text-lg tracking-tight">{column.title}</h2>
          <span className="bg-white border border-gray-200 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
            {tasks.length}
          </span>
        </div>
        {column.id === 'todo' && (
           <button 
             onClick={onAddTask}
             className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md p-1 transition-all active:scale-95"
           >
             <Plus size={20} />
           </button>
        )}
      </div>

      {/* Column Body */}
      <div 
        ref={setNodeRef}
        className={cn(
            "flex-1 rounded-xl p-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent shadow-inner transition-colors",
            "bg-gray-100/60 border border-gray-200/50" // Softer background
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} onArchive={onArchive} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-200/80 rounded-lg text-gray-400 text-sm gap-2">
            <span className="text-3xl opacity-20">+</span>
            <span className="italic opacity-60">暫無任務</span>
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
  { id: 'todo', title: '待辦事項' },
  { id: 'doing', title: '進行中' },
  { id: 'done', title: '已完成' },
];

type FilterTime = 'all' | 'overdue' | 'today';
type FilterPriority = 'all' | 'urgent' | 'important' | 'normal';

export const Board: React.FC<BoardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(`micro_kanban_tasks_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDashboard, setShowDashboard] = useState(true); // Toggle dashboard

  const [filterTime, setFilterTime] = useState<FilterTime>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  React.useEffect(() => {
    localStorage.setItem(`micro_kanban_tasks_${user.id}`, JSON.stringify(tasks));
  }, [tasks, user.id]);

  const handleAddTask = () => { setEditingTask(null); setIsModalOpen(true); };
  const handleEditTask = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };
  
  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === task.id);
      return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
    });
  };

  const handleDeleteTask = (taskId: string) => { setTasks((prev) => prev.filter((t) => t.id !== taskId)); };
  
  const handleArchiveTask = (task: Task) => {
    setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, isArchived: true } : t));
  };

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Task') setActiveTask(event.active.data.current.task);
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

    const updateTaskStatus = (t: Task, newStatus: TaskStatus): Task => {
        const updates: Partial<Task> = { status: newStatus };
        if (newStatus === 'done' && t.status !== 'done') updates.completedAt = new Date().toISOString();
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

  const onDragEnd = () => setActiveTask(null);

  const visibleTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.isArchived);
    if (filterPriority !== 'all') {
      const targetLabel = PRIORITY_CONFIG[filterPriority].label;
      filtered = filtered.filter(t => t.category === targetLabel);
    }
    if (filterTime !== 'all') {
      if (filterTime === 'overdue') filtered = filtered.filter(t => isOverdue(t.dueDate, t.status));
      else if (filterTime === 'today') filtered = filtered.filter(t => isToday(t.dueDate));
    }
    return filtered.sort((a, b) => {
      const aCritical = isCriticalTask(a.dueDate, a.status);
      const bCritical = isCriticalTask(b.dueDate, b.status);
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      const aWeight = getPriorityWeight(a.category);
      const bWeight = getPriorityWeight(b.category);
      if (aWeight !== bWeight) return bWeight - aWeight;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, filterPriority, filterTime]);

  const archivedTasks = useMemo(() => tasks.filter(t => t.isArchived), [tasks]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg text-white shadow-md">
            <Layout size={18} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg leading-tight tracking-tight">Micro Kanban</h1>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-1 justify-center md:justify-end md:mr-6">
            <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200">
                <div className="flex items-center px-2 text-gray-500">
                    <Filter size={14} className="mr-1.5"/>
                    <span className="text-xs font-medium hidden lg:inline">狀態:</span>
                </div>
                <select 
                    value={filterTime} 
                    onChange={(e) => setFilterTime(e.target.value as FilterTime)}
                    className="bg-transparent text-sm border-0 rounded px-1 py-1 focus:ring-0 text-gray-700 cursor-pointer font-medium"
                >
                    <option value="all">全部</option>
                    <option value="overdue">已逾期</option>
                    <option value="today">今天到期</option>
                </select>
            </div>

            <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200">
                 <div className="flex items-center px-2 text-gray-500">
                    <ListFilter size={14} className="mr-1.5"/>
                    <span className="text-xs font-medium hidden lg:inline">等級:</span>
                </div>
                <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                    className="bg-transparent text-sm border-0 rounded px-1 py-1 focus:ring-0 text-gray-700 cursor-pointer font-medium"
                >
                    <option value="all">全部</option>
                    <option value="urgent">緊急</option>
                    <option value="important">重要</option>
                    <option value="normal">一般</option>
                </select>
            </div>
        </div>

        <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-blue-600 rounded-full w-8 h-8 p-0 flex items-center justify-center"
            onClick={() => setIsArchiveModalOpen(true)}
            title="歷史存檔"
          >
             <Archive size={18} />
          </Button>

          <Button 
            variant="ghost" 
            onClick={onLogout} 
            size="sm" 
            className="text-gray-400 hover:text-red-600 rounded-full w-8 h-8 p-0 flex items-center justify-center"
            title="登出"
          >
            <LogOut size={18} />
          </Button>
          
          {/* Dashboard Toggle (Mobile/Desktop) */}
          <button 
             onClick={() => setShowDashboard(!showDashboard)}
             className={cn(
               "ml-1 p-1.5 rounded-md transition-colors border",
               showDashboard ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
             )}
             title={showDashboard ? "隱藏儀表板" : "顯示儀表板"}
          >
            {showDashboard ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Kanban Board Area */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-white/50 relative">
            <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            >
            <div className="h-full flex gap-4 p-4 lg:p-6 min-w-max">
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

        {/* Right Dashboard Panel */}
        <div 
            className={cn(
                "bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden shadow-xl z-10",
                showDashboard ? "w-[320px] translate-x-0 opacity-100" : "w-0 translate-x-[20px] opacity-0"
            )}
        >
            <div className="h-full w-[320px] overflow-y-auto p-5 scrollbar-thin">
                <Dashboard tasks={tasks} userName={user.name} />
            </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden z-30">
        <button
          onClick={handleAddTask}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
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