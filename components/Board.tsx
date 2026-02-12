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
import { Dashboard } from './Dashboard';
import { 
  Plus, LogOut, Layout, Archive, Filter, ListFilter, 
  PanelRightClose, PanelRightOpen, ListTodo, Loader, CheckCircle2, History 
} from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';
import { cn, isOverdue, isToday, getPriorityWeight, isCriticalTask, getWeekRange } from '../utils';

// Column Component (Modified for unified usage)
interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: () => void;
  onCardClick: (task: Task) => void;
  onArchive: (task: Task) => void;
  isMobile?: boolean;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, onAddTask, onCardClick, onArchive, isMobile }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div className={cn(
      "flex flex-col h-full max-h-full",
      // Desktop: Fixed width, Mobile: Full width
      !isMobile ? "w-80 shrink-0" : "w-full"
    )}>
      {/* Column Header - Hide on mobile as the Tab bar indicates context, or keep minimal */}
      {!isMobile && (
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
      )}

      {/* Column Body */}
      <div 
        ref={setNodeRef}
        className={cn(
            "flex-1 rounded-xl p-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent shadow-inner transition-colors",
            "bg-gray-100/60 border border-gray-200/50",
            // Mobile specific padding for bottom nav and header
            isMobile && "pb-24 pt-4 bg-transparent border-none shadow-none px-4"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} onArchive={onArchive} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-200/80 rounded-lg text-gray-400 text-sm gap-2 mt-4 bg-gray-50/50">
            <span className="text-3xl opacity-20">+</span>
            <span className="italic opacity-60">暫無任務</span>
            {isMobile && column.id === 'todo' && (
                <Button variant="ghost" size="sm" onClick={onAddTask} className="mt-2 text-blue-600 bg-blue-50">
                    立即新增
                </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Archive View Component
const MobileArchiveView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        const sorted = [...tasks].sort((a, b) => {
            const dateA = new Date(a.completedAt || a.createdAt).getTime();
            const dateB = new Date(b.completedAt || b.createdAt).getTime();
            return dateB - dateA;
        });
        sorted.forEach(task => {
            const dateKey = task.completedAt || task.createdAt;
            const weekRange = getWeekRange(dateKey);
            if (!groups[weekRange]) groups[weekRange] = [];
            groups[weekRange].push(task);
        });
        return groups;
    }, [tasks]);

    const groupKeys = Object.keys(groupedTasks);

    return (
        <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50 h-full">
             {tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 mt-20">
                   <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Archive size={32} />
                   </div>
                   <p>目前沒有歸檔紀錄</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupKeys.map((weekLabel) => (
                    <div key={weekLabel} className="space-y-3">
                      <div className="flex items-center gap-2 px-1 sticky top-0 bg-gray-50 py-2 z-10">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">週報表</span>
                        <h3 className="text-sm font-semibold text-gray-600">{weekLabel}</h3>
                      </div>
                      <div className="space-y-3">
                        {groupedTasks[weekLabel].map((task) => (
                          <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex gap-3">
                            <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                            <div className="flex-1 min-w-0">
                               <h3 className="font-semibold text-gray-900 truncate text-sm">{task.title}</h3>
                               <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.content}</p>
                               <div className="mt-1.5 flex items-center justify-end">
                                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Unknown'}
                                    </span>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
    )
}

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
type MobileTab = 'todo' | 'doing' | 'done' | 'archived';

export const Board: React.FC<BoardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(`micro_kanban_tasks_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Mobile Navigation State
  const [mobileTab, setMobileTab] = useState<MobileTab>('todo');

  // Effect to default open dashboard only on large screens
  React.useEffect(() => {
    if (window.innerWidth >= 1024) {
      setShowDashboard(true);
    }
  }, []);

  const [filterTime, setFilterTime] = useState<FilterTime>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { 
        activationConstraint: { 
            distance: 8 
        } 
    }),
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
      <header className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg text-white shadow-md">
            <Layout size={18} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-base md:text-lg leading-tight tracking-tight">
                {/* Mobile Title changes based on Tab */}
                <span className="md:hidden">
                    {mobileTab === 'todo' && '待辦事項'}
                    {mobileTab === 'doing' && '進行中'}
                    {mobileTab === 'done' && '已完成'}
                    {mobileTab === 'archived' && '歸檔紀錄'}
                </span>
                <span className="hidden md:inline">快速工作記事</span>
            </h1>
          </div>
        </div>

        {/* Filter Controls (Visible on Desktop and Non-Archived Mobile Tabs) */}
        {mobileTab !== 'archived' && (
            <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end md:mr-6">
                <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200 max-w-[110px] md:max-w-none">
                    <div className="flex items-center px-2 text-gray-500">
                        <Filter size={14} className="md:mr-1.5"/>
                        <span className="text-xs font-medium hidden md:inline">狀態:</span>
                    </div>
                    <select 
                        value={filterTime} 
                        onChange={(e) => setFilterTime(e.target.value as FilterTime)}
                        className="bg-transparent text-sm border-0 rounded px-1 py-1 focus:ring-0 text-gray-700 cursor-pointer font-medium w-full"
                    >
                        <option value="all">全部</option>
                        <option value="overdue">逾期</option>
                        <option value="today">今天</option>
                    </select>
                </div>

                <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5 border border-gray-200 max-w-[110px] md:max-w-none">
                    <div className="flex items-center px-2 text-gray-500">
                        <ListFilter size={14} className="md:mr-1.5"/>
                        <span className="text-xs font-medium hidden md:inline">等級:</span>
                    </div>
                    <select 
                        value={filterPriority} 
                        onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                        className="bg-transparent text-sm border-0 rounded px-1 py-1 focus:ring-0 text-gray-700 cursor-pointer font-medium w-full"
                    >
                        <option value="all">全部</option>
                        <option value="urgent">緊急</option>
                        <option value="important">重要</option>
                        <option value="normal">一般</option>
                    </select>
                </div>
            </div>
        )}

        {/* Desktop Buttons */}
        <div className="flex items-center gap-1 md:gap-2 border-l pl-2 md:pl-3 border-gray-200 ml-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-blue-600 rounded-full w-8 h-8 p-0 flex items-center justify-center hidden md:flex"
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
          
          {/* Dashboard Toggle (Desktop Only) */}
          <button 
             onClick={() => setShowDashboard(!showDashboard)}
             className={cn(
               "ml-1 p-1.5 rounded-md transition-colors border hidden md:block",
               showDashboard ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
             )}
             title={showDashboard ? "隱藏儀表板" : "顯示儀表板"}
          >
            {showDashboard ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Unified Main View */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-white/50 relative">
            
            {/* Desktop View: 3 Columns side-by-side */}
            <div className="hidden md:flex h-full gap-4 p-4 lg:p-6 min-w-max">
                 <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                >
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
                    {createPortal(
                        <DragOverlay>
                        {activeTask && (
                            <div className="opacity-90 rotate-2 scale-105 cursor-grabbing w-80">
                            <TaskCard task={activeTask} onClick={() => {}} />
                            </div>
                        )}
                        </DragOverlay>,
                        document.body
                    )}
                </DndContext>
            </div>

            {/* Mobile View: Single Tabbed View */}
            <div className="md:hidden h-full w-full">
                {mobileTab === 'archived' ? (
                    <MobileArchiveView tasks={archivedTasks} />
                ) : (
                    // We wrap mobile list in DndContext too so local sorting works, 
                    // though cross-tab dragging is disabled by UI nature
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDragEnd={onDragEnd}
                    >
                        {/* Only render the active column */}
                        {DEFAULT_COLUMNS.filter(col => col.id === mobileTab).map(col => (
                            <Column
                                key={col.id}
                                column={col}
                                tasks={visibleTasks.filter((t) => t.status === col.id)}
                                onAddTask={handleAddTask}
                                onCardClick={handleEditTask}
                                onArchive={handleArchiveTask}
                                isMobile={true}
                            />
                        ))}
                         {createPortal(
                            <DragOverlay>
                            {activeTask && (
                                <div className="opacity-90 rotate-2 scale-105 cursor-grabbing w-[90vw]">
                                <TaskCard task={activeTask} onClick={() => {}} />
                                </div>
                            )}
                            </DragOverlay>,
                            document.body
                        )}
                    </DndContext>
                )}
            </div>

        </main>

        {/* Right Dashboard Panel (Desktop Only) */}
        <div 
            className={cn(
                "hidden md:block bg-white border-l border-gray-200 transition-all duration-300 ease-in-out shadow-xl z-30",
                showDashboard 
                    ? "w-[320px] translate-x-0 opacity-100" 
                    : "w-0 translate-x-[20px] opacity-0 pointer-events-none"
            )}
        >
            <div className="flex flex-col h-full w-[320px]">
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                    <Dashboard tasks={tasks} userName={user.name} />
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
            onClick={() => setMobileTab('todo')}
            className={cn("flex flex-col items-center gap-1 p-2 w-16 transition-colors", mobileTab === 'todo' ? "text-blue-600" : "text-gray-400")}
        >
            <ListTodo size={24} strokeWidth={mobileTab === 'todo' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">待辦</span>
        </button>
        <button 
            onClick={() => setMobileTab('doing')}
            className={cn("flex flex-col items-center gap-1 p-2 w-16 transition-colors", mobileTab === 'doing' ? "text-blue-600" : "text-gray-400")}
        >
            <Loader size={24} strokeWidth={mobileTab === 'doing' ? 2.5 : 2} className={mobileTab === 'doing' ? "animate-spin-slow" : ""} />
            <span className="text-[10px] font-medium">進行中</span>
        </button>
        <button 
            onClick={() => setMobileTab('done')}
            className={cn("flex flex-col items-center gap-1 p-2 w-16 transition-colors", mobileTab === 'done' ? "text-green-600" : "text-gray-400")}
        >
            <CheckCircle2 size={24} strokeWidth={mobileTab === 'done' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">已完成</span>
        </button>
        <button 
            onClick={() => setMobileTab('archived')}
            className={cn("flex flex-col items-center gap-1 p-2 w-16 transition-colors", mobileTab === 'archived' ? "text-purple-600" : "text-gray-400")}
        >
            <History size={24} strokeWidth={mobileTab === 'archived' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">歸檔</span>
        </button>
      </nav>

      {/* Floating Action Button (Only on Todo/Doing Mobile Tabs) */}
      {(mobileTab === 'todo' || mobileTab === 'doing') && (
          <div className="fixed bottom-20 right-5 md:hidden z-30 animate-in zoom-in duration-200">
            <button
              onClick={handleAddTask}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3.5 shadow-lg shadow-blue-600/30 active:scale-95 flex items-center justify-center"
            >
              <Plus size={24} />
            </button>
          </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        userId={user.id}
        // If adding new task, default status matches current mobile tab (if valid), else 'todo'
        defaultStatus={
            (editingTask ? undefined : (mobileTab === 'doing' ? 'doing' : 'todo'))
        }
      />

      {/* Archive Modal (Desktop Only) */}
      <ArchiveModal 
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        tasks={archivedTasks}
      />
    </div>
  );
};