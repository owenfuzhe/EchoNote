import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, BookOpen, ChevronRight, Link2, RefreshCw } from 'lucide-react-native';
import { generateBriefing, getCachedBriefing, type BriefingArtifact } from '../services/ai-actions';
import { getBriefingNotes } from '../services/briefing';
import { useNoteStore } from '../store/noteStore';
import { AppView } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  selectedNoteIds: string[];
}

function formatDateLabel(date?: string) {
  const value = date ? new Date(date) : new Date();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${month}月${day}日`;
}

export default function BriefingView({ onNavigate, selectedNoteIds }: Props) {
  const { notes } = useNoteStore();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [briefingState, setBriefingState] = useState<{
    loading: boolean;
    stale: boolean;
    statusLabel: string;
    error: string;
    artifact: BriefingArtifact | null;
  }>({
    loading: false,
    stale: false,
    statusLabel: '',
    error: '',
    artifact: null,
  });

  const pickedNotes = useMemo(() => getBriefingNotes(notes, selectedNoteIds), [notes, selectedNoteIds]);

  useEffect(() => {
    if (!pickedNotes.length) return;

    let cancelled = false;

    const load = async () => {
      const cached = await getCachedBriefing(pickedNotes);
      if (cancelled) return;

      setBriefingState({
        loading: true,
        stale: Boolean(cached),
        statusLabel: '正在提交给 AI',
        error: '',
        artifact: cached,
      });

      try {
        const artifact = await generateBriefing(pickedNotes, {
          onStatus: (status) => {
            if (cancelled) return;
            setBriefingState((current) => ({
              ...current,
              loading: status !== 'succeeded',
              statusLabel: status === 'queued' ? '正在排队' : status === 'running' ? '正在生成简报' : '即将完成',
            }));
          },
        });

        if (cancelled) return;

        setBriefingState({
          loading: false,
          stale: false,
          statusLabel: '已更新',
          error: '',
          artifact,
        });
      } catch (error: any) {
        if (cancelled) return;

        setBriefingState((current) => ({
          loading: false,
          stale: Boolean(current.artifact || cached),
          statusLabel: current.artifact ? '已展示最近结果' : '',
          error: error?.message || '生成简报失败',
          artifact: current.artifact || cached,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [pickedNotes, reloadTick]);

  if (!pickedNotes.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>还没有可生成简报的内容</Text>
        <Text style={styles.emptyDesc}>先导入几篇最近内容，再回到首页生成这期深读简报。</Text>
        <Pressable style={styles.backBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.backBtnText}>返回首页</Text>
        </Pressable>
      </View>
    );
  }

  const artifact = briefingState.artifact;
  const data = artifact?.data;
  const dateLabel = formatDateLabel(data?.generatedAt || artifact?.createdAt);
  const coverageLabel = `包含 ${data?.sourceCount || pickedNotes.length} 篇内容`;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backIconBtn} onPress={() => onNavigate('home')}>
            <ArrowLeft size={18} color="#0f172a" />
            <Text style={styles.backIconText}>返回</Text>
          </Pressable>

          <Pressable style={styles.refreshPill} onPress={() => setReloadTick((value) => value + 1)} disabled={briefingState.loading}>
            {briefingState.loading ? <ActivityIndicator size="small" color="#44403c" /> : <RefreshCw size={14} color="#0f172a" />}
            <Text style={styles.refreshPillText}>{briefingState.loading ? '生成中' : '重新生成'}</Text>
          </Pressable>
        </View>

        {!artifact && briefingState.loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#334155" />
            <Text style={styles.loadingTitle}>正在生成本期简报</Text>
            <Text style={styles.loadingDesc}>{briefingState.statusLabel || '把多篇内容收束成一页可回看的判断'}</Text>
          </View>
        ) : null}

        {!artifact && briefingState.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>这次生成没有成功</Text>
            <Text style={styles.errorDesc}>{briefingState.error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => setReloadTick((value) => value + 1)}>
              <Text style={styles.retryBtnText}>重新生成</Text>
            </Pressable>
          </View>
        ) : null}

        {artifact ? (
          <>
            <Text style={styles.title}>{data?.title || artifact.title}</Text>
            <Text style={styles.meta}>{`${dateLabel} · ${coverageLabel}`}</Text>

            {briefingState.loading || briefingState.error ? (
              <View style={styles.stateRow}>
                {briefingState.loading ? <ActivityIndicator size="small" color="#64748b" /> : null}
                <Text style={styles.stateText}>
                  {briefingState.loading
                    ? briefingState.stale
                      ? '正在刷新当前简报'
                      : briefingState.statusLabel || '正在生成'
                    : briefingState.error || briefingState.statusLabel}
                </Text>
              </View>
            ) : null}

            <View style={styles.summaryBlock}>
              <Text style={styles.sectionEyebrow}>一句话核心摘要</Text>
              <Text style={styles.summaryText}>{data?.oneLiner || data?.summary || '本期内容已经整理完成。'}</Text>
              {data?.summary && data.summary !== data.oneLiner ? <Text style={styles.summarySub}>{data.summary}</Text> : null}
            </View>

            {!!data?.bullets?.length && (
              <View style={styles.analysisBlock}>
                <Text style={styles.sectionEyebrow}>关键信号</Text>
                {data.bullets.map((bullet, index) => (
                  <View key={`${index}-${bullet.slice(0, 12)}`} style={styles.bulletRow}>
                    <Text style={styles.bulletIndex}>{`${String(index + 1).padStart(2, '0')}.`}</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.analysisBlock}>
              <Text style={styles.sectionEyebrow}>要点拆解</Text>
              {(data?.sections?.length ? data.sections : []).map((section, index) => (
                <View key={section.id} style={styles.sectionCard}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionIndex}>{`${String(index + 1).padStart(2, '0')}.`}</Text>
                    <View style={styles.sectionTitleWrap}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionInsight}>{section.summary}</Text>
                  <Text style={styles.sectionAction}>{section.keyPoint}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.sourcesBtn} onPress={() => setSourcesOpen(true)}>
              <Link2 size={15} color="#0f172a" />
              <Text style={styles.sourcesBtnText}>{`查看 ${pickedNotes.length} 篇原文链接`}</Text>
              <ChevronRight size={16} color="#64748b" />
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={sourcesOpen} transparent animationType="slide" onRequestClose={() => setSourcesOpen(false)}>
        <View style={styles.sheetMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSourcesOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>本期收录内容</Text>
            <Text style={styles.sheetDesc}>点击任意条目，跳转到原文笔记继续阅读。</Text>

            {pickedNotes.map((note) => (
              <Pressable
                key={note.id}
                style={styles.sourceRow}
                onPress={() => {
                  setSourcesOpen(false);
                  onNavigate('document', note.id);
                }}
              >
                <View style={styles.sourceRowIcon}>
                  <BookOpen size={16} color="#1d4ed8" />
                </View>
                <View style={styles.sourceRowBody}>
                  <Text numberOfLines={2} style={styles.sourceRowTitle}>{note.title}</Text>
                  <Text style={styles.sourceRowMeta}>{dateLabel}</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf5' },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIconText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  refreshPill: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  refreshPillText: { fontSize: 13, color: '#44403c', fontWeight: '700' },
  title: { marginTop: 18, fontSize: 30, lineHeight: 36, color: '#0f172a', fontWeight: '900' },
  meta: { marginTop: 8, fontSize: 14, color: '#64748b', fontWeight: '600' },
  stateRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateText: { fontSize: 12, lineHeight: 18, color: '#64748b', fontWeight: '600' },
  loadingCard: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: { fontSize: 18, color: '#111827', fontWeight: '800' },
  loadingDesc: { fontSize: 13, lineHeight: 20, color: '#64748b', textAlign: 'center' },
  errorCard: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  errorTitle: { fontSize: 18, color: '#9a3412', fontWeight: '800' },
  errorDesc: { fontSize: 13, lineHeight: 20, color: '#9a3412' },
  retryBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  retryBtnText: { fontSize: 14, color: 'white', fontWeight: '800' },
  summaryBlock: {
    marginTop: 22,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  analysisBlock: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionEyebrow: { fontSize: 13, color: '#78716c', fontWeight: '800' },
  summaryText: { marginTop: 8, fontSize: 17, lineHeight: 28, color: '#292524' },
  summarySub: { marginTop: 8, fontSize: 14, lineHeight: 22, color: '#57534e' },
  bulletRow: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start' },
  bulletIndex: { fontSize: 16, color: '#a16207', fontWeight: '800', width: 28 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 24, color: '#1f2937' },
  sectionCard: {
    marginTop: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionIndex: { fontSize: 16, color: '#a16207', fontWeight: '800', width: 28 },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: 16, lineHeight: 22, color: '#111827', fontWeight: '700' },
  sectionInsight: { marginTop: 8, fontSize: 14, lineHeight: 22, color: '#1f2937' },
  sectionAction: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#78716c' },
  sourcesBtn: {
    marginTop: 18,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sourcesBtnText: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  sheetMask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.24)' },
  sheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    minHeight: 320,
  },
  sheetHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 999, backgroundColor: '#e7e5e4' },
  sheetTitle: { marginTop: 14, fontSize: 22, color: '#111827', fontWeight: '900' },
  sheetDesc: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  sourceRow: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ede7da',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceRowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  sourceRowBody: { flex: 1 },
  sourceRowTitle: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '700' },
  sourceRowMeta: { marginTop: 3, fontSize: 12, color: '#94a3b8' },
  emptyWrap: { flex: 1, backgroundColor: '#fcfaf5', paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#111827', fontWeight: '900' },
  emptyDesc: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' },
  backBtn: {
    marginTop: 18,
    height: 44,
    minWidth: 120,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backBtnText: { fontSize: 14, color: 'white', fontWeight: '800' },
});
