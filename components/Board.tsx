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
import { Task, Column as ColumnType, User, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ArchiveModal } from './ArchiveModal'; // Import new modal
import { Plus, LogOut, Layout, Archive } from 'lucide-react';
import { Button } from './Button';
import { createPortal } from 'react-dom';
import { cn } from '../utils';

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

export const Board: React.FC<BoardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(`micro_kanban_tasks_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeTask, setActiveTask] = useState<Task | null>(null); // For Drag Overlay
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false); // Archive Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    // Removed window.confirm to ensure the action is immediate and not blocked by browser settings
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

    // Helper to update status and completion time
    const updateTaskStatus = (t: Task, newStatus: TaskStatus): Task => {
        const updates: Partial<Task> = { status: newStatus };
        // If moving to done, set completedAt
        if (newStatus === 'done' && t.status !== 'done') {
            updates.completedAt = new Date().toISOString();
        }
        // If moving out of done, maybe clear completedAt or keep it? 
        // Let's keep it as a record of "last completion", or clear it if strict.
        // For now, let's leave it, but update logic prioritizes status.
        return { ...t, ...updates };
    };

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        
        // Use immutable update pattern
        const newTasks = [...tasks];
        const newStatus = newTasks[overIndex].status;
        
        if (newTasks[activeIndex].status !== newStatus) {
           newTasks[activeIndex] = updateTaskStatus(newTasks[activeIndex], newStatus);
        }

        return arrayMove(newTasks, activeIndex, overIndex);
      });
    }

    // Dropping a Task over a Column (empty area or container)
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

  // Filter out archived tasks for the board view
  const visibleTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);
  // Get archived tasks for the modal
  const archivedTasks = useMemo(() => tasks.filter(t => t.isArchived), [tasks]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Layout size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">快速工作記事</h1>
            <p className="text-xs text-gray-500">Quick Work Notes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
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