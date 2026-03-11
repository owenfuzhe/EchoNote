import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Bell, FileText, Headphones, Pause, Play } from 'lucide-react-native';
import { useNoteStore } from '../store/noteStore';
import { AppView } from '../types';

interface Props { onNavigate: (view: AppView, noteId?: string) => void }

const quickDigest = [
  { id: 'digest-1', title: 'DeepSeek 并发方案', summary: '异步处理队列、连接池管理、超时重试机制...', type: 'podcast', duration: '12:34' },
  { id: 'digest-2', title: 'UI 设计心理学', summary: '认知负荷、视觉层次、反馈机制三大核心原则', type: 'brief', readTime: '3 min' },
];

const insights = [
  { id: 'insight-1', title: '发现知识关联', description: '你的「AI Agent 架构」与「DeepSeek 并发方案」存在 3 处重合', action: '查看关联图谱' },
  { id: 'insight-2', title: '知识缺口提醒', description: '你记录了 5 篇关于 LLM 的文章，但缺少 Prompt Engineering', action: '获取学习建议' },
];

export default function HomeView({ onNavigate }: Props) {
  const { notes } = useNoteStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const recent = useMemo(() => notes.slice(0, 6), [notes]);

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

      <View style={styles.sectionHeader}><Text style={styles.sTitle}>最近</Text><Pressable onPress={() => onNavigate('library')} style={styles.more}><Text style={styles.moreText}>更多</Text><ArrowRight size={12} color="#6b7280" /></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
        {recent.map((n) => (
          <Pressable key={n.id} onPress={() => onNavigate('document', n.id)} style={styles.noteCard}>
            <View style={styles.noteTop}><View style={styles.fileIcon}><FileText size={18} color="#6b7280" /></View></View>
            <View style={{ padding: 10 }}><Text numberOfLines={2} style={styles.noteTitle}>{n.title || '无标题'}</Text><Text style={styles.noteTime}>{format(n.updatedAt)}</Text></View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.sectionHeader, { marginTop: 22 }]}><Text style={styles.sTitle}>快速消化</Text><Text style={styles.subLabel}>AI 生成</Text></View>
      <View style={{ gap: 10 }}>
        {quickDigest.map((item) => (
          <View key={item.id} style={styles.digestCard}>
            <View style={styles.digestIcon}><Headphones size={18} color={item.type === 'podcast' ? '#7c3aed' : '#2563eb'} /></View>
            <View style={{ flex: 1 }}><Text style={styles.digestTitle}>{item.title}</Text><Text style={styles.digestSummary}>{item.summary}</Text></View>
            {item.type === 'podcast' ? (
              <Pressable style={styles.playBtn} onPress={() => setPlayingId(playingId === item.id ? null : item.id)}>
                {playingId === item.id ? <Pause size={14} color="white" /> : <Play size={14} color="#6b7280" />}
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={[styles.sectionHeader, { marginTop: 22 }]}><Text style={styles.sTitle}>深度探索</Text><Text style={styles.subLabel}>Context Graph</Text></View>
      <View style={{ gap: 10 }}>
        {insights.map((item) => (
          <Pressable key={item.id} style={styles.insight} onPress={() => onNavigate('explore')}>
            <Text style={styles.insightTitle}>{item.title}</Text>
            <Text style={styles.insightDesc}>{item.description}</Text>
            <Text style={styles.insightAction}>{item.action} →</Text>
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
  noteCard: { width: 160, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  noteTop: { height: 92, backgroundColor: '#f3f4f6', justifyContent: 'flex-end', padding: 10 },
  fileIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  noteTitle: { fontSize: 14, fontWeight: '600', color: '#111827', minHeight: 36 },
  noteTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  digestCard: { backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  digestIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  digestTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  digestSummary: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  playBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  insight: { backgroundColor: 'white', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  insightTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  insightDesc: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  insightAction: { fontSize: 13, color: '#2563eb', marginTop: 6, fontWeight: '500' },
});
