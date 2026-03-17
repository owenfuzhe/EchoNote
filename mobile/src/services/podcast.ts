import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { richTextToPlainText } from '../utils/richText';

export type GenerationProgressCallback = (progress: number, status: string) => void;

export interface PodcastMetadata {
  id: string;
  noteId: string;
  title: string;
  createdAt: string;
  duration: number;
  voice: string;
  engine: 'tts';
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

export interface PlaybackCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export const VOICE_OPTIONS = [
  { id: 'default', name: '系统默认' },
  { id: 'female', name: '温柔女声' },
  { id: 'male', name: '专业男声' },
  { id: 'fast', name: '快速朗读' },
] as const;

const PODCAST_STORAGE_KEY = 'echonote_podcasts_mobile';

function genId() {
  return `podcast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanText(content: string): string {
  return richTextToPlainText(content)
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function estimateDuration(text: string, voiceId: string): number {
  const chars = Math.max(text.length, 120);
  const charsPerSecond = voiceId === 'fast' ? 8.2 : voiceId === 'male' ? 6.4 : voiceId === 'female' ? 5.8 : 6.8;
  return Math.max(20, Math.ceil(chars / charsPerSecond));
}

function clampRate(rate: number): number {
  return Math.max(0.6, Math.min(2, rate));
}

function toSpeechRate(rate: number): number {
  return clampRate(rate);
}

function buildSpeechOptions(voiceId: string, rate: number): Speech.SpeechOptions {
  const normalizedRate = toSpeechRate(rate);
  const base: Speech.SpeechOptions = {
    language: 'zh-CN',
    rate: normalizedRate,
    pitch: 1,
  };

  if (voiceId === 'female') {
    base.pitch = 1.15;
  } else if (voiceId === 'male') {
    base.pitch = 0.9;
  } else if (voiceId === 'fast') {
    base.rate = Math.min(2, Math.max(normalizedRate, 1.25));
    base.pitch = 1;
  }

  return base;
}

async function savePodcastMetadata(metadata: PodcastMetadata): Promise<void> {
  const podcasts = await getAllPodcasts();
  const filtered = podcasts.filter((p) => p.noteId !== metadata.noteId);
  const next = [metadata, ...filtered].slice(0, 80);
  await AsyncStorage.setItem(PODCAST_STORAGE_KEY, JSON.stringify(next));
}

export async function getAllPodcasts(): Promise<PodcastMetadata[]> {
  try {
    const raw = await AsyncStorage.getItem(PODCAST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getPodcastByNoteId(noteId: string): Promise<PodcastMetadata | undefined> {
  const list = await getAllPodcasts();
  return list.find((p) => p.noteId === noteId);
}

export async function generatePodcastMock(
  noteId: string,
  noteTitle: string,
  noteContent: string,
  voiceId: string = 'default',
  onProgress?: GenerationProgressCallback
): Promise<PodcastMetadata> {
  let progress = 0;
  while (progress < 100) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    progress = Math.min(100, progress + 10);
    onProgress?.(progress, progress >= 100 ? '处理完成' : `正在准备语音... ${progress}%`);
  }

  const text = cleanText(noteContent);
  const metadata: PodcastMetadata = {
    id: genId(),
    noteId,
    title: `播客: ${(noteTitle || text.slice(0, 20) || '未命名').slice(0, 30)}`,
    createdAt: new Date().toISOString(),
    duration: estimateDuration(text, voiceId),
    voice: voiceId,
    engine: 'tts',
  };

  await savePodcastMetadata(metadata);
  return metadata;
}

export class PodcastTTSPlayer {
  private text: string;
  private duration = 1;
  private currentTime = 0;
  private playbackRate = 1;
  private state: PlaybackState = 'idle';
  private callbacks: PlaybackCallbacks = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private startedFrom = 0;
  private stopReason: 'none' | 'pause' | 'seek' | 'rate' | 'cleanup' = 'none';
  private voiceId = 'default';

  constructor(content: string, duration: number, voiceId: string = 'default') {
    const cleaned = cleanText(content);
    this.text = cleaned.length ? cleaned : '这篇笔记暂无可朗读内容。';
    this.duration = Math.max(1, duration);
    this.voiceId = voiceId;
  }

  setCallbacks(callbacks: PlaybackCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getState() {
    return this.state;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = clampRate(rate);
    if (this.state === 'playing') {
      this.commitElapsed();
      this.stopReason = 'rate';
      this.stopSpeaking();
    }
  }

  seek(seconds: number) {
    const next = Math.max(0, Math.min(seconds, this.duration));
    this.currentTime = next;
    this.callbacks.onTimeUpdate?.(this.currentTime, this.duration);

    if (this.state === 'playing') {
      this.stopReason = 'seek';
      this.stopSpeaking();
    }
  }

  play() {
    if (this.state === 'playing') return;

    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
    }

    const startIndex = Math.floor((this.currentTime / this.duration) * this.text.length);
    const remainingText = this.text.slice(startIndex).trim();
    if (!remainingText) {
      this.finishPlayback();
      return;
    }

    this.stopReason = 'none';
    this.state = 'playing';
    this.startedFrom = this.currentTime;
    this.startedAt = Date.now();
    this.callbacks.onStateChange?.(this.state);
    this.startTicker();

    const speechOptions = buildSpeechOptions(this.voiceId, this.playbackRate);
    Speech.speak(remainingText, {
      ...speechOptions,
      onDone: () => {
        if (this.stopReason !== 'none') return;
        this.finishPlayback();
      },
      onStopped: () => {
        if (this.stopReason === 'seek' || this.stopReason === 'rate') {
          this.stopReason = 'none';
          this.play();
        }
      },
      onError: () => {
        if (this.stopReason !== 'none') return;
        this.pause();
      },
    });
  }

  pause() {
    if (this.state !== 'playing') return;
    this.commitElapsed();
    this.state = 'paused';
    this.callbacks.onStateChange?.(this.state);
    this.stopReason = 'pause';
    this.stopSpeaking();
  }

  cleanup() {
    this.stopReason = 'cleanup';
    this.stopSpeaking();
    this.state = 'idle';
    this.currentTime = 0;
    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onTimeUpdate?.(this.currentTime, this.duration);
  }

  private finishPlayback() {
    this.stopTicker();
    this.currentTime = this.duration;
    this.state = 'ended';
    this.callbacks.onTimeUpdate?.(this.currentTime, this.duration);
    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onEnded?.();
  }

  private startTicker() {
    this.stopTicker();
    this.timer = setInterval(() => {
      this.commitElapsed();
      this.callbacks.onTimeUpdate?.(this.currentTime, this.duration);
    }, 250);
  }

  private stopTicker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private commitElapsed() {
    if (!this.startedAt) return;
    const elapsed = (Date.now() - this.startedAt) / 1000;
    this.currentTime = Math.min(this.duration, this.startedFrom + elapsed);
  }

  private stopSpeaking() {
    this.stopTicker();
    Speech.stop();
  }
}
