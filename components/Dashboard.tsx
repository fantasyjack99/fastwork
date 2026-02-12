import React, { useMemo } from 'react';
import { Task, PRIORITY_CONFIG } from '../types';
import { isOverdue, isToday, isCriticalTask } from '../utils';
import { PieChart, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import { cn } from '../utils';

interface DashboardProps {
  tasks: Task[];
  userName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, userName }) => {
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const active = tasks.filter((t) => t.status !== 'done' && !t.isArchived);
    const overdue = active.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const dueToday = active.filter((t) => isToday(t.dueDate) && !isOverdue(t.dueDate, t.status)).length;
    
    // Priority breakdown (Active tasks only)
    const urgent = active.filter((t) => t.category === PRIORITY_CONFIG.urgent.label).length;
    const important = active.filter((t) => t.category === PRIORITY_CONFIG.important.label).length;
    const normal = active.filter((t) => t.category === PRIORITY_CONFIG.normal.label).length;

    // Completion percentage
    const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

    // Focus List: Top 3 critical/high priority active tasks
    const focusTasks = [...active]
      .sort((a, b) => {
        // Sort logic similar to board but simplified for "Focus"
        const aCrit = isCriticalTask(a.dueDate, a.status);
        const bCrit = isCriticalTask(b.dueDate, b.status);
        if (aCrit && !bCrit) return -1;
        if (!aCrit && bCrit) return 1;
        // Then Priority
        const pOrder = { [PRIORITY_CONFIG.urgent.label]: 3, [PRIORITY_CONFIG.important.label]: 2, [PRIORITY_CONFIG.normal.label]: 1 };
        const aP = pOrder[a.category] || 0;
        const bP = pOrder[b.category] || 0;
        return bP - aP;
      })
      .slice(0, 3);

    return { total, done, activeCount: active.length, overdue, dueToday, urgent, important, normal, percentage, focusTasks };
  }, [tasks]);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

  return (
    <div className="h-full flex flex-col gap-6 p-1">
      {/* Greeting & Main Stat */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">嗨，{userName}</h2>
          <p className="text-sm text-gray-500">今日概況</p>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
             {/* Simple SVG Donut Chart */}
             <svg className="transform -rotate-90 w-16 h-16">
                <circle
                  cx="32" cy="32" r={radius}
                  stroke="#e2e8f0" strokeWidth="6" fill="transparent"
                />
                <circle
                  cx="32" cy="32" r={radius}
                  stroke="#3b82f6" strokeWidth="6" fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
             </svg>
             <span className="absolute text-xs font-bold text-blue-600">{stats.percentage}%</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-red-600 leading-none mb-1">{stats.overdue}</span>
            <span className="text-xs text-red-400 font-medium flex items-center">
                <AlertCircle size={10} className="mr-1"/> 逾期
            </span>
        </div>
        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-orange-600 leading-none mb-1">{stats.dueToday}</span>
            <span className="text-xs text-orange-400 font-medium flex items-center">
                <Clock size={10} className="mr-1"/> 今天
            </span>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-blue-600 leading-none mb-1">{stats.activeCount}</span>
            <span className="text-xs text-blue-400 font-medium">待辦中</span>
        </div>
        <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-green-600 leading-none mb-1">{stats.done}</span>
            <span className="text-xs text-green-400 font-medium">已完成</span>
        </div>
      </div>

      {/* Priority Bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">待辦優先級分佈</h3>
        <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100 mb-2">
            {stats.urgent > 0 && <div style={{ width: `${(stats.urgent / stats.activeCount) * 100}%` }} className="bg-red-500" />}
            {stats.important > 0 && <div style={{ width: `${(stats.important / stats.activeCount) * 100}%` }} className="bg-yellow-400" />}
            {stats.normal > 0 && <div style={{ width: `${(stats.normal / stats.activeCount) * 100}%` }} className="bg-green-500" />}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> {stats.urgent} 緊急</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"/> {stats.important} 重要</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"/> {stats.normal} 一般</div>
        </div>
      </div>

      {/* Focus Tasks */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-yellow-100 text-yellow-600 rounded">
                <Zap size={14} fill="currentColor" />
            </div>
            <h3 className="text-sm font-bold text-gray-700">立即關注 (Top 3)</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {stats.focusTasks.length > 0 ? (
                stats.focusTasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm border-l-4" style={{ borderLeftColor: task.color }}>
                        <div className="flex justify-between items-start mb-1">
                             <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{task.category}</span>
                             {isOverdue(task.dueDate, task.status) && <span className="text-[10px] text-red-500 font-bold">已逾期</span>}
                        </div>
                        <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
                    </div>
                ))
            ) : (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                    太棒了！目前沒有高優先級的待辦事項。
                </div>
            )}
        </div>
      </div>
    </div>
  );
};