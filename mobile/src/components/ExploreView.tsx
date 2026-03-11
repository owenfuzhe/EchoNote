import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Compass, Globe, Link2, Loader, Pause, Play, Plus, Search } from 'lucide-react-native';
import { NoteRelation, getLocalNoteRelations } from '../services/note-relations';
import { PodcastTTSPlayer, VOICE_OPTIONS, generatePodcastMock, getPodcastByNoteId } from '../services/podcast';
import { searchWeb } from '../services/search';
import { getTemplateContent, recommendTemplates, recordTemplateUsage } from '../services/template-recommender';
import { useNoteStore } from '../store/noteStore';
import { AppView, Note } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
}

interface SkillItem {
  id: 'web-search' | 'podcast' | 'code';
  name: string;
  desc: string;
  color: string;
  disabled?: boolean;
}

type PodcastStep = 'select' | 'voice' | 'generating' | 'player';

const SKILLS: SkillItem[] = [
  { id: 'web-search', name: '联网搜索', desc: '搜索全网并整理为笔记', color: '#2563eb' },
  { id: 'podcast', name: '播客生成', desc: '将笔记转为音频', color: '#7c3aed' },
  { id: 'code', name: '执行代码', desc: '运行笔记代码片段', color: '#16a34a', disabled: true },
];

export default function ExploreView({ onNavigate }: Props) {
  const { notes, createNote } = useNoteStore();
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [relations, setRelations] = useState<NoteRelation[]>([]);

  const [podcastStep, setPodcastStep] = useState<PodcastStep>('select');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('female');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [player, setPlayer] = useState<PodcastTTSPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const templates = useMemo(() => recommendTemplates(notes, 3), [notes]);

  useEffect(() => {
    if (notes.length < 2) {
      setRelations([]);
      return;
    }
    const all = notes.slice(0, 3).flatMap((n) => getLocalNoteRelations(notes, n.id, 2));
    const unique = new Map<string, NoteRelation>();
    all.forEach((r) => unique.set(`${r.sourceNoteId}-${r.targetNoteId}`, r));
    setRelations(Array.from(unique.values()).sort((a, b) => b.similarity - a.similarity).slice(0, 6));
  }, [notes]);

  useEffect(() => {
    return () => {
      player?.cleanup();
    };
  }, [player]);

  const onSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      const result = await searchWeb(query.trim());
      if (!result.length) {
        Alert.alert('无结果', '未找到相关结果，请尝试其他关键词');
        return;
      }
      const content = [
        `# 联网搜索：${query}`,
        `> 搜索时间：${new Date().toLocaleString('zh-CN')}`,
        '',
        ...result.slice(0, 8).map((r, i) => `## ${i + 1}. ${r.title}\n\n${r.content}\n\n🔗 ${r.url}\n来源：${r.source}`),
      ].join('\n\n');
      const noteId = await createNote({ title: `搜索: ${query}`, content, type: 'ai', tags: ['搜索', '联网'] });
      setQuery('');
      setActiveSkill(null);
      onNavigate('document', noteId);
    } catch (e: any) {
      Alert.alert('搜索失败', e?.message || '请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  const openPodcast = () => {
    setActiveSkill('podcast');
    setPodcastStep('select');
    setSelectedNote(null);
    setProgress(0);
    setProgressText('');
  };

  const selectNoteForPodcast = async (note: Note) => {
    setSelectedNote(note);
    const existed = await getPodcastByNoteId(note.id);
    if (existed) {
      const p = new PodcastTTSPlayer(note.content, existed.duration, existed.voice);
      p.setCallbacks({
        onStateChange: (state) => setPlaying(state === 'playing'),
        onTimeUpdate: (time, dur) => {
          setCurrentTime(time);
          setDuration(dur);
        },
        onEnded: () => setPlaying(false),
      });
      setPlayer((old) => {
        old?.cleanup();
        return p;
      });
      setDuration(existed.duration);
      setCurrentTime(0);
      setSpeed(1);
      setPodcastStep('player');
      return;
    }
    setPodcastStep('voice');
  };

  const startGeneratePodcast = async () => {
    if (!selectedNote) return;
    setPodcastStep('generating');
    setProgress(0);
    setProgressText('准备生成...');
    try {
      const meta = await generatePodcastMock(selectedNote.id, selectedNote.title, selectedNote.content, selectedVoice, (p, s) => {
        setProgress(p);
        setProgressText(s);
      });
      const p = new PodcastTTSPlayer(selectedNote.content, meta.duration, selectedVoice);
      p.setCallbacks({
        onStateChange: (state) => setPlaying(state === 'playing'),
        onTimeUpdate: (time, dur) => {
          setCurrentTime(time);
          setDuration(dur);
        },
        onEnded: () => setPlaying(false),
      });
      setPlayer((old) => {
        old?.cleanup();
        return p;
      });
      setDuration(meta.duration);
      setCurrentTime(0);
      setSpeed(1);
      setPodcastStep('player');
    } catch (e: any) {
      Alert.alert('生成失败', e?.message || '请稍后重试');
      setPodcastStep('voice');
    }
  };

  const togglePlay = () => {
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  };

  const changeSpeed = () => {
    if (!player) return;
    const speedList = [0.75, 1, 1.25, 1.5, 2];
    const idx = speedList.indexOf(speed);
    const next = speedList[(idx + 1) % speedList.length];
    setSpeed(next);
    player.setPlaybackRate(next);
  };

  const seekBy = (delta: number) => {
    if (!player) return;
    player.seek(currentTime + delta);
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const left = s % 60;
    return `${m}:${left.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={styles.header}><Text style={styles.h1}>探索</Text><Compass size={20} color="#4b5563" /></View>

      <Text style={styles.secTitle}>技能中心</Text>
      <View style={styles.grid}>
        {SKILLS.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.skillCard, s.disabled && styles.skillDisabled]}
            onPress={() => {
              if (s.disabled) return;
              if (s.id === 'podcast') openPodcast();
              else setActiveSkill(s.id);
            }}
            disabled={!!s.disabled}
          >
            <View style={[styles.skillDot, { backgroundColor: `${s.color}20` }]}><Globe size={18} color={s.color} /></View>
            <Text style={styles.skillName}>{s.name}</Text>
            <Text style={styles.skillDesc}>{s.desc}</Text>
            {s.disabled ? <Text style={styles.coming}>即将上线</Text> : null}
          </Pressable>
        ))}
      </View>

      {activeSkill === 'web-search' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>联网搜索</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="输入关键词..." style={styles.searchInput} />
          <Pressable style={[styles.searchBtn, (!query.trim() || searching) && styles.searchBtnDisabled]} onPress={onSearch} disabled={!query.trim() || searching}>
            {searching ? <Loader size={16} color="white" /> : <Search size={16} color="white" />}
            <Text style={styles.searchBtnText}>{searching ? '搜索中...' : '开始搜索'}</Text>
          </Pressable>
        </View>
      )}

      {activeSkill === 'podcast' && (
        <View style={styles.panel}>
          {podcastStep === 'select' && (
            <>
              <Text style={styles.panelTitle}>播客生成 · 选择笔记</Text>
              {notes.length === 0 ? (
                <Text style={styles.hint}>暂无笔记，请先创建笔记</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {notes.slice(0, 10).map((note) => (
                    <Pressable key={note.id} style={styles.noteItem} onPress={() => selectNoteForPodcast(note)}>
                      <Text numberOfLines={1} style={styles.noteTitle}>{note.title || '无标题'}</Text>
                      <Text numberOfLines={2} style={styles.noteSub}>{note.content.replace(/#{1,6}\s/g, '').slice(0, 80)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}

          {podcastStep === 'voice' && selectedNote && (
            <>
              <Text style={styles.panelTitle}>选择音色</Text>
              <Text style={styles.hint}>{selectedNote.title}</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {VOICE_OPTIONS.map((v) => (
                  <Pressable key={v.id} onPress={() => setSelectedVoice(v.id)} style={[styles.voiceItem, selectedVoice === v.id && styles.voiceItemActive]}>
                    <Text style={styles.voiceText}>{v.name}</Text>
                    {selectedVoice === v.id ? <Check size={14} color="#7c3aed" /> : null}
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.searchBtn, { marginTop: 12, backgroundColor: '#7c3aed' }]} onPress={startGeneratePodcast}>
                <Text style={styles.searchBtnText}>开始生成</Text>
              </Pressable>
            </>
          )}

          {podcastStep === 'generating' && (
            <>
              <Text style={styles.panelTitle}>正在生成播客</Text>
              <Text style={styles.hint}>{progressText}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={[styles.hint, { marginTop: 8 }]}>{progress}%</Text>
            </>
          )}

          {podcastStep === 'player' && selectedNote && (
            <>
              <Text style={styles.panelTitle}>播客播放器</Text>
              <Text style={styles.hint}>{selectedNote.title}</Text>
              <View style={styles.playerCard}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${duration ? (currentTime / duration) * 100 : 0}%` }]} />
                </View>
                <View style={styles.timeRow}><Text style={styles.hint}>{formatTime(currentTime)}</Text><Text style={styles.hint}>{formatTime(duration)}</Text></View>
                <View style={styles.playerActions}>
                  <Pressable style={styles.ctrlBtn} onPress={() => seekBy(-15)}><Text style={styles.ctrlTxt}>-15s</Text></Pressable>
                  <Pressable style={styles.playBtn} onPress={togglePlay}>{playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" />}</Pressable>
                  <Pressable style={styles.ctrlBtn} onPress={() => seekBy(15)}><Text style={styles.ctrlTxt}>+15s</Text></Pressable>
                </View>
                <Pressable style={styles.speedBtn} onPress={changeSpeed}><Text style={styles.ctrlTxt}>{speed}x</Text></Pressable>
              </View>
            </>
          )}
        </View>
      )}

      <View style={[styles.rowHead, { marginTop: 22 }]}>
        <Text style={styles.secTitle}>推荐模板</Text>
        <Text style={styles.hint}>基于最近笔记</Text>
      </View>
      <View style={{ gap: 8 }}>
        {templates.map((rec) => (
          <Pressable
            key={rec.template.id}
            style={styles.templateCard}
            onPress={async () => {
              await recordTemplateUsage(rec.template.id);
              const noteId = await createNote({
                title: rec.template.name,
                content: getTemplateContent(rec.template),
                type: 'text',
                tags: ['模板'],
              });
              onNavigate('document', noteId);
            }}
          >
            <Text style={styles.templateIcon}>{rec.template.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.templateName}>{rec.template.name}</Text>
              <Text style={styles.templateReason}>{rec.reason}</Text>
            </View>
            <Text style={styles.score}>{rec.score}%</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.rowHead, { marginTop: 22 }]}>
        <Text style={styles.secTitle}>关联发现</Text>
        <Text style={styles.hint}>{relations.length} 个关联</Text>
      </View>
      {relations.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Link2 size={24} color="#9ca3af" />
          <Text style={styles.emptyText}>笔记数量不足，暂无法发现关联</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {relations.map((r) => (
            <View key={`${r.sourceNoteId}-${r.targetNoteId}`} style={styles.relCard}>
              <View style={styles.simTrack}><View style={[styles.simBar, { width: `${r.similarity}%` }]} /></View>
              <Text style={styles.relTitle}>{r.sourceTitle} ↔ {r.targetTitle}</Text>
              <Text style={styles.relReason}>{r.reason}</Text>
              <Pressable style={styles.relBtn} onPress={() => onNavigate('document', r.targetNoteId)}>
                <Plus size={14} color="#2563eb" />
                <Text style={styles.relBtnText}>查看笔记</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 14, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { fontSize: 20, fontWeight: '700', color: '#111827' },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  grid: { marginTop: 10, flexDirection: 'row', gap: 8 },
  skillCard: { flex: 1, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 10 },
  skillDisabled: { opacity: 0.55 },
  skillDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  skillName: { marginTop: 8, fontWeight: '700', color: '#111827' },
  skillDesc: { marginTop: 4, fontSize: 12, color: '#6b7280', minHeight: 32 },
  coming: { marginTop: 6, alignSelf: 'flex-start', fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  panel: { marginTop: 12, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, gap: 10 },
  panelTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  searchInput: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#111827' },
  searchBtn: { height: 40, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  searchBtnDisabled: { backgroundColor: '#93c5fd' },
  searchBtnText: { color: 'white', fontWeight: '600' },
  rowHead: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { fontSize: 12, color: '#9ca3af' },
  templateCard: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  templateIcon: { fontSize: 22 },
  templateName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  templateReason: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  score: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  emptyWrap: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: '#6b7280', fontSize: 13 },
  relCard: { backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 10 },
  simTrack: { height: 5, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  simBar: { height: 5, backgroundColor: '#7c3aed' },
  relTitle: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#111827' },
  relReason: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  relBtn: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  relBtnText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
  noteItem: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 10 },
  noteTitle: { color: '#111827', fontWeight: '600' },
  noteSub: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  voiceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  voiceItemActive: { borderColor: '#c4b5fd', backgroundColor: '#f5f3ff' },
  voiceText: { color: '#111827', fontWeight: '500' },
  progressTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: '#7c3aed' },
  playerCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  timeRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  playerActions: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctrlBtn: { minWidth: 62, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  ctrlTxt: { color: '#374151', fontWeight: '600' },
  speedBtn: { marginTop: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e5e7eb' },
});
