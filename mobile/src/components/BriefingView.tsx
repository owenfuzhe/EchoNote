import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, BookOpen, ChevronRight, Link2, RefreshCw } from 'lucide-react-native';
import { generateBriefing, getCachedBriefing, type BriefingArtifact } from '../services/ai-actions';
import { getBriefingNotes } from '../services/briefing';
import { useNoteStore } from '../store/noteStore';
import { mobileType } from '../theme/typography';
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

        <Text style={styles.eyebrow}>本期简报</Text>

        {!artifact && briefingState.loading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator size="small" color="#334155" />
            <View style={styles.statusBody}>
              <Text style={styles.statusTitle}>正在生成本期简报</Text>
              <Text style={styles.statusDesc}>{briefingState.statusLabel || '把多篇内容收束成一页可回看的判断。'}</Text>
            </View>
          </View>
        ) : null}

        {!artifact && briefingState.error ? (
          <View style={styles.errorCard}>
            <View style={styles.statusBody}>
              <Text style={styles.errorTitle}>这次生成没有成功</Text>
              <Text style={styles.errorDesc}>{briefingState.error}</Text>
            </View>
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

            <View style={styles.introBlock}>
              <Text style={styles.sectionLabel}>一句话判断</Text>
              <Text style={styles.introLead}>{data?.oneLiner || data?.summary || '本期内容已经整理完成。'}</Text>
              {data?.summary && data.summary !== data.oneLiner ? <Text style={styles.introBody}>{data.summary}</Text> : null}
            </View>

            {!!data?.bullets?.length && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>关键信号</Text>
                {data.bullets.map((bullet, index) => (
                  <View key={`${index}-${bullet.slice(0, 12)}`} style={[styles.signalRow, index > 0 && styles.rowDivider]}>
                    <Text style={styles.signalIndex}>{`${String(index + 1).padStart(2, '0')}`}</Text>
                    <Text style={styles.signalText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!data?.sections?.length && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>展开阅读</Text>
                {(data?.sections?.length ? data.sections : []).map((section, index) => (
                  <View key={section.id} style={[styles.detailRow, index > 0 && styles.rowDivider]}>
                    <View style={styles.detailHead}>
                      <Text style={styles.detailIndex}>{`${String(index + 1).padStart(2, '0')}`}</Text>
                      <Text style={styles.detailTitle}>{section.title}</Text>
                    </View>
                    <Text style={styles.detailSummary}>{section.summary}</Text>
                    <Text style={styles.detailKeyPoint}>{section.keyPoint}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={styles.sourcesBtn} onPress={() => setSourcesOpen(true)}>
              <View style={styles.sourcesLeft}>
                <Link2 size={15} color="#0f172a" />
                <View>
                  <Text style={styles.sourcesBtnText}>{`${pickedNotes.length} 篇原文来源`}</Text>
                  <Text style={styles.sourcesBtnMeta}>打开原文笔记，继续阅读上下文。</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
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
                  <Text style={styles.sourceRowMeta}>{formatDateLabel(note.updatedAt || note.createdAt)}</Text>
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
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIconText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  refreshPill: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#f7f4ee',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ece7dd',
  },
  refreshPillText: { fontSize: 13, color: '#44403c', fontWeight: '700' },
  eyebrow: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 16,
    color: '#8b7d6b',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: { ...mobileType.screenTitle, marginTop: 10, fontSize: 32, lineHeight: 38 },
  meta: { marginTop: 10, fontSize: 13, lineHeight: 18, color: '#7c8798' },
  stateRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateText: { fontSize: 12, lineHeight: 18, color: '#64748b', fontWeight: '600' },
  statusCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede7da',
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBody: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 16, color: '#111827', fontWeight: '800' },
  statusDesc: { fontSize: 13, lineHeight: 20, color: '#64748b' },
  errorCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorTitle: { fontSize: 16, color: '#9a3412', fontWeight: '800' },
  errorDesc: { fontSize: 13, lineHeight: 20, color: '#9a3412' },
  retryBtn: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  retryBtnText: { fontSize: 14, color: 'white', fontWeight: '800' },
  introBlock: {
    marginTop: 24,
    paddingTop: 18,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#ece7dd',
  },
  sectionBlock: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#ece7dd',
  },
  sectionLabel: { fontSize: 12, lineHeight: 16, color: '#8b7d6b', fontWeight: '700', letterSpacing: 0.4 },
  introLead: { marginTop: 10, fontSize: 22, lineHeight: 33, color: '#171717', fontWeight: '600', letterSpacing: -0.2 },
  introBody: { marginTop: 12, fontSize: 15, lineHeight: 24, color: '#475569' },
  signalRow: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#f1ece3' },
  signalIndex: {
    width: 24,
    fontSize: 12,
    lineHeight: 18,
    color: '#9a8c78',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  signalText: { flex: 1, fontSize: 16, lineHeight: 25, color: '#1f2937' },
  detailRow: { paddingVertical: 16 },
  detailHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  detailIndex: { fontSize: 12, lineHeight: 18, color: '#9a8c78', fontWeight: '800' },
  detailTitle: { flex: 1, fontSize: 18, lineHeight: 24, color: '#111827', fontWeight: '700' },
  detailSummary: { marginTop: 8, fontSize: 15, lineHeight: 24, color: '#1f2937' },
  detailKeyPoint: { marginTop: 8, fontSize: 13, lineHeight: 21, color: '#64748b' },
  sourcesBtn: {
    marginTop: 24,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ede7da',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    gap: 10,
  },
  sourcesLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sourcesBtnText: { fontSize: 14, lineHeight: 20, color: '#0f172a', fontWeight: '700' },
  sourcesBtnMeta: { marginTop: 2, fontSize: 12, lineHeight: 17, color: '#94a3b8' },
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
