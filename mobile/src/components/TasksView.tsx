import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, Check, Circle, Inbox, Sun } from 'lucide-react-native';
import { useNoteStore } from '../store/noteStore';
import { AppView, TodoItem } from '../types';

interface Props { onNavigate: (view: AppView, noteId?: string) => void }
interface TaskWithNote extends TodoItem { noteId: string; noteTitle: string }

export default function TasksView({ onNavigate }: Props) {
  const { notes, updateNote } = useNoteStore();
  const [filter, setFilter] = useState<'all' | 'today' | 'completed'>('today');

  const tasks = useMemo<TaskWithNote[]>(() => {
    const all: TaskWithNote[] = [];
    notes.forEach((note) => {
      (note.todos || []).forEach((todo) => {
        all.push({ ...todo, noteId: note.id, noteTitle: note.title });
      });
    });
    return all;
  }, [notes]);

  const filtered = useMemo(() => {
    const base = tasks.filter((task) => {
      if (filter === 'completed') return task.completed;
      if (filter === 'today') return !task.completed;
      return true;
    });
    return base.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }, [tasks, filter]);

  const completedCount = tasks.filter((t) => t.completed).length;

  const toggleTask = async (task: TaskWithNote) => {
    const note = notes.find((n) => n.id === task.noteId);
    if (!note?.todos) return;
    const nextTodos = note.todos.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t));
    await updateNote(task.noteId, { todos: nextTodos });
  };

  const priorityStyle = (priority: TaskWithNote['priority']) => {
    if (priority === 'high') return { color: '#dc2626', bg: '#fee2e2', label: '高' };
    if (priority === 'medium') return { color: '#d97706', bg: '#fef3c7', label: '中' };
    return { color: '#6b7280', bg: '#f3f4f6', label: '低' };
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Tasks</Text>
        <Text style={styles.sub}>{completedCount}/{tasks.length} 已完成</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <FilterBtn active={filter === 'all'} onPress={() => setFilter('all')} icon={<Inbox size={18} color={filter === 'all' ? '#2563eb' : '#6b7280'} />} label="全部" />
        <FilterBtn active={filter === 'today'} onPress={() => setFilter('today')} icon={<Sun size={18} color={filter === 'today' ? '#2563eb' : '#6b7280'} />} label="待处理" />
        <FilterBtn active={filter === 'completed'} onPress={() => setFilter('completed')} icon={<Calendar size={18} color={filter === 'completed' ? '#16a34a' : '#6b7280'} />} label="已完成" />
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }}>
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Sun size={42} color="#9ca3af" />
            <Text style={styles.emptyText}>{filter === 'completed' ? '还没有已完成的待办' : filter === 'today' ? '今天没有待办事项！' : '还没有待办事项'}</Text>
            <Text style={styles.emptySub}>在笔记详情页使用 AI 提取待办</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((task) => {
              const p = priorityStyle(task.priority);
              return (
                <View key={task.id} style={styles.card}>
                  <Pressable onPress={() => toggleTask(task)} style={[styles.checkBtn, task.completed && styles.checkBtnDone]}>
                    {task.completed ? <Check size={14} color="white" /> : <Circle size={14} color="#9ca3af" />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskText, task.completed && styles.taskDone]}>{task.text}</Text>
                    <View style={styles.rowMeta}>
                      <View style={[styles.badge, { backgroundColor: p.bg }]}><Text style={{ color: p.color, fontSize: 11, fontWeight: '600' }}>{p.label}</Text></View>
                      <Pressable onPress={() => onNavigate('document', task.noteId)}><Text style={styles.noteRef}>来自: {task.noteTitle}</Text></Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FilterBtn({ active, icon, label, onPress }: { active: boolean; icon: React.ReactNode; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterBtn, active && styles.filterBtnActive]}>
      {icon}
      {label ? <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 14, paddingHorizontal: 16 },
  header: { marginBottom: 14 },
  h1: { fontSize: 30, fontWeight: '800', color: '#111827' },
  sub: { marginTop: 2, fontSize: 13, color: '#6b7280' },
  filters: { gap: 10, paddingBottom: 12, alignItems: 'center' },
  filterBtn: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10 },
  filterBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  filterLabel: { color: '#6b7280', fontWeight: '600' },
  filterLabelActive: { color: '#2563eb' },
  emptyWrap: { marginTop: 8, backgroundColor: '#f3f4f6', borderRadius: 24, paddingVertical: 48, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { marginTop: 10, fontSize: 15, color: '#6b7280', fontWeight: '600' },
  emptySub: { marginTop: 6, fontSize: 13, color: '#9ca3af' },
  card: { flexDirection: 'row', gap: 10, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  checkBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkBtnDone: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  taskText: { fontSize: 15, color: '#111827', fontWeight: '600' },
  taskDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  rowMeta: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  noteRef: { fontSize: 12, color: '#9ca3af', maxWidth: 210 },
});
