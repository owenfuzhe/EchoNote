import { useEffect, useState } from "react";
import { Bell, MoreHorizontal, Inbox, Sun, Calendar, ClipboardList, Check, Circle } from "lucide-react";
import AppIcon from "./AppIcon";
import { useNoteStore, TodoItem } from "../store/note-store";

interface TasksViewProps {
  onNavigate: (view: string, noteId?: string) => void;
}

interface TaskWithNote extends TodoItem {
  noteId: string;
  noteTitle: string;
}

export default function TasksView({ onNavigate }: TasksViewProps) {
  const { notes, updateNote } = useNoteStore();
  const [tasks, setTasks] = useState<TaskWithNote[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "completed">("today");

  // 从所有笔记中提取待办事项
  useEffect(() => {
    const allTasks: TaskWithNote[] = [];
    notes.forEach((note) => {
      if (note.todos && note.todos.length > 0) {
        note.todos.forEach((todo) => {
          allTasks.push({
            ...todo,
            noteId: note.id,
            noteTitle: note.title,
          });
        });
      }
    });
    setTasks(allTasks);
  }, [notes]);

  // 切换待办完成状态
  const toggleTask = async (task: TaskWithNote) => {
    const note = notes.find((n) => n.id === task.noteId);
    if (!note || !note.todos) return;

    const updatedTodos = note.todos.map((t) =>
      t.id === task.id ? { ...t, completed: !t.completed } : t
    );

    await updateNote(task.noteId, { todos: updatedTodos });
  };

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "today") return !task.completed;
    return true;
  });

  // 按优先级排序
  const sortedTasks = filteredTasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 bg-red-50";
      case "medium":
        return "text-yellow-500 bg-yellow-50";
      case "low":
        return "text-gray-500 bg-gray-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="flex-1 overflow-y-auto pb-32 bg-[#f8f8f9]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-14 pb-4 sticky top-0 bg-[#f8f8f9]/80 backdrop-blur-md z-10">
        <AppIcon />
        <div className="flex items-center gap-4">
          <button className="text-gray-800 hover:text-black transition-colors">
            <Bell size={22} strokeWidth={2} />
          </button>
          <button className="text-gray-800 hover:text-black transition-colors">
            <MoreHorizontal size={22} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="px-6 mt-2">
        <h1 className="text-[32px] font-bold text-gray-900 mb-2 tracking-tight">
          Tasks
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {completedCount}/{totalCount} 已完成
        </p>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          <button 
            onClick={() => setFilter("all")}
            className={`p-3.5 rounded-2xl transition-colors border ${
              filter === "all" 
                ? "bg-blue-50 text-blue-600 border-blue-100 shadow-sm" 
                : "bg-gray-100/80 text-gray-500 border-gray-200/50 hover:bg-gray-200"
            }`}
          >
            <Inbox size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setFilter("today")}
            className={`px-6 py-3.5 rounded-2xl font-semibold flex items-center gap-2 border transition-colors ${
              filter === "today"
                ? "bg-blue-50 text-blue-600 border-blue-100/50 shadow-sm"
                : "bg-gray-100/80 text-gray-500 border-gray-200/50 hover:bg-gray-200"
            }`}
          >
            <Sun size={20} strokeWidth={2.5} />
            Today
          </button>
          <button 
            onClick={() => setFilter("completed")}
            className={`p-3.5 rounded-2xl transition-colors border ${
              filter === "completed"
                ? "bg-green-50 text-green-600 border-green-100 shadow-sm"
                : "bg-gray-100/80 text-gray-500 border-gray-200/50 hover:bg-gray-200"
            }`}
          >
            <Calendar size={20} strokeWidth={2.5} />
          </button>
          <button className="bg-gray-100/80 p-3.5 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors border border-gray-200/50">
            <ClipboardList size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Task List */}
        {sortedTasks.length === 0 ? (
          <div className="bg-gray-100/80 rounded-[32px] p-16 flex flex-col items-center justify-center text-center border border-gray-200/50 mt-4">
            <Sun size={48} className="text-gray-400 mb-4" strokeWidth={1.5} />
            <p className="text-gray-400 font-medium text-[15px]">
              {filter === "completed" 
                ? "还没有已完成的待办" 
                : filter === "today"
                ? "今天没有待办事项！"
                : "还没有待办事项"}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              在笔记中使用 AI 提取待办
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/60 flex items-start gap-3"
              >
                <button
                  onClick={() => toggleTask(task)}
                  className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.completed
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-300 hover:border-blue-500"
                  }`}
                >
                  {task.completed && <Check size={14} strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[16px] font-medium truncate ${
                    task.completed ? "text-gray-400 line-through" : "text-gray-900"
                  }`}>
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                    </span>
                    <span 
                      onClick={() => onNavigate("document", task.noteId)}
                      className="text-[12px] text-gray-400 hover:text-blue-500 cursor-pointer truncate"
                    >
                      来自: {task.noteTitle}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
