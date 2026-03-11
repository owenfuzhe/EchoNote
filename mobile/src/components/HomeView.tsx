import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Bell, Compass, FileText, Headphones, MessageSquare } from 'lucide-react-native';
import { useNoteStore } from '../store/noteStore';
import { AppView } from '../types';

interface Props { onNavigate: (view: AppView, noteId?: string) => void }

const focusCards = [
  {
    id: 'focus-digest',
    title: '快速消化',
    desc: '将最近笔记转为可听播客与精简摘要',
    action: '进入探索',
  },
  {
    id: 'focus-graph',
    title: '关联探索',
    desc: '发现主题重合与知识缺口，补齐学习链路',
    action: '查看图谱',
  },
] as const;

export default function HomeView({ onNavigate }: Props) {
  const { notes } = useNoteStore();
  const recent = useMemo(() => notes.slice(0, 6), [notes]);
  const latest = recent[0];

  const format = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return '刚刚';
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={styles.header}><Text style={styles.h1}>主页</Text><Bell size={20} color="#4b5563" /></View>

      <Text style={styles.sTitle}>继续处理</Text>
      {latest ? (
        <View style={styles.resumeCard}>
          <View style={styles.resumeTop}><Text style={styles.resumeBadge}>最近更新</Text><Text style={styles.resumeTime}>{format(latest.updatedAt)}</Text></View>
          <Text style={styles.resumeTitle} numberOfLines={2}>{latest.title || '无标题'}</Text>
          <Text style={styles.resumeSummary} numberOfLines={2}>{latest.content.replace(/#{1,6}\s/g, '').slice(0, 88) || '暂无内容摘要'}</Text>
          <View style={styles.resumeActions}>
            <Pressable style={styles.primaryBtn} onPress={() => onNavigate('document', latest.id)}>
              <FileText size={14} color="white" />
              <Text style={styles.primaryBtnText}>继续阅读</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => onNavigate('aiChat')}>
              <MessageSquare size={14} color="#374151" />
              <Text style={styles.secondaryBtnText}>AI 对话</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => onNavigate('explore')}>
              <Headphones size={14} color="#374151" />
              <Text style={styles.secondaryBtnText}>转播客</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.emptyCard} onPress={() => onNavigate('library')}>
          <Text style={styles.emptyTitle}>还没有笔记内容</Text>
          <Text style={styles.emptyDesc}>先收集一篇内容，再回来一键消化</Text>
          <Text style={styles.emptyAction}>去资料库看看 →</Text>
        </Pressable>
      )}

      <View style={[styles.sectionHeader, { marginTop: 22 }]}><Text style={styles.sTitle}>最近</Text><Pressable onPress={() => onNavigate('library')} style={styles.more}><Text style={styles.moreText}>更多</Text><ArrowRight size={12} color="#6b7280" /></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        {recent.map((n) => (
          <Pressable key={n.id} onPress={() => onNavigate('document', n.id)} style={styles.noteCard}>
            <View style={styles.noteTop}><View style={styles.fileIcon}><FileText size={18} color="#6b7280" /></View></View>
            <View style={{ padding: 10 }}><Text numberOfLines={2} style={styles.noteTitle}>{n.title || '无标题'}</Text><Text style={styles.noteTime}>{format(n.updatedAt)}</Text></View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.sectionHeader, { marginTop: 22 }]}><Text style={styles.sTitle}>今日聚焦</Text><Text style={styles.subLabel}>知识整理</Text></View>
      <View style={{ gap: 10 }}>
        {focusCards.map((item) => (
          <Pressable key={item.id} style={styles.focusCard} onPress={() => onNavigate('explore')}>
            <View style={styles.focusIcon}><Compass size={18} color="#4f46e5" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.focusTitle}>{item.title}</Text>
              <Text style={styles.focusDesc}>{item.desc}</Text>
              <Text style={styles.focusAction}>{item.action} →</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  h1: { fontSize: 20, fontWeight: '700', color: '#111827' },
  sectionHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  subLabel: { fontSize: 12, color: '#9ca3af' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreText: { fontSize: 12, color: '#6b7280' },
  resumeCard: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', padding: 12 },
  resumeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumeBadge: { fontSize: 11, color: '#4338ca', backgroundColor: '#e0e7ff', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '600' },
  resumeTime: { fontSize: 12, color: '#94a3b8' },
  resumeTitle: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#111827' },
  resumeSummary: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  resumeActions: { marginTop: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryBtn: { height: 34, borderRadius: 17, backgroundColor: '#4f46e5', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  secondaryBtn: { height: 34, borderRadius: 17, backgroundColor: '#eef2ff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  emptyCard: { marginTop: 10, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  emptyDesc: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  emptyAction: { marginTop: 8, fontSize: 12, color: '#2563eb', fontWeight: '600' },
  noteCard: { width: 160, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  noteTop: { height: 92, backgroundColor: '#f3f4f6', justifyContent: 'flex-end', padding: 10 },
  fileIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontSize: 14, fontWeight: '600', color: '#111827', minHeight: 36 },
  noteTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  focusCard: { backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  focusIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  focusTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  focusDesc: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  focusAction: { marginTop: 6, fontSize: 12, color: '#2563eb', fontWeight: '600' },
});
