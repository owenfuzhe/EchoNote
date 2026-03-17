import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Check, ChevronRight, Compass, FileText, Headphones, MessageSquare, Sparkles } from 'lucide-react-native';
import { buildBriefing, getBriefingNotes } from '../services/briefing';
import { useNoteStore } from '../store/noteStore';
import { AppView, Note } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  briefingNoteIds: string[];
  onUpdateBriefingNoteIds: (ids: string[]) => void;
}

const SWIPE_TRIGGER = 56;
const SWIPE_OUT = 460;
const DEFAULT_BRIEFING_COUNT = 3;
const MAX_BRIEFING_COUNT = 5;

export default function HomeView({ onNavigate, briefingNoteIds, onUpdateBriefingNoteIds }: Props) {
  const { notes, updateNote } = useNoteStore();
  const recent = useMemo(() => notes.slice(0, 8), [notes]);
  const briefingPool = useMemo(() => notes.slice(0, 6), [notes]);
  const briefingNotes = useMemo(() => getBriefingNotes(briefingPool, briefingNoteIds), [briefingPool, briefingNoteIds]);
  const briefing = useMemo(() => buildBriefing(briefingNotes), [briefingNotes]);

  const [quickReadOpen, setQuickReadOpen] = useState(false);
  const [quickIndex, setQuickIndex] = useState(0);
  const [, setSwipeHint] = useState<'next' | 'read' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [quickBodyScrollEnabled, setQuickBodyScrollEnabled] = useState(true);
  const [briefingAdjustOpen, setBriefingAdjustOpen] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const rightRevealProgress = translateX.interpolate({
    inputRange: [0, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const leftRevealProgress = translateX.interpolate({
    inputRange: [-110, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const cardRotate = translateX.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-3deg', '0deg', '3deg'],
    extrapolate: 'clamp',
  });
  const currentQuickNote = recent[quickIndex];

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 1200);
    return () => clearTimeout(timer);
  }, [feedback]);

  const format = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return '刚刚';
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  };

  const extractSite = (note: Note) => {
    try {
      if (!note.sourceUrl) return '本地笔记';
      return new URL(note.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      return '本地笔记';
    }
  };

  const toPlain = (text: string) => text.replace(/#{1,6}\s/g, '').replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim();

  const quickSummary = (note?: Note) => {
    if (!note) return '';
    const plain = toPlain(note.content || '');
    if (!plain) return '这篇内容已导入，点击封面可查看原文笔记。';
    return plain.slice(0, 220) + (plain.length > 220 ? '...' : '');
  };

  const quickBullets = (note?: Note) => {
    if (!note) return [] as string[];
    const plain = toPlain(note.content || '');
    const sentence = plain
      .split(/[。！？.!?；;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12)
      .slice(0, 4);
    if (sentence.length) return sentence;

    const chunks: string[] = [];
    for (let i = 0; i < Math.min(4, Math.ceil(plain.length / 34)); i += 1) {
      const part = plain.slice(i * 34, i * 34 + 34).trim();
      if (part) chunks.push(part);
    }
    return chunks;
  };

  const openQuickRead = (index: number) => {
    setQuickIndex(index);
    setQuickReadOpen(true);
    setQuickBodyScrollEnabled(true);
    translateX.setValue(0);
    cardOpacity.setValue(1);
    cardScale.setValue(1);
    setSwipeHint(null);
  };

  const animateBack = (vx = 0) => {
    setQuickBodyScrollEnabled(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        velocity: vx,
        tension: 130,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 130,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start(() => setSwipeHint(null));
  };

  const transitionToNext = (message: string, direction: 1 | -1 = 1) => {
    if (!recent.length) return;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: SWIPE_OUT * direction,
        duration: 185,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0.68,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.975,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setQuickIndex((idx) => (idx + 1) % recent.length);
      translateX.setValue(-88 * direction);
      cardOpacity.setValue(0.82);
      cardScale.setValue(0.985);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 132,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(cardOpacity, {
          toValue: 1,
          tension: 132,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 132,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start(() => setQuickBodyScrollEnabled(true));
      setSwipeHint(null);
      setFeedback(message);
    });
  };

  const nextArticle = () => transitionToNext('已切换下一篇', 1);

  const markAsRead = async () => {
    const note = recent[quickIndex];
    if (!note) return;
    const tags = Array.from(new Set([...(note.tags || []), '已读']));
    await updateNote(note.id, { tags });
    transitionToNext('已标记为已读', -1);
  };

  const toggleBriefingNote = (noteId: string) => {
    const selectedSet = new Set(briefingNoteIds);

    if (selectedSet.has(noteId)) {
      if (selectedSet.size <= 1) return;
      selectedSet.delete(noteId);
      onUpdateBriefingNoteIds(Array.from(selectedSet));
      return;
    }

    if (selectedSet.size >= MAX_BRIEFING_COUNT) return;
    selectedSet.add(noteId);
    onUpdateBriefingNoteIds(Array.from(selectedSet));
  };

  const resetBriefingNotes = () => {
    onUpdateBriefingNoteIds(briefingPool.slice(0, DEFAULT_BRIEFING_COUNT).map((note) => note.id));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.8,
        onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 2 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.65,
        onPanResponderGrant: () => setQuickBodyScrollEnabled(false),
        onPanResponderMove: (_, gesture) => {
          const dampedX = gesture.dx > 0 ? gesture.dx * 0.98 : gesture.dx * 0.94;
          translateX.setValue(dampedX);
          const pullScale = Math.max(0.97, 1 - Math.abs(dampedX) / 2200);
          cardScale.setValue(pullScale);

          if (gesture.dx > 24) setSwipeHint('next');
          else if (gesture.dx < -24) setSwipeHint('read');
          else setSwipeHint(null);
        },
        onPanResponderRelease: (_, gesture) => {
          const projectedX = gesture.dx + gesture.vx * 110;
          if (projectedX > SWIPE_TRIGGER) return nextArticle();
          if (projectedX < -SWIPE_TRIGGER) return markAsRead();
          animateBack(gesture.vx);
        },
        onPanResponderTerminate: () => animateBack(),
        onPanResponderTerminationRequest: () => false,
      }),
    [quickIndex, recent.length]
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.header}><Text style={styles.h1}>主页</Text></View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sTitle}>最近</Text>
          <Pressable onPress={() => onNavigate('library')}><Text style={styles.moreText}>更多</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentCards}>
          {recent.map((n, idx) => {
            const read = n.tags?.includes('已读');
            return (
              <View key={n.id} style={[styles.noteCard, read && styles.noteCardRead]}>
                <Pressable style={styles.noteTopPressable} onPress={() => onNavigate('document', n.id)}>
                  <View style={styles.noteTop}>
                    <View style={styles.fileIcon}><FileText size={18} color="#6b7280" /></View>
                    {read ? <Text style={styles.readBadge}>已读</Text> : null}
                  </View>
                </Pressable>

                <Pressable style={styles.noteBottomPressable} onPress={() => openQuickRead(idx)}>
                  <View style={{ padding: 10 }}>
                    <Text numberOfLines={2} style={styles.noteTitle}>{n.title || '无标题'}</Text>
                    <Text style={styles.noteSite}>{extractSite(n)}</Text>
                    <Text style={styles.noteTime}>点此进入快读 · {format(n.updatedAt)}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sTitle}>快速消化</Text>
        </View>

        <View style={styles.capsuleCard}>
          <View style={styles.capsuleHead}>
            <View style={styles.capsuleHeadLeft}>
              <View style={styles.capsuleIconWrap}>
                <Sparkles size={15} color="#111827" />
              </View>
              <Text style={styles.capsuleTitle}>快速消化</Text>
            </View>
            <Text style={styles.capsuleMeta}>{briefing.coverageLabel}</Text>
          </View>

          <Pressable style={styles.capsuleCopyArea} onPress={() => setBriefingAdjustOpen(true)}>
            <Text style={styles.capsuleCopy}>{briefing.capsuleText}</Text>
            <View style={styles.capsuleAdjustRow}>
              <Text style={styles.capsuleAdjustText}>点击文案调整本期收录内容</Text>
              <ChevronRight size={15} color="#64748b" />
            </View>
          </Pressable>

          <View style={styles.capsuleChipRow}>
            {briefing.notes.map((note) => (
              <View key={note.id} style={styles.noteChip}>
                <Text numberOfLines={1} style={styles.noteChipText}>{note.title}</Text>
              </View>
            ))}
          </View>

          <View style={styles.capsuleFooter}>
            <Pressable style={styles.readBriefingBtn} onPress={() => onNavigate('briefing')}>
              <BookOpen size={14} color="white" />
              <Text style={styles.readBriefingText}>阅读简报</Text>
            </Pressable>
            <View style={styles.proTeaser}>
              <Headphones size={12} color="#7c2d12" />
              <Text style={styles.proTeaserText}>播客版为 Pro 预留</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sTitle}>深度探索</Text>
        </View>

        <View style={styles.blockCard}>
          <View style={styles.blockHead}><Compass size={16} color="#2563eb" /><Text style={styles.blockTitle}>深度探索</Text></View>
          <Text style={styles.blockDesc}>设置感兴趣 topic，持续追踪并进行 guided learning。</Text>
          <View style={styles.actionColumn}>
            <Pressable style={styles.linkRow} onPress={() => onNavigate('search')}>
              <BookOpen size={15} color="#1d4ed8" />
              <Text style={styles.linkText}>设置 Topic 追踪</Text>
              <ChevronRight size={15} color="#94a3b8" />
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => onNavigate('aiChat')}>
              <MessageSquare size={15} color="#1d4ed8" />
              <Text style={styles.linkText}>开始 Guided Learning</Text>
              <ChevronRight size={15} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={briefingAdjustOpen} transparent animationType="slide" onRequestClose={() => setBriefingAdjustOpen(false)}>
        <View style={styles.sheetMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBriefingAdjustOpen(false)} />
          <View style={styles.adjustSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>调整本期简报内容</Text>
            <Text style={styles.sheetDesc}>建议保留 3 到 5 篇。点击文稿卡片即可增减收录内容。</Text>

            <View style={styles.sheetSummary}>
              <Text style={styles.sheetSummaryTitle}>{briefing.title}</Text>
              <Text style={styles.sheetSummaryText}>{briefing.oneLiner}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
              {briefingPool.map((note) => {
                const selected = briefingNoteIds.includes(note.id);
                return (
                  <Pressable key={note.id} style={[styles.sheetNoteCard, selected && styles.sheetNoteCardSelected]} onPress={() => toggleBriefingNote(note.id)}>
                    <View style={[styles.checkWrap, selected && styles.checkWrapSelected]}>
                      {selected ? <Check size={14} color="white" /> : null}
                    </View>
                    <View style={styles.sheetNoteBody}>
                      <Text numberOfLines={2} style={styles.sheetNoteTitle}>{note.title}</Text>
                      <Text style={styles.sheetNoteMeta}>{`${extractSite(note)} · ${format(note.updatedAt)}`}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sheetActionRow}>
              <Pressable style={styles.sheetGhostBtn} onPress={resetBriefingNotes}>
                <Text style={styles.sheetGhostText}>恢复默认 3 篇</Text>
              </Pressable>
              <Pressable style={styles.sheetPrimaryBtn} onPress={() => setBriefingAdjustOpen(false)}>
                <Text style={styles.sheetPrimaryText}>{`完成（${briefing.notes.length} 篇）`}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={quickReadOpen} transparent animationType="fade" onRequestClose={() => setQuickReadOpen(false)}>
        <View style={styles.modalMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQuickReadOpen(false)} />

          <Animated.View
            style={[
              styles.quickSheet,
              { transform: [{ translateX }, { scale: cardScale }, { rotate: cardRotate }], opacity: cardOpacity },
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeOverlay,
                styles.swipeOverlayRight,
                {
                  opacity: rightRevealProgress,
                  transform: [{ translateX: rightRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                },
              ]}
            >
              <Text style={styles.swipeOverlayArrow}>→</Text>
              <Text style={styles.swipeOverlayTitle}>下一条</Text>
              <Text style={styles.swipeOverlayDesc}>保持这篇未读</Text>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeOverlay,
                styles.swipeOverlayLeft,
                {
                  opacity: leftRevealProgress,
                  transform: [{ translateX: leftRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
                },
              ]}
            >
              <View style={styles.readCheckBadge}><Text style={styles.readCheckText}>✓</Text></View>
              <Text style={styles.swipeReadTitle}>文章已读</Text>
            </Animated.View>

            <Pressable
              style={styles.cover}
              onPress={() => {
                if (!currentQuickNote) return;
                setQuickReadOpen(false);
                onNavigate('document', currentQuickNote.id);
              }}
            >
              <View style={styles.coverTop}><FileText size={22} color="#334155" /></View>
              <View style={styles.coverOverlay}>
                <Text numberOfLines={2} style={styles.coverTitle}>{currentQuickNote?.title || '无标题'}</Text>
                <Text style={styles.coverSite}>{currentQuickNote ? extractSite(currentQuickNote) : ''}</Text>
              </View>
            </Pressable>

            <View style={styles.quickBody}>
              <ScrollView
                showsVerticalScrollIndicator
                scrollEnabled={quickBodyScrollEnabled}
                directionalLockEnabled
                contentContainerStyle={styles.quickBodyContent}
                {...panResponder.panHandlers}
              >
                <Text style={styles.quickLabel}>快读 / QUICK READ</Text>
                <Text style={styles.quickSummary}>{quickSummary(currentQuickNote)}</Text>

                <View style={styles.bulletWrap}>
                  {quickBullets(currentQuickNote).map((b, idx) => (
                    <Text key={`${idx}-${b.slice(0, 8)}`} style={styles.bulletText}>{`${idx + 1}. ${b}`}</Text>
                  ))}
                </View>

                <View style={styles.quickMetaRow}>
                  <Text style={styles.quickMeta}>{currentQuickNote ? format(currentQuickNote.updatedAt) : ''}</Text>
                  <Pressable><Text style={styles.settingText}>解读设置</Text></Pressable>
                </View>

                <Text style={styles.helperText}>右滑下一篇，左滑标记已读</Text>
              </ScrollView>
            </View>

            {feedback ? (
              <View style={styles.feedbackPill}><Text style={styles.feedbackText}>{feedback}</Text></View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  h1: { fontSize: 44, fontWeight: '900', color: '#0f172a' },

  sectionHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  moreText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  recentCards: { gap: 12, paddingRight: 20 },
  noteCard: { width: 190, backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  noteCardRead: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  noteTopPressable: { flex: 1 },
  noteBottomPressable: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  noteTop: { height: 88, backgroundColor: '#f3f4f6', justifyContent: 'space-between', alignItems: 'flex-start', padding: 10 },
  fileIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  readBadge: { fontSize: 11, color: '#15803d', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700' },
  noteTitle: { fontSize: 16, fontWeight: '700', color: '#111827', minHeight: 44 },
  noteSite: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  noteTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  capsuleCard: {
    marginTop: 12,
    backgroundColor: '#fffef9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8dfce',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  capsuleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capsuleHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capsuleIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f7ead1', alignItems: 'center', justifyContent: 'center' },
  capsuleTitle: { fontSize: 17, color: '#111827', fontWeight: '800' },
  capsuleMeta: { fontSize: 12, color: '#92400e', backgroundColor: '#fff3d6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontWeight: '700' },
  capsuleCopyArea: { marginTop: 12, borderRadius: 18, backgroundColor: '#fffcf3', borderWidth: 1, borderColor: '#efe4c9', paddingHorizontal: 14, paddingVertical: 14 },
  capsuleCopy: { fontSize: 15, lineHeight: 24, color: '#1f2937', fontWeight: '600' },
  capsuleAdjustRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capsuleAdjustText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  capsuleChipRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteChip: { borderRadius: 999, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 7, maxWidth: '100%' },
  noteChipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  capsuleFooter: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readBriefingBtn: { height: 38, borderRadius: 12, backgroundColor: '#111827', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  readBriefingText: { fontSize: 13, color: 'white', fontWeight: '800' },
  proTeaser: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10 },
  proTeaserText: { fontSize: 12, color: '#7c2d12', fontWeight: '700' },

  blockCard: { marginTop: 12, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  blockDesc: { marginTop: 8, fontSize: 13, color: '#64748b', lineHeight: 19 },
  actionColumn: { marginTop: 10, gap: 8 },
  linkRow: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#f8fbff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '600' },

  sheetMask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.24)' },
  adjustSheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: 420,
    maxHeight: '78%',
  },
  sheetHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 999, backgroundColor: '#e7e5e4' },
  sheetTitle: { marginTop: 14, fontSize: 22, color: '#111827', fontWeight: '900' },
  sheetDesc: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  sheetSummary: { marginTop: 14, borderRadius: 18, backgroundColor: '#fff7e8', borderWidth: 1, borderColor: '#f2ddaf', paddingHorizontal: 14, paddingVertical: 14 },
  sheetSummaryTitle: { fontSize: 16, color: '#111827', fontWeight: '800' },
  sheetSummaryText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#4b5563' },
  sheetList: { paddingTop: 10, paddingBottom: 6, gap: 10 },
  sheetNoteCard: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ebe5d7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetNoteCardSelected: { borderColor: '#111827', backgroundColor: '#fffdf7' },
  checkWrap: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#d6d3d1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkWrapSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  sheetNoteBody: { flex: 1 },
  sheetNoteTitle: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '700' },
  sheetNoteMeta: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  sheetActionRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  sheetGhostBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
  sheetGhostText: { fontSize: 14, color: '#374151', fontWeight: '700' },
  sheetPrimaryBtn: { flex: 1.1, height: 46, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  sheetPrimaryText: { fontSize: 14, color: 'white', fontWeight: '800' },

  modalMask: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.44)' },
  quickSheet: {
    width: '92%',
    maxHeight: '84%',
    minHeight: '68%',
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    padding: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  swipeOverlayRight: {
    backgroundColor: 'rgba(96,165,250,0.18)',
    alignItems: 'flex-end',
  },
  swipeOverlayLeft: {
    backgroundColor: 'rgba(37,99,235,0.72)',
    alignItems: 'flex-start',
  },
  swipeOverlayArrow: { fontSize: 42, lineHeight: 46, color: '#6b7280', fontWeight: '500' },
  swipeOverlayTitle: { marginTop: 4, fontSize: 16, lineHeight: 22, color: '#334155', fontWeight: '800' },
  swipeOverlayDesc: { marginTop: 2, fontSize: 13, lineHeight: 18, color: '#475569', fontWeight: '600' },
  readCheckBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readCheckText: { fontSize: 28, color: '#2563eb', fontWeight: '900' },
  swipeReadTitle: { marginTop: 12, fontSize: 16, lineHeight: 22, color: 'white', fontWeight: '800' },

  cover: { height: 210, borderRadius: 16, overflow: 'hidden', backgroundColor: '#dbeafe' },
  coverTop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 10 },
  coverTitle: { fontSize: 24, lineHeight: 32, color: 'white', fontWeight: '700' },
  coverSite: { marginTop: 4, fontSize: 14, color: '#d1d5db' },

  quickBody: { marginTop: 10, backgroundColor: 'white', borderRadius: 16, flex: 1, minHeight: 0 },
  quickBodyContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 18 },
  quickLabel: { fontSize: 18, color: '#d1d5db', fontWeight: '700' },
  quickSummary: { marginTop: 10, fontSize: 16, lineHeight: 26, color: '#1f2937' },
  bulletWrap: { marginTop: 12, gap: 8 },
  bulletText: { fontSize: 15, lineHeight: 23, color: '#111827', fontWeight: '500' },
  quickMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickMeta: { fontSize: 12, color: '#9ca3af' },
  settingText: { fontSize: 14, color: '#94a3b8' },
  helperText: { marginTop: 8, fontSize: 12, color: '#94a3b8' },

  feedbackPill: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#111827' },
  feedbackText: { fontSize: 12, color: 'white', fontWeight: '600' },
});
