import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight, Lightbulb, MessageSquare, Search, Sparkles, FileText, ListTodo, X } from 'lucide-react-native';

interface SkillsDialProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
}

export default function SkillsDial({ isOpen, onClose, onSelectSkill }: SkillsDialProps) {
  const [input, setInput] = useState('');

  const items = [
    { id: 'chat', label: 'AI 对话', desc: '进入独立 AI 对话页', icon: MessageSquare, color: '#3b82f6' },
    { id: 'search', label: '智能搜索', desc: '搜索笔记和知识库', icon: Search, color: '#8b5cf6' },
    { id: 'explore', label: '深度探索', desc: '联网搜索/模板/关联发现', icon: Lightbulb, color: '#6366f1' },
    { id: 'brainstorm', label: '头脑风暴', desc: '激发创意和灵感', icon: Lightbulb, color: '#f59e0b' },
    { id: 'draft', label: '起草文档', desc: '快速生成文档草稿', icon: FileText, color: '#10b981' },
    { id: 'tasks', label: '任务总览', desc: '查看和勾选所有待办', icon: ListTodo, color: '#0ea5e9' },
  ] as const;

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>今日事，我来帮。</Text>
            <Pressable onPress={onClose} style={styles.close}><X size={18} color="#6b7280" /></Pressable>
          </View>

          <View style={styles.inputWrap}>
            <Sparkles size={18} color="#9ca3af" />
            <TextInput value={input} onChangeText={setInput} placeholder="询问、搜索或创作任何内容..." style={styles.input} />
            <Pressable
              onPress={() => { if (input.trim()) { onSelectSkill('chat'); onClose(); } }}
              style={[styles.go, !input.trim() && { backgroundColor: '#e5e7eb' }]}
            >
              <ArrowRight size={16} color={input.trim() ? 'white' : '#9ca3af'} />
            </Pressable>
          </View>

          <Text style={styles.sep}>选择功能</Text>
          <View style={{ gap: 8 }}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable key={item.id} style={styles.row} onPress={() => { onSelectSkill(item.id); onClose(); }}>
                  <View style={[styles.rowIcon, { backgroundColor: `${item.color}20` }]}><Icon size={18} color={item.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.label}</Text>
                    <Text style={styles.rowDesc}>{item.desc}</Text>
                  </View>
                  <ArrowRight size={16} color="#9ca3af" />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 24, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  go: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6' },
  sep: { marginVertical: 12, alignSelf: 'center', color: '#9ca3af', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9fafb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowDesc: { fontSize: 12, color: '#9ca3af' },
});
