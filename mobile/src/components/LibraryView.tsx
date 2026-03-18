import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, FileText, Search, Sparkles, X } from 'lucide-react-native';
import StateBlock from './StateBlock';
import { buildLibraryAssetStacks, isAINote, isUnreadNote } from '../services/library-organize';
import { useNoteStore } from '../store/noteStore';
import { AppView, Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
}

type FilterMode = 'all' | 'unread' | 'theme' | 'ai';

const ORGANIZE_DELAY = 920;

export default function LibraryView({ onNavigate }: Props) {
  const { notes } = useNoteStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedStackId, setFocusedStackId] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const organizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (organizeTimerRef.current) clearTimeout(organizeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (filterMode !== 'theme' && focusedStackId) setFocusedStackId(null);
  }, [filterMode, focusedStackId]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterMode === 'unread' && !isUnreadNote(note)) return false;
      if (filterMode === 'ai' && !isAINote(note)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const source = `${note.title || ''} ${richTextToPlainText(note.content || '')} ${(note.tags || []).join(' ')}`.toLowerCase();
        if (!source.includes(q)) return false;
      }
      return true;
    });
  }, [filterMode, notes, searchQuery]);

  const noteMap = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const assetStacks = useMemo(() => buildLibraryAssetStacks(filteredNotes), [filteredNotes]);
  const activeStack = useMemo(
    () => assetStacks.find((stack) => stack.id === focusedStackId) || null,
    [assetStacks, focusedStackId]
  );

  const rawList = useMemo(() => {
    const targetIds = activeStack?.noteIds;
    const pool = targetIds ? filteredNotes.filter((note) => targetIds.includes(note.id)) : filteredNotes;
    return [...pool].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [activeStack, filteredNotes]);

  const organizePreviewNotes = useMemo(() => rawList.slice(0, 3), [rawList]);

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

  const noteAccent = (note: Note) => {
    if (note.type === 'voice') return '#87bfa5';
    if (note.type === 'file') return '#c8ad76';
    if (note.type === 'ai') return '#99a8d8';
    return '#9bbde9';
  };

  const stackMeta = (stack: ReturnType<typeof buildLibraryAssetStacks>[number]) => {
    const stackNotes = stack.noteIds.map((id) => noteMap.get(id)).filter(Boolean) as Note[];
    const voiceCount = stackNotes.filter((note) => note.type === 'voice').length;
    const fileCount = stackNotes.filter((note) => note.type === 'file').length;
    const parts = [`${stack.rawCount}篇原文`];

    if (stack.aiCount) parts.push(`${stack.aiCount}个AI产物`);
    if (voiceCount) parts.push(`${voiceCount}条音频`);
    else if (fileCount) parts.push(`${fileCount}个文件`);

    return parts.join(' | ');
  };

  const setMode = (nextMode: FilterMode) => {
    if (organizeTimerRef.current) {
      clearTimeout(organizeTimerRef.current);
      organizeTimerRef.current = null;
    }
    setIsOrganizing(false);
    setFilterMode(nextMode);
    if (nextMode !== 'theme') setFocusedStackId(null);
  };

  const triggerOrganize = () => {
    if (!filteredNotes.length) {
      setMode('theme');
      return;
    }

    if (organizeTimerRef.current) clearTimeout(organizeTimerRef.current);
    setFocusedStackId(null);
    setIsOrganizing(true);
    organizeTimerRef.current = setTimeout(() => {
      setIsOrganizing(false);
      setFilterMode('theme');
      organizeTimerRef.current = null;
    }, ORGANIZE_DELAY);
  };

  const surfaceMeta = isOrganizing
    ? `AI 正在整理 ${Math.max(filteredNotes.length, 1)} 条内容`
    : filterMode === 'theme'
      ? activeStack
        ? `${rawList.length} 条内容归属到这一组`
        : `${assetStacks.length} 个主题资产`
      : `${rawList.length} 条原始内容`;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>资料库</Text>
          <Pressable style={[styles.headerAction, isOrganizing && styles.headerActionActive]} onPress={triggerOrganize} hitSlop={10}>
            <Sparkles size={17} color={isOrganizing ? '#50627d' : '#6c7b95'} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color="#a0a6ad" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索资料库"
            placeholderTextColor="#a0a6ad"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]} onPress={() => setMode('all')}>
            <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>All</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filterMode === 'unread' && styles.filterChipActive]} onPress={() => setMode('unread')}>
            <Text style={[styles.filterChipText, filterMode === 'unread' && styles.filterChipTextActive]}>未读</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filterMode === 'theme' && styles.filterChipThemeActive]} onPress={() => setMode('theme')}>
            <Text style={[styles.filterChipText, filterMode === 'theme' && styles.filterChipThemeTextActive]}>主题</Text>
          </Pressable>
          <Pressable style={[styles.filterChip, filterMode === 'ai' && styles.filterChipActive]} onPress={() => setMode('ai')}>
            <Text style={[styles.filterChipText, filterMode === 'ai' && styles.filterChipTextActive]}>AI生成</Text>
          </Pressable>
        </ScrollView>

        <Text style={styles.surfaceMeta}>{surfaceMeta}</Text>

        {isOrganizing ? (
          <View style={styles.organizeCard}>
            <Text style={styles.organizeTitle}>AI 正在把内容收成主题资产</Text>
            <View style={styles.organizeScene}>
              <View style={styles.organizeSlipColumn}>
                {organizePreviewNotes.map((note, index) => (
                  <View
                    key={`preview-${note.id}`}
                    style={[
                      styles.organizeSlip,
                      {
                        transform: [{ translateY: index * 6 }, { rotate: index === 1 ? '-3deg' : index === 2 ? '4deg' : '-1deg' }],
                      },
                    ]}
                  >
                    <FileText size={15} color="#7f8ea7" strokeWidth={1.8} />
                    <Text numberOfLines={1} style={styles.organizeSlipText}>{note.title || '未命名内容'}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.organizeFolderWrap}>
                <View style={styles.organizeSparkA} />
                <View style={styles.organizeSparkB} />
                <View style={styles.organizeFolderTab} />
                <View style={styles.organizeFolderBody} />
              </View>
            </View>
            <Text style={styles.organizeDesc}>先把散落的导入内容聚成主题，再进入资产视图。</Text>
          </View>
        ) : filterMode === 'theme' ? (
          activeStack ? (
            <>
              <View style={styles.focusCard}>
                <View>
                  <Text style={styles.focusEyebrow}>当前主题栈</Text>
                  <Text style={styles.focusTitle}>{activeStack.label}</Text>
                </View>
                <Pressable style={styles.focusClearBtn} onPress={() => setFocusedStackId(null)}>
                  <X size={14} color="#6f7a87" />
                </Pressable>
              </View>

              {rawList.length ? (
                <View style={styles.rawList}>
                  {rawList.map((note, index) => (
                    <Pressable key={note.id} style={styles.rawSlipWrap} onPress={() => onNavigate('document', note.id)}>
                      <View style={[styles.rawSlipGhost, index % 2 === 0 ? styles.rawSlipGhostOffsetA : styles.rawSlipGhostOffsetB]} />
                      <View style={styles.rawSlipCard}>
                        <View style={[styles.rawSlipPin, { backgroundColor: noteAccent(note) }]} />
                        <View style={styles.rawSlipHeader}>
                          <FileText size={18} color="#7f8a96" strokeWidth={1.8} />
                          <Text numberOfLines={1} style={styles.rawSlipTitle}>{note.title || '未命名内容'}</Text>
                        </View>
                        <Text numberOfLines={1} style={styles.rawSlipMeta}>{`${sourceLabel(note)} · ${time(note.updatedAt)}`}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <StateBlock
                    variant="empty"
                    title="这组主题里还没有内容"
                    description="可以先返回主题资产视图，或者继续导入资料。"
                    actionText="返回主题"
                    onAction={() => setFocusedStackId(null)}
                  />
                </View>
              )}
            </>
          ) : assetStacks.length ? (
            <View style={styles.assetList}>
              {assetStacks.map((stack, index) => (
                <Pressable
                  key={stack.id}
                  style={styles.assetShell}
                  onPress={() => setFocusedStackId(stack.id)}
                >
                  <View style={[styles.assetGhostFar, { top: 12 + Math.min(index, 2) * 2 }]} />
                  <View style={[styles.assetGhostNear, { top: 6 + Math.min(index, 2) }]} />
                  <View style={styles.assetCard}>
                    <View style={styles.assetTopRow}>
                      <Text numberOfLines={1} style={styles.assetTitle}>{stack.label}</Text>
                      <View style={styles.assetGem} />
                    </View>
                    <Text numberOfLines={2} style={styles.assetSummary}>{stack.summary}</Text>
                    <Text style={styles.assetMeta}>{stackMeta(stack)}</Text>
                    <View style={styles.assetSamples}>
                      {stack.sampleTitles.slice(0, 2).map((sample) => (
                        <Text key={sample.id} numberOfLines={1} style={styles.assetSampleText}>{sample.title}</Text>
                      ))}
                    </View>
                    <View style={styles.assetActionRow}>
                      <Text style={styles.assetActionText}>查看这一组</Text>
                      <ChevronRight size={15} color="#93a0ad" />
                    </View>
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
                actionText="去主页导入"
                onAction={() => onNavigate('home')}
              />
            </View>
          )
        ) : rawList.length ? (
          <View style={styles.rawList}>
            {rawList.map((note, index) => (
              <Pressable key={note.id} style={styles.rawSlipWrap} onPress={() => onNavigate('document', note.id)}>
                <View style={[styles.rawSlipGhost, index % 2 === 0 ? styles.rawSlipGhostOffsetA : styles.rawSlipGhostOffsetB]} />
                <View style={styles.rawSlipCard}>
                  <View style={[styles.rawSlipPin, { backgroundColor: noteAccent(note) }]} />
                  <View style={styles.rawSlipHeader}>
                    <FileText size={18} color="#7f8a96" strokeWidth={1.8} />
                    <Text numberOfLines={1} style={styles.rawSlipTitle}>{note.title || '未命名内容'}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.rawSlipMeta}>{`${sourceLabel(note)} · ${time(note.updatedAt)}`}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <StateBlock
              variant="empty"
              title="没有找到匹配内容"
              description="可以切回 All，或者点右上角让 AI 重新整理。"
              actionText="回到 All"
              onAction={() => setMode('all')}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf9f7' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 144 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 31,
    lineHeight: 37,
    color: '#111827',
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f2',
    borderWidth: 1,
    borderColor: '#e8e5df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionActive: {
    backgroundColor: '#eef2f8',
    borderColor: '#dae2ee',
  },

  searchWrap: {
    marginTop: 16,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9e5de',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#18212f',
  },

  filterRow: {
    paddingTop: 12,
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e5df',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#f4f5f7',
    borderColor: '#dfe3e8',
  },
  filterChipThemeActive: {
    backgroundColor: '#eef3ff',
    borderColor: '#dae3f7',
  },
  filterChipText: {
    fontSize: 13,
    color: '#777a80',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#20242b',
  },
  filterChipThemeTextActive: {
    color: '#3f5284',
  },
  surfaceMeta: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
    color: '#8d918d',
    fontWeight: '500',
  },

  organizeCard: {
    marginTop: 16,
    borderRadius: 26,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#dfe7ef',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  organizeTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#1d2735',
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  organizeScene: {
    marginTop: 18,
    minHeight: 148,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizeSlipColumn: {
    width: '50%',
    paddingLeft: 2,
  },
  organizeSlip: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e2f0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#9fb2cb',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  organizeSlipText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  organizeFolderWrap: {
    width: 120,
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizeFolderTab: {
    position: 'absolute',
    top: 22,
    left: 24,
    width: 42,
    height: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#e5edf6',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#d2dce8',
  },
  organizeFolderBody: {
    width: 88,
    height: 62,
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: '#eef4fa',
    borderWidth: 1,
    borderColor: '#d2dce8',
  },
  organizeSparkA: {
    position: 'absolute',
    right: 18,
    top: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d7e3f2',
  },
  organizeSparkB: {
    position: 'absolute',
    right: 38,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b8cae2',
  },
  organizeDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
  },

  focusCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#f6f7f9',
    borderWidth: 1,
    borderColor: '#e4e8ee',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  focusEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8b929a',
    fontWeight: '600',
  },
  focusTitle: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 22,
    color: '#111827',
    fontWeight: '700',
  },
  focusClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rawList: {
    marginTop: 14,
    gap: 12,
  },
  rawSlipWrap: {
    position: 'relative',
  },
  rawSlipGhost: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: -2,
    bottom: -6,
    borderRadius: 18,
    backgroundColor: '#eef4fb',
    borderWidth: 1,
    borderColor: '#d8e3f2',
  },
  rawSlipGhostOffsetA: {
    transform: [{ rotate: '-1.2deg' }],
  },
  rawSlipGhostOffsetB: {
    transform: [{ rotate: '1deg' }],
  },
  rawSlipCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e4dd',
    paddingHorizontal: 14,
    paddingVertical: 13,
    overflow: 'hidden',
  },
  rawSlipPin: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9bbde9',
  },
  rawSlipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingRight: 16,
  },
  rawSlipTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    color: '#1f2937',
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  rawSlipMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#8b93a0',
    fontWeight: '500',
  },

  assetList: {
    marginTop: 16,
    gap: 14,
  },
  assetShell: {
    position: 'relative',
    paddingTop: 12,
  },
  assetGhostFar: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#e9eef5',
    borderWidth: 1,
    borderColor: '#d8e0ea',
  },
  assetGhostNear: {
    position: 'absolute',
    left: 9,
    right: 9,
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#f1f5fa',
    borderWidth: 1,
    borderColor: '#e0e6ee',
  },
  assetCard: {
    borderRadius: 22,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#e7e1d6',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  assetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  assetTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 27,
    color: '#141b26',
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  assetGem: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#93b8e8',
    marginTop: 6,
  },
  assetSummary: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#607080',
  },
  assetMeta: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    color: '#7d7e81',
    fontWeight: '600',
  },
  assetSamples: {
    marginTop: 12,
    gap: 6,
  },
  assetSampleText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7e8794',
  },
  assetActionRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetActionText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },

  emptyWrap: {
    marginTop: 16,
  },
});
