import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock3, Search, SlidersHorizontal, Tag, X } from 'lucide-react-native';
import { searchEngine } from '../services/search-engine';
import StateBlock from './StateBlock';
import { useNoteStore } from '../store/noteStore';
import { AppView } from '../types';
import { richTextToPreview } from '../utils/richText';

interface Props { onNavigate: (view: AppView, noteId?: string) => void; onClose: () => void }

export default function SearchView({ onNavigate, onClose }: Props) {
  const { notes } = useNoteStore();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const sortedRecent = useMemo(() => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10), [notes]);

  useEffect(() => { searchEngine.init(notes); }, [notes]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) { setResults([]); setSuggestions([]); return; }
      const rs = searchEngine.search(q);
      setResults(rs);
      setSuggestions(searchEngine.getSuggestions(q, 5));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4, bottom: Math.max(96, insets.bottom + 88) }]}>
      <View style={styles.top}>
        <View style={styles.inputWrap}><Search size={18} color="#9ca3af" /><TextInput autoFocus value={q} onChangeText={setQ} placeholder="搜索笔记、内容或标签..." style={styles.input} />{q ? <Pressable onPress={() => setQ('')}><X size={14} color="#6b7280" /></Pressable> : null}</View>
        <Pressable style={styles.iconBtn}><SlidersHorizontal size={18} color="#4b5563" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={onClose}><X size={18} color="#4b5563" /></Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggWrap}>{suggestions.map((s, idx) => <Pressable key={idx} style={styles.suggItem} onPress={() => setQ(s.replace(/^#/, ''))}><Search size={14} color="#9ca3af" /><Text style={styles.suggText}>{s}</Text></Pressable>)}</View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 8 }}>
        {!!q.trim() && <Text style={styles.count}>找到 {results.length} 个结果</Text>}
        {(q.trim() ? results.map((r) => r.item) : sortedRecent).map((item) => (
          <Pressable key={item.id} style={styles.item} onPress={() => onNavigate('document', item.id)}>
            <View style={styles.fileIcon}><Search size={16} color="#9ca3af" /></View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.itemTitle}>{item.title || '无标题'}</Text>
              <Text numberOfLines={2} style={styles.itemDesc}>{richTextToPreview(item.content, 120)}</Text>
              <View style={styles.meta}><Clock3 size={12} color="#9ca3af" /><Text style={styles.metaText}>{new Date(item.updatedAt).toLocaleString()}</Text>{item.tags?.length ? <><Tag size={12} color="#9ca3af" /><Text style={styles.metaText}>{item.tags.slice(0, 2).join(', ')}</Text></> : null}</View>
            </View>
          </Pressable>
        ))}
        {!!q.trim() && results.length === 0 && (
          <StateBlock
            variant="empty"
            title="没有找到匹配结果"
            description="试试更短关键词，或改用标签词搜索"
            actionText="清空关键词"
            onAction={() => setQ('')}
          />
        )}
        {!q.trim() && sortedRecent.length === 0 && (
          <StateBlock
            variant="empty"
            title="还没有可搜索内容"
            description="先新增一条笔记，再回来搜索"
            actionText="关闭搜索"
            onAction={onClose}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'white', zIndex: 60 },
  top: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  suggWrap: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suggItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  suggText: { color: '#374151' },
  count: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  fileIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 12, color: '#9ca3af' },
});
