import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Archive, ChevronDown, Clock, Filter, Search, Settings } from 'lucide-react-native';
import StateBlock from './StateBlock';
import { useNoteStore } from '../store/noteStore';
import { AppView } from '../types';

interface Props { onNavigate: (view: AppView, noteId?: string) => void }

const CONTENT_TYPES = [
  { id: 'all', label: '不限类别' },
  { id: 'article', label: '文章' },
  { id: 'web', label: '网页' },
  { id: 'snippet', label: '片段' },
  { id: 'note', label: '速记' },
  { id: 'image', label: '图片' },
  { id: 'audio', label: '音频' },
];
const MOCK_TAGS = ['AI', 'LLM', '架构', '产品', '设计', '研究', '阅读', '灵感'];

export default function LibraryView({ onNavigate }: Props) {
  const { notes } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const filtered = useMemo(() => {
    const list = notes.filter((note) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!note.title?.toLowerCase().includes(q) && !note.content?.toLowerCase().includes(q)) return false;
      }
      if (selectedType !== 'all') {
        const typeMap: Record<string, string[]> = { article: ['text'], web: ['link'], snippet: ['text'], note: ['text'], image: ['image'], audio: ['voice'] };
        if (!(typeMap[selectedType] || []).includes(note.type)) return false;
      }
      if (selectedTags.length) {
        if (!selectedTags.some((t) => note.tags?.includes(t))) return false;
      }
      return true;
    });
    return list.sort((a, b) => sortBy === 'newest' ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }, [notes, searchQuery, selectedType, selectedTags, sortBy]);

  const time = (d: string) => {
    const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    if (h < 1) return '刚刚';
    if (h < 24) return `${h}小时前`;
    if (h < 48) return '1天前';
    return `${Math.floor(h / 24)}天前`;
  };

  const typeLabel = (type: string) => ({ link: '网页', text: '文章', image: '图片', voice: '音频' } as any)[type] || '其他';
  const filterSummary = selectedType === 'all' && !selectedTags.length ? '不限类别' : `${selectedType !== 'all' ? CONTENT_TYPES.find((x) => x.id === selectedType)?.label : ''}${selectedTags.length ? ` · ${selectedTags.length}个标签` : ''}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}><Text style={styles.h1}>记忆库</Text><Settings size={20} color="#4b5563" /></View>
      <View style={styles.searchWrap}><Search size={18} color="#9ca3af" /><TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="搜索笔记..." style={styles.search} /></View>
      <ScrollView horizontal style={styles.filterScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={styles.filterBtn} onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}><Clock size={14} color="#4b5563" /><Text style={styles.filterText}>{sortBy === 'newest' ? '从新到旧' : '从旧到新'}</Text></Pressable>
        <Pressable style={[styles.filterBtn, selectedType !== 'all' || selectedTags.length > 0 ? { backgroundColor: '#3b82f6' } : undefined]} onPress={() => setShowFilterModal(true)}><Filter size={14} color={selectedType !== 'all' || selectedTags.length > 0 ? 'white' : '#4b5563'} /><Text style={[styles.filterText, selectedType !== 'all' || selectedTags.length > 0 ? { color: 'white' } : undefined]}>{filterSummary}</Text><ChevronDown size={14} color={selectedType !== 'all' || selectedTags.length > 0 ? 'white' : '#4b5563'} /></Pressable>
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {filtered.map((note) => (
          <Pressable key={note.id} style={styles.note} onPress={() => onNavigate('document', note.id)}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>{note.title || '无标题'}</Text>
              <Text style={styles.meta}>xiaohongshu.com · {typeLabel(note.type)} · {time(note.updatedAt)}</Text>
            </View>
          </Pressable>
        ))}
        {!filtered.length && (
          <StateBlock
            variant="empty"
            title="没有找到匹配的笔记"
            description="你可以放宽筛选条件，或先新增内容"
            actionText="清空筛选"
            onAction={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedTags([]);
              setSortBy('newest');
            }}
          />
        )}
      </ScrollView>

      <Modal transparent visible={showFilterModal} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.mask} onPress={() => setShowFilterModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}><Pressable onPress={() => setShowFilterModal(false)}><Text style={styles.cancel}>取消</Text></Pressable><Text style={styles.sheetTitle}>筛选类别</Text><Pressable onPress={() => setShowFilterModal(false)}><Text style={styles.done}>完成</Text></Pressable></View>
          <ScrollView style={{ padding: 16 }}>
            {CONTENT_TYPES.map((type) => (
              <Pressable key={type.id} style={[styles.typeBtn, selectedType === type.id && { backgroundColor: '#dbeafe' }]} onPress={() => setSelectedType(type.id)}><Text style={{ color: selectedType === type.id ? '#1d4ed8' : '#374151' }}>{type.label}</Text></Pressable>
            ))}
            <Text style={styles.tagTitle}>标签</Text>
            <View style={styles.tagsWrap}>
              {MOCK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return <Pressable key={tag} style={[styles.tag, active && { backgroundColor: '#3b82f6' }]} onPress={() => setSelectedTags((p) => active ? p.filter((x) => x !== tag) : [...p, tag])}><Text style={{ color: active ? 'white' : '#4b5563' }}>{tag}</Text></Pressable>;
              })}
            </View>
            <View style={styles.archiveRow}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Archive size={18} color="#9ca3af" /><Text style={{ color: '#374151' }}>切换查看已归档内容</Text></View><Pressable style={[styles.switch, showArchived && { backgroundColor: '#3b82f6' }]} onPress={() => setShowArchived(!showArchived)}><View style={[styles.switchDot, showArchived && { left: 24 }]} /></Pressable></View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 14, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { fontSize: 20, fontWeight: '700', color: '#111827' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  search: { flex: 1, fontSize: 16, color: '#111827' },
  filterScroll: { flexGrow: 0, maxHeight: 46, marginBottom: 4 },
  filterRow: { gap: 8, paddingBottom: 8, alignItems: 'center' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  filterText: { fontSize: 13, color: '#374151' },
  note: { flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginTop: 8 },
  title: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { backgroundColor: 'white', maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cancel: { color: '#6b7280' },
  done: { backgroundColor: '#3b82f6', color: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  typeBtn: { padding: 12, backgroundColor: '#f9fafb', borderRadius: 10, marginBottom: 8 },
  tagTitle: { marginTop: 12, marginBottom: 8, color: '#6b7280', fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  archiveRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#d1d5db' },
  switchDot: { position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
});
