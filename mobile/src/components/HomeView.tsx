import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight, FileText, Plus, Settings2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  NativeViewGestureHandler,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
  State,
} from 'react-native-gesture-handler';
import { buildBriefing, getBriefingNotes } from '../services/briefing';
import {
  exploreNote,
  getCachedNoteExplore,
  getCachedQuickRead,
  quickReadNote,
  type ExploreQuestionsResult,
  type QuickReadResult,
} from '../services/ai-actions';
import { buildTopicWorkspace, getExploreTopicOptions } from '../services/topic-workspace';
import { useNoteStore } from '../store/noteStore';
import { mobileType } from '../theme/typography';
import { AppView, Note } from '../types';
import { richTextToPlainText } from '../utils/richText';
import TopicPickerSheet from './TopicPickerSheet';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  briefingNoteIds: string[];
  onUpdateBriefingNoteIds: (ids: string[]) => void;
  exploreTopic: string;
  customExploreTopics: string[];
  onSelectExploreTopic: (topic: string) => void;
  onCreateExploreTopic: (topic: string) => void;
  onOpenAIAssistant: (input?: string, context?: { title?: string; content?: string }) => void;
}

const SWIPE_TRIGGER_RIGHT = 42;
const SWIPE_TRIGGER_LEFT = 36;
const SWIPE_OUT = 460;
const SWIPE_VELOCITY_TRIGGER_RIGHT = 0.38;
const SWIPE_VELOCITY_TRIGGER_LEFT = 0.28;
const SWIPE_NUDGE_THRESHOLD = 8;
const PAN_ACTIVE_OFFSET_X = 10;
const PAN_FAIL_OFFSET_Y = 12;
const DEFAULT_BRIEFING_COUNT = 3;
const MAX_BRIEFING_COUNT = 5;

export default function HomeView({
  onNavigate,
  briefingNoteIds,
  onUpdateBriefingNoteIds,
  exploreTopic,
  customExploreTopics,
  onSelectExploreTopic,
  onCreateExploreTopic,
  onOpenAIAssistant,
}: Props) {
  const { notes, updateNote } = useNoteStore();
  const recent = useMemo(() => notes.slice(0, 8), [notes]);
  const briefingPool = useMemo(() => notes.slice(0, 6), [notes]);
  const briefingNotes = useMemo(() => getBriefingNotes(briefingPool, briefingNoteIds), [briefingPool, briefingNoteIds]);
  const briefing = useMemo(() => buildBriefing(briefingNotes), [briefingNotes]);
  const topicOptions = useMemo(() => getExploreTopicOptions(notes, customExploreTopics), [notes, customExploreTopics]);
  const topicWorkspace = useMemo(() => buildTopicWorkspace(notes, exploreTopic, customExploreTopics), [notes, exploreTopic, customExploreTopics]);

  const [quickReadOpen, setQuickReadOpen] = useState(false);
  const [quickIndex, setQuickIndex] = useState(0);
  const [, setSwipeHint] = useState<'next' | 'read' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [quickBodyScrollEnabled, setQuickBodyScrollEnabled] = useState(true);
  const [, setBodySwipeNudge] = useState<'next' | 'read' | null>(null);
  const bodyNudgeHapticRef = useRef<'next' | 'read' | null>(null);
  const panRef = useRef<any>(null);
  const nativeScrollRef = useRef<any>(null);
  const [briefingAdjustOpen, setBriefingAdjustOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [quickAiReloadTick, setQuickAiReloadTick] = useState(0);
  const lastHandledQuickAiReloadTickRef = useRef(0);
  const [quickAiState, setQuickAiState] = useState<{
    noteId: string | null;
    loading: boolean;
    stale: boolean;
    error: string;
    quickRead: QuickReadResult | null;
    explore: ExploreQuestionsResult | null;
  }>({
    noteId: null,
    loading: false,
    stale: false,
    error: '',
    quickRead: null,
    explore: null,
  });

  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const topicTranslateX = useRef(new Animated.Value(0)).current;
  const topicScale = useRef(new Animated.Value(1)).current;
  const topicPanRef = useRef<any>(null);
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
  const currentTopicIndex = useMemo(() => {
    if (!topicOptions.length) return 0;
    const found = topicOptions.findIndex((option) => option.label === exploreTopic);
    return found >= 0 ? found : 0;
  }, [exploreTopic, topicOptions]);
  const topicTheme = useMemo(() => {
    const palettes = [
      { bg: '#eef2f7', border: '#dde4ec', accentA: '#dce8f5', accentB: '#e7f0f7', buttonBorder: '#d4dce4', title: '#1c2430', meta: '#73808c' },
      { bg: '#f0eef8', border: '#e0dff0', accentA: '#dcd9f6', accentB: '#f0eefb', buttonBorder: '#d8d6ee', title: '#1c2232', meta: '#7b7a8d' },
      { bg: '#eef5f2', border: '#dde8e0', accentA: '#dbece4', accentB: '#eef7f2', buttonBorder: '#d5e3da', title: '#1b2a24', meta: '#74847c' },
      { bg: '#f4f1ec', border: '#e5ddd4', accentA: '#eadfce', accentB: '#f7f2ea', buttonBorder: '#e0d6ca', title: '#2b2420', meta: '#85796f' },
    ];
    return palettes[currentTopicIndex % palettes.length];
  }, [currentTopicIndex]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 1200);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!quickReadOpen || !currentQuickNote) return;

    const note = currentQuickNote;
    let cancelled = false;

    const load = async () => {
      const [cachedQuickRead, cachedExplore] = await Promise.all([getCachedQuickRead(note), getCachedNoteExplore(note)]);
      if (cancelled) return;

      const manualRefresh = quickAiReloadTick !== lastHandledQuickAiReloadTickRef.current;
      lastHandledQuickAiReloadTickRef.current = quickAiReloadTick;
      const hasCached = Boolean(cachedQuickRead || cachedExplore);

      if (hasCached && !manualRefresh) {
        setQuickAiState({
          noteId: note.id,
          loading: false,
          stale: false,
          error: '',
          quickRead: cachedQuickRead,
          explore: cachedExplore,
        });
        return;
      }

      setQuickAiState({
        noteId: note.id,
        loading: true,
        stale: hasCached,
        error: '',
        quickRead: cachedQuickRead,
        explore: cachedExplore,
      });

      try {
        const [liveQuickRead, liveExplore] = await Promise.all([quickReadNote(note), exploreNote(note)]);
        if (cancelled) return;

        setQuickAiState({
          noteId: note.id,
          loading: false,
          stale: false,
          error: '',
          quickRead: liveQuickRead,
          explore: liveExplore,
        });
      } catch (error: any) {
        if (cancelled) return;

        setQuickAiState((current) => ({
          noteId: note.id,
          loading: false,
          stale: Boolean(current.quickRead || current.explore || hasCached),
          error: error?.message || 'AI 解读暂时不可用',
          quickRead: current.noteId === note.id ? current.quickRead || cachedQuickRead : cachedQuickRead,
          explore: current.noteId === note.id ? current.explore || cachedExplore : cachedExplore,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [quickReadOpen, currentQuickNote?.id, currentQuickNote?.updatedAt, quickAiReloadTick]);

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

  const briefingHook = useMemo(() => {
    if (!briefingNotes.length) return '选择 3 到 5 篇内容，生成一页可回看的深读简报';
    if (briefingNotes.length === 1) return briefingNotes[0].title || '单篇内容简报';
    const titles = briefingNotes.slice(0, 2).map((note) => note.title || '未命名内容');
    return `${titles[0]} · ${titles[1]}`;
  }, [briefingNotes]);

  const briefingMeta = useMemo(() => {
    return `${briefing.notes.length}篇 · ${Math.max(briefing.notes.length + 1, 3)}分钟`;
  }, [briefing.notes.length]);
  const activeQuickRead = quickAiState.noteId === currentQuickNote?.id ? quickAiState.quickRead : null;
  const activeExplore = quickAiState.noteId === currentQuickNote?.id ? quickAiState.explore : null;

  const topicMeta = useMemo(() => {
    const articleCount = Math.max(topicWorkspace.noteCount, 1);
    const minutes = Math.max(articleCount + 1, 3);
    return `${articleCount}篇 · ${minutes}分钟`;
  }, [topicWorkspace.noteCount]);
  const topicDotCount = Math.min(Math.max(topicOptions.length, 1), 4);
  const topicActiveDot = currentTopicIndex % topicDotCount;

  const topicHint = useMemo(() => {
    if (!topicWorkspace.noteCount) return '先补 1 篇材料开始追踪';
    if (topicWorkspace.freshCount > 0) return `${Math.max(topicWorkspace.freshCount, 1)} 条新线索待推进`;
    if (topicWorkspace.relationCount > 0) return '先把线索收成一个判断';
    return `${topicWorkspace.noteCount} 篇材料可继续收束`;
  }, [topicWorkspace.freshCount, topicWorkspace.noteCount, topicWorkspace.relationCount]);

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

  const animateTopicBack = () => {
    Animated.parallel([
      Animated.spring(topicTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 170,
        mass: 0.8,
      }),
      Animated.spring(topicScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 170,
        mass: 0.8,
      }),
    ]).start();
  };

  const switchTopic = (direction: 'next' | 'prev') => {
    if (!topicOptions.length) return;
    const delta = direction === 'next' ? 1 : -1;
    const nextIndex = (currentTopicIndex + delta + topicOptions.length) % topicOptions.length;
    const nextTopic = topicOptions[nextIndex];
    if (!nextTopic) return;
    if (nextTopic.label !== exploreTopic) {
      onSelectExploreTopic(nextTopic.label);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTopicPanMove = (dx: number) => {
    const dampedX = dx * 0.45;
    topicTranslateX.setValue(dampedX);
    const pullScale = Math.max(0.985, 1 - Math.abs(dampedX) / 2200);
    topicScale.setValue(pullScale);
  };

  const handleTopicPanRelease = (dx: number, dy: number, vx: number, vy: number) => {
    const horizontalIntent = shouldCaptureHorizontalSwipe(dx, dy, vx, vy);
    const projectedX = dx + vx * 100;
    if (horizontalIntent && (vx > SWIPE_VELOCITY_TRIGGER_RIGHT || projectedX > SWIPE_TRIGGER_RIGHT)) {
      switchTopic('prev');
      animateTopicBack();
      return;
    }
    if (horizontalIntent && (vx < -SWIPE_VELOCITY_TRIGGER_LEFT || projectedX < -SWIPE_TRIGGER_LEFT)) {
      switchTopic('next');
      animateTopicBack();
      return;
    }
    animateTopicBack();
  };

  const handleTopicCardPanGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;
    handleTopicPanMove(translationX);
    updateBodyNudge(translationX, translationY);
  };

  const handleTopicCardPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { oldState, state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;
    const normalizedVx = velocityX / 1000;
    const normalizedVy = velocityY / 1000;

    if (state === State.ACTIVE) return;

    if (oldState === State.ACTIVE) {
      handleTopicPanRelease(translationX, translationY, normalizedVx, normalizedVy);
      return;
    }

    if (state === State.CANCELLED || state === State.FAILED) {
      animateTopicBack();
    }
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
          <Pressable style={styles.moreIconBtn} onPress={() => onNavigate('library')} hitSlop={10}>
            <ChevronRight size={16} color="#a1a1aa" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentCards}>
          {recent.map((n, idx) => (
            <View key={n.id} style={styles.noteCard}>
              <Pressable style={styles.noteTopPressable} onPress={() => onNavigate('document', n.id)}>
                <View style={styles.noteTop} />
              </Pressable>

              <Pressable style={styles.noteBottomPressable} onPress={() => openQuickRead(idx)}>
                <View style={styles.noteBottom}>
                  <View style={styles.noteFileIconWrap}>
                    <FileText size={24} color="#8f8f8a" strokeWidth={1.8} />
                  </View>
                  <Text numberOfLines={2} style={styles.noteTitle}>{n.title || '无标题'}</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sTitle}>简报</Text>
          <Pressable style={styles.moreIconBtn} onPress={() => setBriefingAdjustOpen(true)} hitSlop={10}>
            <Settings2 size={16} color="#a1a1aa" />
          </Pressable>
        </View>

        <Pressable style={styles.capsuleCard} onPress={() => onNavigate('briefing')}>
          <View style={styles.briefingStage}>
            <View style={styles.briefingAccentBlock} />
            <View style={styles.briefingAccentBlockSecondary} />
            <Text style={styles.briefingEyebrow}>0318简报</Text>
            <View style={styles.briefingCenterBlock}>
              <Text numberOfLines={2} style={styles.briefingHook}>{briefingHook}</Text>
            </View>
            <Text style={styles.briefingMetaSolo}>{briefingMeta}</Text>
          </View>
        </Pressable>

        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={styles.sTitle}>探索</Text>
          <Pressable style={styles.moreIconBtn} onPress={() => setTopicPickerOpen(true)} hitSlop={10}>
            <Plus size={16} color="#a1a1aa" />
          </Pressable>
        </View>

        <PanGestureHandler
          ref={topicPanRef}
          activeOffsetX={[-PAN_ACTIVE_OFFSET_X, PAN_ACTIVE_OFFSET_X]}
          failOffsetY={[-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y]}
          onGestureEvent={handleTopicCardPanGesture}
          onHandlerStateChange={handleTopicCardPanStateChange}
        >
          <Animated.View style={{ transform: [{ translateX: topicTranslateX }, { scale: topicScale }] }}>
            <Pressable
              style={[styles.topicCard, { backgroundColor: topicTheme.bg, borderColor: topicTheme.border }]}
              onPress={() => onNavigate('explore')}
            >
              <View style={[styles.topicStage, { backgroundColor: topicTheme.bg }]}>
                <View style={[styles.topicPatternRail, { borderColor: topicTheme.buttonBorder, backgroundColor: topicTheme.accentB }]} />
                <View style={[styles.topicPatternTrack, { backgroundColor: topicTheme.accentA }]} />
                <View style={[styles.topicPatternTrackSecondary, { backgroundColor: topicTheme.buttonBorder }]} />
                <View style={[styles.topicPatternCardBack, { borderColor: topicTheme.buttonBorder, backgroundColor: topicTheme.accentB }]} />
                <View style={[styles.topicPatternCardFront, { borderColor: topicTheme.buttonBorder, backgroundColor: 'rgba(255,255,255,0.58)' }]} />
                <View style={[styles.topicPatternDot, { backgroundColor: topicTheme.title }]} />
                <View style={styles.topicContentBlock}>
                  <Text numberOfLines={2} style={[styles.topicHook, styles.topicHookLeft, { color: topicTheme.title }]}>
                    {topicWorkspace.topicLabel || '探索'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.topicSubline, { color: topicTheme.meta }]}>
                    {topicHint}
                  </Text>
                </View>
                <View style={styles.topicFooterRow}>
                  <Text style={[styles.topicMetaSolo, { color: topicTheme.meta }]}>{topicMeta}</Text>
                  <View style={styles.topicPager}>
                    {Array.from({ length: topicDotCount }).map((_, index) => (
                      <View
                        key={`topic-dot-${index}`}
                        style={[
                          styles.topicPagerDot,
                          {
                            backgroundColor: index === topicActiveDot ? topicTheme.title : topicTheme.buttonBorder,
                            opacity: index === topicActiveDot ? 0.85 : 0.9,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </PanGestureHandler>
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

      <TopicPickerSheet
        visible={topicPickerOpen}
        title="调整深度探索 Topic"
        description="选择一个你想持续追踪的问题空间。首页和探索页会围绕它生成进展、关联和思辨挑战。"
        currentTopic={topicWorkspace.topicLabel}
        topicOptions={topicOptions}
        onSelectTopic={onSelectExploreTopic}
        onCreateTopic={onCreateExploreTopic}
        onClose={() => setTopicPickerOpen(false)}
      />

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
                  <View style={styles.quickLabelRow}>
                    <Text style={styles.quickLabel}>AI 快读</Text>
                    {quickAiState.loading ? (
                      <View style={styles.quickStatusWrap}>
                        <ActivityIndicator size="small" color="#64748b" />
                        <Text style={styles.quickStatusText}>{quickAiState.stale ? '正在刷新' : '正在生成'}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.quickSummary}>{activeQuickRead?.summary || quickSummary(currentQuickNote)}</Text>
                  <View style={styles.bulletWrap}>
                    {(activeQuickRead?.bullets?.length ? activeQuickRead.bullets : quickBullets(currentQuickNote)).slice(0, 3).map((b, idx) => (
                      <Text key={`${idx}-${b.slice(0, 8)}`} style={styles.bulletText}>{`${idx + 1}. ${b}`}</Text>
                    ))}
                  </View>
                  {quickAiState.error ? (
                    <View style={styles.quickErrorRow}>
                      <Text style={styles.quickErrorText}>{quickAiState.error}</Text>
                      <Pressable style={styles.quickRetryBtn} onPress={() => setQuickAiReloadTick((value) => value + 1)}>
                        <Text style={styles.quickRetryText}>重试</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                <View style={styles.quickSection}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>关键问题</Text>
                    <Text style={styles.sectionAction}>{activeExplore?.questions?.length ? '继续追问' : 'AI 生成中'}</Text>
                  </View>
                  {(activeExplore?.questions?.length ? activeExplore.questions : quickQuestions(currentQuickNote)).map((q, idx) => (
                    <Pressable
                      key={`${idx}-${q.slice(0, 6)}`}
                      style={styles.questionRow}
                      onPress={() =>
                        onOpenAIAssistant(q, {
                          title: currentQuickNote?.title,
                          content: richTextToPlainText(currentQuickNote?.content || ''),
                        })
                      }
                    >
                      <Text numberOfLines={2} style={styles.questionText}>{q}</Text>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </Pressable>
                  ))}
                  {activeExplore?.nextStep ? (
                    <Pressable
                      style={styles.nextStepCard}
                      onPress={() =>
                        onOpenAIAssistant(activeExplore.nextStep, {
                          title: currentQuickNote?.title,
                          content: richTextToPlainText(currentQuickNote?.content || ''),
                        })
                      }
                    >
                      <Text style={styles.nextStepLabel}>建议下一步</Text>
                      <Text style={styles.nextStepText}>{activeExplore.nextStep}</Text>
                    </Pressable>
                  ) : null}
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
  container: { flex: 1, backgroundColor: '#faf9f7', paddingHorizontal: 16, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  h1: { ...mobileType.screenTitle },

  sectionHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sTitle: { fontSize: 15, lineHeight: 20, color: '#8a8a88', fontWeight: '500', letterSpacing: 0.1 },
  moreIconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentCards: { gap: 14, paddingRight: 20, paddingTop: 8 },
  noteCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9e6df',
    overflow: 'hidden',
  },
  noteTopPressable: { height: 72 },
  noteBottomPressable: { minHeight: 72 },
  noteTop: { flex: 1, backgroundColor: '#f5f3ef' },
  noteBottom: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  noteFileIconWrap: {
    position: 'absolute',
    top: -12,
    left: 14,
  },
  noteTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1f1f1d',
    fontWeight: '500',
    letterSpacing: -0.18,
  },
  capsuleCard: {
    marginTop: 8,
    backgroundColor: '#f7faff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e3ebf8',
    overflow: 'hidden',
  },
  briefingStage: {
    backgroundColor: '#f7faff',
    minHeight: 138,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  briefingAccentBlock: {
    position: 'absolute',
    right: -18,
    top: -14,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: '#dfeaff',
  },
  briefingAccentBlockSecondary: {
    position: 'absolute',
    left: -18,
    bottom: -20,
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: '#f9fbff',
  },
  briefingCenterBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 2,
  },
  briefingEyebrow: {
    position: 'absolute',
    left: 20,
    top: 10,
    fontSize: 12,
    lineHeight: 16,
    color: '#8a98b1',
    fontWeight: '600',
    letterSpacing: 0.06,
  },
  briefingHook: {
    maxWidth: '88%',
    fontSize: 17,
    lineHeight: 23,
    color: '#182034',
    fontWeight: '600',
    letterSpacing: -0.12,
    textAlign: 'center',
  },
  briefingMetaSolo: {
    position: 'absolute',
    left: 20,
    bottom: 7,
    fontSize: 12,
    lineHeight: 16,
    color: '#7180a0',
    fontWeight: '500',
    letterSpacing: 0.05,
  },
  featureFooter: { paddingHorizontal: 4, paddingTop: 14, paddingBottom: 2 },
  cardActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardPrimaryAction: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cardPrimaryActionText: { fontSize: 15, color: '#1f1f1d', fontWeight: '600', letterSpacing: -0.15 },
  cardSecondaryAction: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: '#f6f5f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cardSecondaryActionText: { fontSize: 12, color: '#7f7f7b', fontWeight: '500' },

  topicCard: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  topicHeadline: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    color: '#191919',
    fontWeight: '500',
    letterSpacing: -0.95,
  },
  topicStage: {
    backgroundColor: '#f1f5f9',
    minHeight: 142,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 9,
    overflow: 'hidden',
  },
  topicPatternRail: {
    position: 'absolute',
    right: 16,
    top: 16,
    bottom: 14,
    width: 80,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#ebf1f8',
  },
  topicPatternTrack: {
    position: 'absolute',
    right: 8,
    top: 46,
    width: 92,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#e0e7f0',
    transform: [{ rotate: '-13deg' }],
  },
  topicPatternTrackSecondary: {
    position: 'absolute',
    right: 22,
    top: 70,
    width: 62,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#d4dce6',
    transform: [{ rotate: '18deg' }],
  },
  topicPatternCardBack: {
    position: 'absolute',
    right: 28,
    bottom: 22,
    width: 64,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#f3f7fb',
    transform: [{ rotate: '-8deg' }],
  },
  topicPatternCardFront: {
    position: 'absolute',
    right: 22,
    bottom: 16,
    width: 64,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ rotate: '4deg' }],
  },
  topicPatternDot: {
    position: 'absolute',
    right: 74,
    top: 28,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1c2430',
  },
  topicContentBlock: {
    marginTop: 2,
    width: '70%',
    minHeight: 0,
    justifyContent: 'flex-start',
  },
  topicHook: {
    maxWidth: '88%',
    fontSize: 15,
    lineHeight: 20,
    color: '#1c2430',
    fontWeight: '600',
    letterSpacing: -0.12,
    textAlign: 'center',
  },
  topicHookLeft: {
    maxWidth: '100%',
    fontSize: 17,
    lineHeight: 23,
    textAlign: 'left',
    letterSpacing: -0.45,
  },
  topicSubline: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.04,
  },
  topicFooterRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicMetaSolo: {
    fontSize: 12,
    lineHeight: 16,
    color: '#73808c',
    fontWeight: '500',
    letterSpacing: 0.05,
  },
  topicPager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicPagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d4dce4',
  },

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
  quickSection: { marginBottom: 14 },
  quickLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quickLabel: { fontSize: 18, color: '#d1d5db', fontWeight: '700' },
  quickStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickStatusText: { fontSize: 12, lineHeight: 16, color: '#64748b', fontWeight: '600' },
  quickSummary: { marginTop: 10, fontSize: 16, lineHeight: 26, color: '#1f2937' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 18, color: '#d1d5db', fontWeight: '700' },
  sectionAction: { fontSize: 14, color: '#cbd5e1', fontWeight: '600' },
  bulletWrap: { marginTop: 12, gap: 8 },
  bulletText: { fontSize: 15, lineHeight: 23, color: '#111827', fontWeight: '500' },
  quickErrorRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quickErrorText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#b45309' },
  quickRetryBtn: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRetryText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  questionRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  questionText: { flex: 1, fontSize: 15, lineHeight: 23, color: '#111827', fontWeight: '600' },
  nextStepCard: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  nextStepLabel: { fontSize: 12, lineHeight: 16, color: '#64748b', fontWeight: '700' },
  nextStepText: { fontSize: 14, lineHeight: 21, color: '#1e3a8a' },
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

  feedbackPill: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#111827' },
  feedbackText: { fontSize: 12, color: 'white', fontWeight: '600' },
});
