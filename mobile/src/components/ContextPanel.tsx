import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bot, ChevronDown, ChevronUp, Clock3, History, Link2, Sparkles, Trash2, X } from 'lucide-react-native';
import { clearContextGraph, ContextTrace, getContextGraphStats, getNoteProvenance } from '../services/context-graph';

interface Props { noteId: string; isOpen: boolean; onClose: () => void }

export default function ContextPanel({ noteId, isOpen, onClose }: Props) {
  const [provenance, setProvenance] = useState<any>(null);
  const [stats, setStats] = useState({ totalTraces: 0, totalPrecedents: 0, totalLinks: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !noteId) return;
    (async () => {
      setProvenance(await getNoteProvenance(noteId));
      setStats(await getContextGraphStats());
    })();
  }, [isOpen, noteId]);

  const typeLabel = (t: ContextTrace['type']) => ({ ai_chat: 'AI 对话', web_search: '联网搜索', podcast: '播客生成', todo_extract: '待办提取', tag_recommend: '标签推荐' } as any)[t] || 'AI 生成';
  const triggerLabel = (t: ContextTrace['trigger']) => ({ manual: '用户触发', scheduled: '定时任务', ai_suggested: 'AI 建议' } as any)[t] || '未知';

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}><View style={styles.headLeft}><View style={styles.logo}><History size={18} color="white" /></View><View><Text style={styles.title}>笔记溯源</Text><Text style={styles.sub}>{provenance?.generatedByAI ? `AI 生成 · ${provenance.generationCount} 次交互` : '用户手动创建'}</Text></View></View><Pressable onPress={onClose}><X size={18} color="#6b7280" /></Pressable></View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {provenance?.generatedByAI && (
            <View style={styles.summary}><View style={styles.row}><Sparkles size={14} color="#7c3aed" /><Text style={styles.summaryTitle}>AI 生成概览</Text></View><Text style={styles.summaryText}>使用模型：{(provenance.models || []).join(', ') || '默认模型'}</Text></View>
          )}

          {!!provenance?.traces?.length && (
            <View style={{ marginTop: 10 }}>
              <View style={styles.row}><Clock3 size={14} color="#6b7280" /><Text style={styles.blockTitle}>决策痕迹</Text></View>
              {provenance.traces.map((trace: ContextTrace) => {
                const open = expanded.has(trace.id);
                return (
                  <Pressable key={trace.id} style={styles.trace} onPress={() => setExpanded((s) => { const next = new Set(s); open ? next.delete(trace.id) : next.add(trace.id); return next; })}>
                    <View style={styles.row}><View style={styles.bot}><Bot size={12} color="#2563eb" /></View><Text style={styles.traceType}>{typeLabel(trace.type)}</Text><Text style={styles.time}>{new Date(trace.generatedAt).toLocaleString()}</Text></View>
                    <Text style={styles.traceSub}>触发方式: {triggerLabel(trace.trigger)}</Text>
                    {open && <View style={styles.traceDetail}><Text style={styles.traceDetailText}>模型: {trace.model}</Text><Text style={styles.traceDetailText}>输入: {(trace.inputs || []).join(' | ').slice(0, 180)}</Text></View>}
                    {open ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.stats}><View style={styles.row}><Link2 size={14} color="#6b7280" /><Text style={styles.blockTitle}>Context Graph 统计</Text></View><Text style={styles.summaryText}>决策痕迹 {stats.totalTraces} · 用户先例 {stats.totalPrecedents} · 跨系统关联 {stats.totalLinks}</Text></View>
        </ScrollView>
        <Pressable style={styles.clear} onPress={() => Alert.alert('确认', '确定要清除所有 Context Graph 数据吗？', [{ text: '取消' }, { text: '清除', style: 'destructive', onPress: async () => { await clearContextGraph(); setStats(await getContextGraphStats()); setProvenance(null); } }])}><Trash2 size={16} color="#ef4444" /><Text style={styles.clearText}>清除 Context Graph 数据</Text></Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '86%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summary: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 10 },
  summaryTitle: { fontWeight: '600', color: '#111827' },
  summaryText: { marginTop: 6, color: '#4b5563', fontSize: 13 },
  blockTitle: { fontWeight: '600', color: '#111827' },
  trace: { marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, gap: 6 },
  bot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  traceType: { fontSize: 11, color: '#1d4ed8', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  time: { marginLeft: 'auto', fontSize: 11, color: '#9ca3af' },
  traceSub: { fontSize: 12, color: '#6b7280' },
  traceDetail: { backgroundColor: 'white', borderRadius: 8, padding: 8 },
  traceDetailText: { fontSize: 12, color: '#4b5563' },
  stats: { marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  clear: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  clearText: { color: '#ef4444', fontWeight: '600' },
});
