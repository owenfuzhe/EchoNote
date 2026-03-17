import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BookOpen, ChevronRight, Compass, FileText, Headphones, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  NativeViewGestureHandler,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import { useNoteStore } from '../store/noteStore';
import { mobileType } from '../theme/typography';
import { AppView, Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

interface Props { onNavigate: (view: AppView, noteId?: string) => void }

const SWIPE_TRIGGER_RIGHT = 42;
const SWIPE_TRIGGER_LEFT = 36;
const SWIPE_OUT = 460;
const SWIPE_VELOCITY_TRIGGER_RIGHT = 0.38;
const SWIPE_VELOCITY_TRIGGER_LEFT = 0.28;
const SWIPE_NUDGE_THRESHOLD = 8;
const PAN_ACTIVE_OFFSET_X = 10;
const PAN_FAIL_OFFSET_Y = 12;

export default function HomeView({ onNavigate }: Props) {
  const { notes, updateNote } = useNoteStore();
  const recent = useMemo(() => notes.slice(0, 8), [notes]);

  const [quickReadOpen, setQuickReadOpen] = useState(false);
  const [quickIndex, setQuickIndex] = useState(0);
  const [, setSwipeHint] = useState<'next' | 'read' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [quickBodyScrollEnabled, setQuickBodyScrollEnabled] = useState(true);
  const [bodySwipeNudge, setBodySwipeNudge] = useState<'next' | 'read' | null>(null);
  const bodyNudgeHapticRef = useRef<'next' | 'read' | null>(null);
  const panRef = useRef<any>(null);
  const nativeScrollRef = useRef<any>(null);

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

  const quickSummary = (note?: Note) => {
    if (!note) return '';
    const plain = richTextToPlainText(note.content || '').replace(/\s+/g, ' ').trim();
    if (!plain) return '这篇内容已导入，点击封面可查看原文笔记。';
    return plain.slice(0, 220) + (plain.length > 220 ? '...' : '');
  };

  const quickBullets = (note?: Note) => {
    if (!note) return [] as string[];
    const plain = richTextToPlainText(note.content || '').replace(/\s+/g, ' ').trim();
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

  const quickQuestions = (note?: Note) => {
    const seed = quickBullets(note);
    if (!seed.length) {
      const title = (note?.title || '这篇内容').trim();
      return [
        `${title}最核心的观点是什么？`,
        `${title}在实际场景中的应用边界是什么？`,
        `${title}下一步最值得追问的问题是什么？`,
      ];
    }
    return seed.slice(0, 3).map((item) => {
      const trimmed = item.replace(/[。.!?？\s]+$/g, '');
      const short = trimmed.slice(0, 34);
      return `${short}？`;
    });
  };

  const relatedCollects = (note?: Note) => {
    if (!note) return [] as string[];
    const tags = (note.tags || []).filter((t) => t && t !== '已读').slice(0, 2);
    if (tags.length) return tags.map((tag) => `收藏分组 · ${tag}`);
    if (note.sourceUrl) return [`来源收藏 · ${extractSite(note)}`];
    return ['升级 Pro+AI 会员以查看'];
  };

  const shouldCaptureHorizontalSwipe = (dx: number, dy: number, vx: number, vy: number) => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const absVx = Math.abs(vx);
    const absVy = Math.abs(vy);

    if (absDx < 4) return false;
    if (absDy > 10 && absDy > absDx * 1.25) return false;
    if (absDx > 6 && absDx > absDy * 0.66) return true;
    return absDx > 12 && absVx > 0.1 && absVx > absVy * 0.75;
  };

  const getBodyNudgeIntent = (dx: number, dy: number) => {
    if (!shouldCaptureHorizontalSwipe(dx, dy, 0, 0)) return null;
    if (dx >= SWIPE_NUDGE_THRESHOLD) return 'read';
    if (dx <= -SWIPE_NUDGE_THRESHOLD) return 'next';
    return null;
  };

  const updateBodyNudge = (dx: number, dy: number) => {
    const intent = getBodyNudgeIntent(dx, dy);
    setBodySwipeNudge(intent);

    if (intent && bodyNudgeHapticRef.current !== intent) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bodyNudgeHapticRef.current = intent;
    }
    if (!intent) bodyNudgeHapticRef.current = null;
  };

  const resetBodyNudge = () => {
    setBodySwipeNudge(null);
    bodyNudgeHapticRef.current = null;
  };

  const handlePanMove = (dx: number) => {
    const dampedX = dx > 0 ? dx : dx * 0.97;
    translateX.setValue(dampedX);
    const pullScale = Math.max(0.97, 1 - Math.abs(dampedX) / 2200);
    cardScale.setValue(pullScale);

    if (dx > 18) setSwipeHint('read');
    else if (dx < -18) setSwipeHint('next');
    else setSwipeHint(null);
  };

  const handlePanRelease = (dx: number, dy: number, vx: number, vy: number) => {
    resetBodyNudge();
    const horizontalIntent = shouldCaptureHorizontalSwipe(dx, dy, vx, vy);
    const projectedX = dx + vx * 110;
    if (horizontalIntent && vx > SWIPE_VELOCITY_TRIGGER_RIGHT) return markAsRead();
    if (horizontalIntent && vx < -SWIPE_VELOCITY_TRIGGER_LEFT) return nextArticle();
    if (horizontalIntent && projectedX > SWIPE_TRIGGER_RIGHT) return markAsRead();
    if (horizontalIntent && projectedX < -SWIPE_TRIGGER_LEFT) return nextArticle();
    animateBack(vx);
  };

  const openQuickRead = (index: number) => {
    setQuickIndex(index);
    setQuickReadOpen(true);
    setQuickBodyScrollEnabled(true);
    translateX.setValue(0);
    cardOpacity.setValue(1);
    cardScale.setValue(1);
    setSwipeHint(null);
    resetBodyNudge();
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
    ]).start(() => {
      setSwipeHint(null);
      resetBodyNudge();
    });
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
      resetBodyNudge();
      setFeedback(message);
    });
  };

  const nextArticle = () => transitionToNext('已切换下一篇', -1);

  const markAsRead = async () => {
    const note = recent[quickIndex];
    if (!note) return;
    const tags = Array.from(new Set([...(note.tags || []), '已读']));
    await updateNote(note.id, { tags });
    transitionToNext('已标记为已读', 1);
  };

  const handleCardPanGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    handlePanMove(translationX);
    updateBodyNudge(translationX, translationY);
  };

  const handleCardPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { oldState, state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;
    const normalizedVx = velocityX / 1000;
    const normalizedVy = velocityY / 1000;

    if (state === State.ACTIVE) {
      setQuickBodyScrollEnabled(false);
      return;
    }

    if (oldState === State.ACTIVE) {
      handlePanRelease(translationX, translationY, normalizedVx, normalizedVy);
      return;
    }

    if (state === State.CANCELLED || state === State.FAILED) {
      animateBack();
    }
  };

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

        <View style={styles.blockCard}>
          <View style={styles.blockHead}><Headphones size={16} color="#4f46e5" /><Text style={styles.blockTitle}>快速消化</Text></View>
          <Text style={styles.blockDesc}>把最近导入内容快速变成可听可读的结构化信息。</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.primaryAction} onPress={() => onNavigate('explore')}>
              <Headphones size={14} color="white" />
              <Text style={styles.primaryActionText}>AI 播客</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction} onPress={() => onNavigate('aiChat')}>
              <FileText size={14} color="#334155" />
              <Text style={styles.secondaryActionText}>简报</Text>
            </Pressable>
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

      <Modal visible={quickReadOpen} transparent animationType="fade" onRequestClose={() => setQuickReadOpen(false)}>
        <View style={styles.modalMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQuickReadOpen(false)} />

          <PanGestureHandler
            ref={panRef}
            activeOffsetX={[-PAN_ACTIVE_OFFSET_X, PAN_ACTIVE_OFFSET_X]}
            failOffsetY={[-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y]}
            simultaneousHandlers={nativeScrollRef}
            onGestureEvent={handleCardPanGesture}
            onHandlerStateChange={handleCardPanStateChange}
          >
            <Animated.View
              style={[
                styles.quickSheet,
                { transform: [{ translateX }, { scale: cardScale }, { rotate: cardRotate }], opacity: cardOpacity },
              ]}
            >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeOverlay,
                styles.swipeOverlayLeft,
                {
                  opacity: rightRevealProgress,
                  transform: [{ translateX: rightRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
                },
              ]}
            >
              <View style={styles.readCheckBadge}><Text style={styles.readCheckText}>✓</Text></View>
              <Text style={styles.swipeReadTitle}>文章已读</Text>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.swipeOverlay,
                styles.swipeOverlayRight,
                {
                  opacity: leftRevealProgress,
                  transform: [{ translateX: leftRevealProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                },
              ]}
            >
              <Text style={styles.swipeOverlayArrow}>→</Text>
              <Text style={styles.swipeOverlayTitle}>下一条</Text>
              <Text style={styles.swipeOverlayDesc}>保持这篇未读</Text>
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
                <NativeViewGestureHandler ref={nativeScrollRef} simultaneousHandlers={panRef}>
                  <ScrollView
                    showsVerticalScrollIndicator
                    scrollEnabled={quickBodyScrollEnabled}
                    directionalLockEnabled
                    contentContainerStyle={styles.quickBodyContent}
                  >
                <View style={styles.quickSection}>
                  <Text style={styles.quickLabel}>快读 / QUICK READ</Text>
                  <Text style={styles.quickSummary}>{quickSummary(currentQuickNote)}</Text>
                  <View style={styles.bulletWrap}>
                    {quickBullets(currentQuickNote).slice(0, 2).map((b, idx) => (
                      <Text key={`${idx}-${b.slice(0, 8)}`} style={styles.bulletText}>{`${idx + 1}. ${b}`}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.quickSection}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>关键问题</Text>
                    <Text style={styles.sectionAction}>全部展开</Text>
                  </View>
                  {quickQuestions(currentQuickNote).map((q, idx) => (
                    <Pressable key={`${idx}-${q.slice(0, 6)}`} style={styles.questionRow}>
                      <Text numberOfLines={2} style={styles.questionText}>{q}</Text>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </Pressable>
                  ))}
                </View>

                <View style={styles.quickSection}>
                  <Text style={styles.sectionTitle}>相关收藏</Text>
                  {relatedCollects(currentQuickNote).map((item, idx) => (
                    <Pressable key={`${idx}-${item.slice(0, 8)}`} style={styles.collectRow}>
                      <Text numberOfLines={1} style={styles.collectText}>{item}</Text>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </Pressable>
                  ))}
                </View>

                <View style={styles.quickMetaRow}>
                  <Text style={styles.quickMeta}>{currentQuickNote ? format(currentQuickNote.updatedAt) : ''}</Text>
                  <Pressable><Text style={styles.settingText}>解读设置</Text></Pressable>
                </View>

                <Text style={styles.helperText}>轻滑卡片：右滑标记已读，左滑下一篇</Text>
                  </ScrollView>
                </NativeViewGestureHandler>
              </View>

              {feedback ? (
                <View style={styles.feedbackPill}><Text style={styles.feedbackText}>{feedback}</Text></View>
              ) : null}
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  h1: { ...mobileType.screenTitle },

  sectionHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sTitle: { ...mobileType.sectionTitle },
  moreText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  recentCards: { gap: 12, paddingRight: 20 },
  noteCard: { width: 190, backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  noteCardRead: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  noteTopPressable: { flex: 1 },
  noteBottomPressable: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  noteTop: { height: 88, backgroundColor: '#f3f4f6', justifyContent: 'space-between', alignItems: 'flex-start', padding: 10 },
  fileIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  readBadge: { fontSize: 11, color: '#15803d', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontWeight: '700' },
  noteTitle: { ...mobileType.cardTitle, minHeight: 44 },
  noteSite: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  noteTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  blockCard: { marginTop: 12, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockTitle: { ...mobileType.sectionTitle, fontSize: 17, lineHeight: 21 },
  blockDesc: { marginTop: 8, fontSize: 13, color: '#64748b', lineHeight: 19 },
  actionRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  primaryAction: { flex: 1, height: 38, borderRadius: 12, backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryActionText: { fontSize: 13, color: 'white', fontWeight: '700' },
  secondaryAction: { flex: 1, height: 38, borderRadius: 12, backgroundColor: '#eef2ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionText: { fontSize: 13, color: '#334155', fontWeight: '700' },
  actionColumn: { marginTop: 10, gap: 8 },
  linkRow: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#f8fbff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '600' },

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
  quickSection: { marginBottom: 14 },
  quickLabel: { fontSize: 18, color: '#d1d5db', fontWeight: '700' },
  quickSummary: { marginTop: 10, fontSize: 16, lineHeight: 26, color: '#1f2937' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 18, color: '#d1d5db', fontWeight: '700' },
  sectionAction: { fontSize: 14, color: '#cbd5e1', fontWeight: '600' },
  bulletWrap: { marginTop: 12, gap: 8 },
  bulletText: { fontSize: 15, lineHeight: 23, color: '#111827', fontWeight: '500' },
  questionRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  questionText: { flex: 1, fontSize: 15, lineHeight: 23, color: '#111827', fontWeight: '600' },
  collectRow: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  collectText: { flex: 1, fontSize: 15, color: '#6b7280', fontWeight: '600' },
  quickMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickMeta: { fontSize: 12, color: '#9ca3af' },
  settingText: { fontSize: 14, color: '#94a3b8' },
  helperText: { marginTop: 8, fontSize: 12, color: '#94a3b8' },

  swipeHint: { position: 'absolute', top: 18, right: 16, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  swipeHintNext: { backgroundColor: '#dbeafe' },
  swipeHintRead: { backgroundColor: '#dcfce7' },
  swipeHintText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  feedbackPill: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#111827' },
  feedbackText: { fontSize: 12, color: 'white', fontWeight: '600' },
});
