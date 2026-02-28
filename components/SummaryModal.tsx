import React from 'react';
import { X, FileText, Copy, Check } from 'lucide-react';
import { Task } from '../types';
import { cn } from '../utils';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  tasks,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const todoTasks = tasks.filter(t => t.status === 'todo' && !t.isArchived);
  const doingTasks = tasks.filter(t => t.status === 'doing' && !t.isArchived);
  const doneTasks = tasks.filter(t => t.status === 'done' && !t.isArchived);

  const generateSummaryText = () => {
    let text = '';
    
    text += '一、本週已完成的工作事項及內容\n';
    if (doneTasks.length === 0) {
      text += '(無)\n';
    } else {
      doneTasks.forEach((t, i) => {
        text += `${i + 1}. ${t.title}${t.content ? ` - ${t.content}` : ''}\n`;
      });
    }
    text += '\n';

    text += '二、本週進行中的工作事項及內容\n';
    if (doingTasks.length === 0) {
      text += '(無)\n';
    } else {
      doingTasks.forEach((t, i) => {
        text += `${i + 1}. ${t.title}${t.content ? ` - ${t.content}` : ''}\n`;
      });
    }
    text += '\n';

    text += '三、待辦事項工作作事及內容\n';
    if (todoTasks.length === 0) {
      text += '(無)\n';
    } else {
      todoTasks.forEach((t, i) => {
        text += `${i + 1}. ${t.title}${t.content ? ` - ${t.content}` : ''}\n`;
      });
    }

    return text;
  };

  const summaryText = generateSummaryText();

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-xl shadow-xl flex flex-col animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b shrink-0 bg-white">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
               <FileText size={20} />
             </div>
             <div>
               <h2 className="text-lg md:text-xl font-bold text-gray-900">工作記錄匯整</h2>
               <p className="text-xs md:text-sm text-gray-500">自動生成當前看板任務摘要</p>
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm font-mono text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
            {summaryText}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex flex-col md:flex-row gap-3 justify-end md:rounded-b-xl shrink-0 pb-safe">
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm",
              copied ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? '已複製到剪貼簿' : '複製內容'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-200 text-sm font-bold transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
