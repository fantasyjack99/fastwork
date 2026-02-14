import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { Task, Comment as CommentType } from '../types';
import { comments as commentsApi } from '../services';
import { cn } from '../utils';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  userId: string;
  userName: string;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  userId,
  userName,
}) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && task) {
      loadComments();
    }
  }, [isOpen, task]);

  // Subscribe to realtime comments
  useEffect(() => {
    if (!isOpen || !task) return;

    const channel = supabase
      .channel(`comments:${task.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${task.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as any;
            // Fetch author info from payload or refetch comments
            const commentWithAuthor: CommentType = {
              id: newComment.id,
              task_id: newComment.task_id,
              user_id: newComment.user_id,
              author_name: newComment.author_name || 'Unknown',
              avatar_url: newComment.avatar_url || null,
              content: newComment.content,
              created_at: newComment.created_at,
            };
            setComments(prev => [...prev, commentWithAuthor]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, task]);

  const loadComments = async () => {
    if (!task) return;
    setIsLoading(true);
    const data = await commentsApi.list(task.id);
    setComments(data);
    setIsLoading(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    const comment = await commentsApi.add(task.id, userId, newComment.trim());
    if (comment) {
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  // Scroll to bottom when comments change
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (!isOpen || !task) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if comment is from current user (Sabrina)
  const isMyComment = (comment: CommentType) => {
    return comment.user_id === userId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: task.color || '#e5e7eb' }} 
            />
            <h2 className="font-semibold text-gray-900 truncate max-w-[250px]">
              {task.title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Task Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {task.category}
              </span>
              <span className="text-xs text-gray-400">
                {task.status === 'todo' ? '待辦' : task.status === 'doing' ? '進行中' : '完成'}
              </span>
            </div>
            {task.content && (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.content}</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t my-4" />

          {/* Comments Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💬 留言討論</h3>
            
            {/* Comments List */}
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  載入中...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  暫無留言
                </div>
              ) : (
                comments.map((comment) => {
                  const isMy = isMyComment(comment);
                  const displayName = comment.author_name;
                  const displayAvatar = comment.avatar_url;
                  
                  return (
                    <div 
                      key={comment.id} 
                      className={cn(
                        "flex gap-2",
                        isMy ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      {isMy ? (
                        // Sabrina's avatar
                        <img 
                          src="https://mhmfqquydthwejvzdjou.supabase.co/storage/v1/object/public/avatars/sabrina.png"
                          alt="Sabrina"
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      ) : displayAvatar ? (
                        <img 
                          src={displayAvatar}
                          alt={displayName}
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-600">
                          {displayName.charAt(0)}
                        </div>
                      )}

                      {/* Comment Content */}
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        isMy ? "items-end" : "items-start"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-700">
                            {isMy ? 'Sabrina' : displayName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <div className={cn(
                          "px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                          isMy 
                            ? "bg-blue-500 text-white rounded-tr-none" 
                            : "bg-gray-100 text-gray-700 rounded-tl-none"
                        )}>
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="💬 留言..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
