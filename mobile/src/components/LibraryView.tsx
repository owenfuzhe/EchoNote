import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronRight, Filter, Search, Sparkles, X } from 'lucide-react-native';
import StateBlock from './StateBlock';
import {
  buildLibraryAssetStacks,
  getLibraryTags,
  isAINote,
  isUnreadNote,
  LibraryFormatFilter,
  matchesLibraryFormat,
} from '../services/library-organize';
import { useNoteStore } from '../store/noteStore';
import { AppView, Note } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
}

const FORMAT_OPTIONS: Array<{ id: LibraryFormatFilter; label: string }> = [
  { id: 'all', label: '全部格式' },
  { id: 'link', label: '链接' },
  { id: 'text', label: '笔记' },
  { id: 'image', label: '图片' },
  { id: 'voice', label: '音频' },
  { id: 'ai', label: 'AI生成' },
];

type FilterMode = 'all' | 'unread' | 'ai';
type ViewMode = 'organized' | 'raw';

export default function LibraryView({ onNavigate }: Props) {
  const { notes } = useNoteStore();
  const [viewMode, setViewMode] = useState<ViewMode>('organized');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<LibraryFormatFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [focusedStackId, setFocusedStackId] = useState<string | null>(null);
  const [organizeFeedback, setOrganizeFeedback] = useState('');

  const libraryTags = useMemo(() => getLibraryTags(notes).slice(0, 12), [notes]);

  useEffect(() => {
    if (!organizeFeedback) return;
    const timer = setTimeout(() => setOrganizeFeedback(''), 1800);
    return () => clearTimeout(timer);
  }, [organizeFeedback]);

  const baseFilteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterMode === 'unread' && !isUnreadNote(note)) return false;
      if (filterMode === 'ai' && !isAINote(note)) return false;
      if (!matchesLibraryFormat(note, selectedFormat)) return false;
      if (selectedTags.length && !selectedTags.some((tag) => note.tags?.includes(tag))) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const source = `${note.title || ''} ${note.content || ''} ${(note.tags || []).join(' ')}`.toLowerCase();
        if (!source.includes(q)) return false;
      }
      return true;
    });
  }, [notes, filterMode, selectedFormat, selectedTags, searchQuery]);

  const assetStacks = useMemo(() => buildLibraryAssetStacks(baseFilteredNotes), [baseFilteredNotes]);

  const rawList = useMemo(() => {
    const focusedIds = assetStacks.find((stack) => stack.id === focusedStackId)?.noteIds;
    const list = focusedIds ? baseFilteredNotes.filter((note) => focusedIds.includes(note.id)) : baseFilteredNotes;
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assetStacks, baseFilteredNotes, focusedStackId]);

  useEffect(() => {
    if (!focusedStackId) return;
    if (!assetStacks.some((stack) => stack.id === focusedStackId)) setFocusedStackId(null);
  }, [assetStacks, focusedStackId]);

  const activeStack = assetStacks.find((stack) => stack.id === focusedStackId) || null;
  const activeFilterCount = Number(filterMode !== 'all') + Number(selectedFormat !== 'all') + selectedTags.length;
  const aiArtifactCount = baseFilteredNotes.filter(isAINote).length;

  const sectionTitle = viewMode === 'organized' ? '整理后的主题栈' : activeStack ? `${activeStack.label} · 原始内容` : '全部原始内容';
  const sectionMeta = viewMode === 'organized' ? `${assetStacks.length} 组 · ${baseFilteredNotes.length} 条内容` : `${rawList.length} 条内容`;

  const time = (date: string) => {
    const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  const sourceLabel = (note: Note) => {
    try {
      if (!note.sourceUrl) return '本地内容';
      return new URL(note.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      return '本地内容';
    }
  };

  const typeLabel = (note: Note) => {
    if (isAINote(note)) return 'AI生成';
    return { link: '链接', text: '笔记', image: '图片', voice: '音频', file: '文件', ai: 'AI生成' }[note.type] || '内容';
  };

  const noteExcerpt = (note: Note) => {
    return String(note.content || '').replace(/#{1,6}\s/g, '').replace(/\s+/g, ' ').trim() || '这条内容还没有摘要。';
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>资料库</Text>
        <Text style={styles.pageSub}>把导入进来的内容，慢慢收成可以反复调用的资产。</Text>

        <View style={styles.toolbarRow}>
          <Pressable
            style={[styles.toolBtn, searchOpen && styles.toolBtnActive]}
            onPress={() => {
              setSearchOpen((current) => !current);
              if (searchOpen) setSearchQuery('');
            }}
          >
            <Search size={15} color="#475569" />
            <Text style={styles.toolBtnText}>{searchOpen ? '收起搜索' : '库内搜索'}</Text>
          </Pressable>

          <Pressable
            style={[styles.toolBtn, styles.toolBtnWarm]}
            onPress={() => {
              setViewMode('organized');
              setOrganizeFeedback(`已整理出 ${Math.max(assetStacks.length, 1)} 个主题栈`);
            }}
          >
            <Sparkles size={15} color="#0f172a" />
            <Text style={styles.toolBtnTextStrong}>一键整理</Text>
          </Pressable>
        </View>

        {searchOpen ? (
          <View style={styles.searchWrap}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="只搜索资料库内容"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>
        ) : null}

        <View style={styles.viewSwitch}>
          <Pressable style={[styles.viewBtn, viewMode === 'organized' && styles.viewBtnActive]} onPress={() => setViewMode('organized')}>
            <Text style={[styles.viewBtnText, viewMode === 'organized' && styles.viewBtnTextActive]}>整理后</Text>
          </Pressable>
          <Pressable style={[styles.viewBtn, viewMode === 'raw' && styles.viewBtnActive]} onPress={() => setViewMode('raw')}>
            <Text style={[styles.viewBtnText, viewMode === 'raw' && styles.viewBtnTextActive]}>原始内容</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, filterMode === 'unread' && styles.filterChipActive]}
            onPress={() => setFilterMode((current) => (current === 'unread' ? 'all' : 'unread'))}
          >
            <Text style={[styles.filterChipText, filterMode === 'unread' && styles.filterChipTextActive]}>未读</Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, filterMode === 'ai' && styles.filterChipActive]}
            onPress={() => setFilterMode((current) => (current === 'ai' ? 'all' : 'ai'))}
          >
            <Text style={[styles.filterChipText, filterMode === 'ai' && styles.filterChipTextActive]}>AI生成</Text>
          </Pressable>

          <Pressable style={styles.filterChip} onPress={() => setShowFilterModal(true)}>
            <Filter size={14} color="#64748b" />
            <Text style={styles.filterChipText}>{activeFilterCount ? `更多筛选 · ${activeFilterCount}` : '更多筛选'}</Text>
          </Pressable>
        </ScrollView>

        {organizeFeedback ? (
          <View style={styles.feedbackBanner}>
            <Text style={styles.feedbackText}>{organizeFeedback}</Text>
          </View>
        ) : null}

        {activeStack && viewMode === 'raw' ? (
          <View style={styles.contextCard}>
            <View>
              <Text style={styles.contextEyebrow}>当前主题栈</Text>
              <Text style={styles.contextTitle}>{activeStack.label}</Text>
            </View>
            <Pressable onPress={() => setFocusedStackId(null)} style={styles.contextClearBtn}>
              <X size={14} color="#64748b" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>{sectionTitle}</Text>
            <Text style={styles.sectionMeta}>{sectionMeta}</Text>
          </View>
          {viewMode === 'organized' ? (
            <Text style={styles.sectionSummary}>{`${aiArtifactCount} 条 AI 产物`}</Text>
          ) : null}
        </View>

        {viewMode === 'organized' ? (
          assetStacks.length ? (
            <View style={styles.cards}>
              {assetStacks.map((stack) => (
                <Pressable
                  key={stack.id}
                  style={styles.stackCard}
                  onPress={() => {
                    setFocusedStackId(stack.id);
                    setViewMode('raw');
                  }}
                >
                  <View style={styles.stackTopRow}>
                    <View style={styles.stackKindPill}>
                      <Text style={styles.stackKindText}>主题栈</Text>
                    </View>
                    {stack.unreadCount ? (
                      <View style={styles.stackUnreadPill}>
                        <Text style={styles.stackUnreadText}>{`${stack.unreadCount} 未读`}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.stackTitle}>{stack.label}</Text>
                  <Text style={styles.stackSummary}>{stack.summary}</Text>

                  <View style={styles.stackMetaRow}>
                    <Text style={styles.stackMeta}>{`${stack.rawCount} 原文`}</Text>
                    {stack.aiCount ? <Text style={styles.stackMeta}>{`${stack.aiCount} AI产物`}</Text> : null}
                  </View>

                  <View style={styles.samplePanel}>
                    {stack.sampleTitles.map((sample) => (
                      <View key={sample.id} style={styles.sampleRow}>
                        <View style={styles.sampleDot} />
                        <Text numberOfLines={1} style={styles.sampleText}>{sample.title}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.stackActionRow}>
                    <Text style={styles.stackActionText}>查看这一组内容</Text>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <StateBlock
                variant="empty"
                title="还没有可整理的内容"
                description="先导入几条内容，资料库就会开始把它们聚成主题资产。"
                actionText="去导入内容"
                onAction={() => onNavigate('home')}
              />
            </View>
          )
        ) : rawList.length ? (
          <View style={styles.cards}>
            {rawList.map((note) => (
              <Pressable key={note.id} style={styles.rawCard} onPress={() => onNavigate('document', note.id)}>
                <View style={styles.rawTopRow}>
                  <View style={styles.rawTypePill}>
                    <Text style={styles.rawTypeText}>{typeLabel(note)}</Text>
                  </View>
                  {!isUnreadNote(note) ? <Text style={styles.rawReadTag}>已读</Text> : null}
                </View>
                <Text numberOfLines={2} style={styles.rawTitle}>{note.title || '未命名内容'}</Text>
                <Text numberOfLines={2} style={styles.rawExcerpt}>{noteExcerpt(note)}</Text>
                <Text style={styles.rawMeta}>{`${sourceLabel(note)} · ${time(note.updatedAt)}`}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <StateBlock
              variant="empty"
              title="没有找到匹配内容"
              description="可以清空筛选，或者切回整理后视图看看 AI 帮你收束出的主题。"
              actionText="清空筛选"
              onAction={() => {
                setFilterMode('all');
                setSelectedFormat('all');
                setSelectedTags([]);
                setSearchQuery('');
                setFocusedStackId(null);
              }}
            />
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={showFilterModal} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.mask} onPress={() => setShowFilterModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <Pressable onPress={() => setShowFilterModal(false)}><Text style={styles.cancel}>取消</Text></Pressable>
            <Text style={styles.sheetTitle}>更多筛选</Text>
            <Pressable
              onPress={() => {
                setSelectedFormat('all');
                setSelectedTags([]);
              }}
            >
              <Text style={styles.reset}>重置</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.sheetLabel}>格式</Text>
            <View style={styles.optionWrap}>
              {FORMAT_OPTIONS.map((option) => {
                const active = selectedFormat === option.id;
                return (
                  <Pressable key={option.id} style={[styles.optionChip, active && styles.optionChipActive]} onPress={() => setSelectedFormat(option.id)}>
                    {active ? <Check size={12} color="#111827" /> : null}
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>标签</Text>
            <View style={styles.optionWrap}>
              {libraryTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => setSelectedTags((current) => (active ? current.filter((item) => item !== tag) : [...current, tag]))}
                  >
                    {active ? <Check size={12} color="#111827" /> : null}
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fcfaf5' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 148 },
  pageTitle: { fontSize: 30, lineHeight: 36, color: '#0f172a', fontWeight: '900' },
  pageSub: { marginTop: 6, fontSize: 14, lineHeight: 22, color: '#78716c' },
  toolbarRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtnActive: { backgroundColor: '#f5f5f4', borderColor: '#d6d3d1' },
  toolBtnWarm: { backgroundColor: '#f7ead1', borderColor: '#e5cf9f' },
  toolBtnText: { fontSize: 14, color: '#475569', fontWeight: '700' },
  toolBtnTextStrong: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  searchWrap: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  viewSwitch: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  viewBtn: { height: 34, borderRadius: 17, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: '#ffffff' },
  viewBtnText: { fontSize: 13, color: '#78716c', fontWeight: '700' },
  viewBtnTextActive: { color: '#111827' },
  filterRow: { paddingTop: 12, gap: 8 },
  filterChip: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipActive: { backgroundColor: '#f7f0e2', borderColor: '#ead7b3' },
  filterChipText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  filterChipTextActive: { color: '#111827' },
  feedbackBanner: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f5efe2',
    borderWidth: 1,
    borderColor: '#ead7b3',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  feedbackText: { fontSize: 12, color: '#6b4f1d', fontWeight: '700' },
  contextCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#fff8eb',
    borderWidth: 1,
    borderColor: '#efd8ac',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  contextEyebrow: { fontSize: 12, color: '#92400e', fontWeight: '700' },
  contextTitle: { marginTop: 3, fontSize: 16, color: '#111827', fontWeight: '800' },
  contextClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  sectionEyebrow: { fontSize: 18, lineHeight: 24, color: '#111827', fontWeight: '800' },
  sectionMeta: { marginTop: 3, fontSize: 12, color: '#94a3b8' },
  sectionSummary: { fontSize: 12, color: '#a16207', fontWeight: '700' },
  cards: { marginTop: 12, gap: 12 },
  stackCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8dfce',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stackTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stackKindPill: {
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackKindText: { fontSize: 12, color: '#57534e', fontWeight: '700' },
  stackUnreadPill: {
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackUnreadText: { fontSize: 12, color: '#2563eb', fontWeight: '800' },
  stackTitle: { marginTop: 12, fontSize: 24, lineHeight: 30, color: '#111827', fontWeight: '900' },
  stackSummary: { marginTop: 8, fontSize: 15, lineHeight: 23, color: '#475569' },
  stackMetaRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stackMeta: { fontSize: 12, color: '#78716c', fontWeight: '700' },
  samplePanel: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#faf7f0',
    borderWidth: 1,
    borderColor: '#f0e7d8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sampleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d6d3d1' },
  sampleText: { flex: 1, fontSize: 13, color: '#64748b' },
  stackActionRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stackActionText: { fontSize: 14, color: '#111827', fontWeight: '800' },
  rawCard: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rawTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rawTypePill: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rawTypeText: { fontSize: 12, color: '#57534e', fontWeight: '700' },
  rawReadTag: { fontSize: 11, color: '#166534', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', fontWeight: '800' },
  rawTitle: { marginTop: 12, fontSize: 17, lineHeight: 24, color: '#111827', fontWeight: '800' },
  rawExcerpt: { marginTop: 8, fontSize: 14, lineHeight: 22, color: '#6b7280' },
  rawMeta: { marginTop: 10, fontSize: 12, color: '#94a3b8' },
  emptyWrap: { marginTop: 16 },
  mask: { flex: 1, backgroundColor: 'rgba(15,23,42,0.24)' },
  sheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '78%',
    paddingTop: 12,
  },
  sheetHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 999, backgroundColor: '#e7e5e4' },
  sheetHead: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancel: { fontSize: 14, color: '#78716c' },
  reset: { fontSize: 14, color: '#111827', fontWeight: '700' },
  sheetTitle: { fontSize: 18, color: '#111827', fontWeight: '900' },
  sheetBody: { paddingHorizontal: 18 },
  sheetLabel: { marginTop: 8, marginBottom: 10, fontSize: 13, color: '#78716c', fontWeight: '800' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionChipActive: { backgroundColor: '#f5f5f4', borderColor: '#d6d3d1' },
  optionChipText: { fontSize: 13, color: '#475569', fontWeight: '700' },
  optionChipTextActive: { color: '#111827' },
});
