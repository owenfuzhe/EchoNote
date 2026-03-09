/**
 * 播客生成服务 - 使用 Web Speech API
 * 将笔记内容转换为音频播客
 */

// 生成状态回调类型
export type GenerationProgressCallback = (progress: number, status: string) => void;

// 播客元数据
export interface PodcastMetadata {
  id: string;
  noteId: string;
  title: string;
  createdAt: string;
  duration: number; // 预估时长（秒）
  voice: string;
}

// 播放状态
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

// 播放控制回调
export interface PlaybackCallbacks {
  onStateChange?: (state: PlaybackState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

// 音色选项
export const VOICE_OPTIONS = [
  { id: 'default', name: '系统默认', lang: 'zh-CN' },
  { id: 'female', name: '温柔女声', lang: 'zh-CN', pitch: 1.1, rate: 0.95 },
  { id: 'male', name: '专业男声', lang: 'zh-CN', pitch: 0.9, rate: 0.95 },
  { id: 'fast', name: '快速朗读', lang: 'zh-CN', rate: 1.3 },
];

// 存储键
const PODCAST_STORAGE_KEY = 'echonote_podcasts';

/**
 * 生成播客
 * @param noteId - 笔记ID
 * @param noteContent - 笔记内容
 * @param voiceId - 音色ID
 * @param onProgress - 进度回调
 * @returns Promise<Blob> - 音频Blob
 */
export async function generatePodcast(
  noteId: string,
  noteContent: string,
  voiceId: string = 'default',
  onProgress?: GenerationProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 检查 Web Speech API 支持
    if (!('speechSynthesis' in window)) {
      reject(new Error('您的浏览器不支持语音合成功能'));
      return;
    }

    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();

    // 获取选中的音色配置
    const voiceConfig = VOICE_OPTIONS.find(v => v.id === voiceId) || VOICE_OPTIONS[0];

    // 准备文本内容（清理Markdown等格式）
    const cleanText = cleanNoteContent(noteContent);
    const chunks = splitTextIntoChunks(cleanText, 200); // 每段200字符

    // 创建音频上下文用于录制
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      reject(new Error('您的浏览器不支持音频录制'));
      return;
    }

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(destination.stream);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // 保存播客元数据
      savePodcastMetadata({
        id: generatePodcastId(),
        noteId,
        title: `播客: ${cleanText.slice(0, 30)}...`,
        createdAt: new Date().toISOString(),
        duration: estimateDuration(cleanText),
        voice: voiceId,
      });

      audioContext.close();
      resolve(audioBlob);
    };

    // 开始录制
    mediaRecorder.start();

    // 分段朗读并报告进度
    let currentChunk = 0;

    const speakNextChunk = () => {
      if (currentChunk >= chunks.length) {
        mediaRecorder.stop();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
      utterance.lang = voiceConfig.lang;
      utterance.pitch = voiceConfig.pitch ?? 1;
      utterance.rate = voiceConfig.rate ?? 1;

      // 选择合适的语音
      const voice = voices.find(v => v.lang.includes('zh')) || voices[0];
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        currentChunk++;
        const progress = Math.round((currentChunk / chunks.length) * 100);
        onProgress?.(progress, `正在生成... ${progress}%`);
        speakNextChunk();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        // 继续下一段，不中断
        currentChunk++;
        speakNextChunk();
      };

      synthesis.speak(utterance);
    };

    // 报告开始
    onProgress?.(0, '准备生成...');

    // 延迟开始，确保录制器已准备好
    setTimeout(() => {
      speakNextChunk();
    }, 100);
  });
}

/**
 * 模拟生成播客（用于演示或当 Web Speech API 不可用时）
 */
export async function generatePodcastMock(
  noteId: string,
  noteContent: string,
  voiceId: string = 'default',
  onProgress?: GenerationProgressCallback
): Promise<Blob> {
  return new Promise((resolve) => {
    let progress = 0;

    const interval = setInterval(() => {
      progress += 10;
      onProgress?.(progress, `正在生成... ${progress}%`);

      if (progress >= 100) {
        clearInterval(interval);

        // 创建一个静音的音频Blob作为模拟
        const audioBlob = new Blob(['mock-audio-data'], { type: 'audio/webm' });

        // 保存播客元数据
        const cleanText = cleanNoteContent(noteContent);
        savePodcastMetadata({
          id: generatePodcastId(),
          noteId,
          title: `播客: ${cleanText.slice(0, 30)}...`,
          createdAt: new Date().toISOString(),
          duration: estimateDuration(cleanText),
          voice: voiceId,
        });

        resolve(audioBlob);
      }
    }, 300);
  });
}

/**
 * 获取播客URL
 * @param podcastId - 播客ID
 * @returns string - 播客URL（这里返回的是数据存储的key，实际使用时需要配合音频Blob）
 */
export function getPodcastUrl(podcastId: string): string {
  return `podcast://${podcastId}`;
}

/**
 * 创建播客播放器控制器
 */
export class PodcastPlayer {
  private audio: HTMLAudioElement | null = null;
  private callbacks: PlaybackCallbacks = {};
  private playbackState: PlaybackState = 'idle';

  constructor(audioBlob?: Blob) {
    if (audioBlob) {
      this.load(audioBlob);
    }
  }

  /**
   * 加载音频
   */
  load(audioBlob: Blob) {
    this.cleanup();
    const url = URL.createObjectURL(audioBlob);
    this.audio = new Audio(url);
    this.setupEventListeners();
  }

  /**
   * 播放
   */
  play(): boolean {
    if (!this.audio) return false;

    this.audio.play().then(() => {
      this.updateState('playing');
    }).catch((err) => {
      this.callbacks.onError?.(err.message);
    });

    return true;
  }

  /**
   * 暂停
   */
  pause(): boolean {
    if (!this.audio) return false;
    this.audio.pause();
    this.updateState('paused');
    return true;
  }

  /**
   * 跳转到指定时间
   */
  seek(time: number): boolean {
    if (!this.audio) return false;
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
    return true;
  }

  /**
   * 设置播放速度
   */
  setPlaybackRate(rate: number): boolean {
    if (!this.audio) return false;
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    return true;
  }

  /**
   * 获取当前播放状态
   */
  getState(): PlaybackState {
    return this.playbackState;
  }

  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  /**
   * 获取总时长
   */
  getDuration(): number {
    return this.audio?.duration || 0;
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: PlaybackCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.playbackState = 'idle';
  }

  private setupEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate?.(this.audio!.currentTime, this.audio!.duration || 0);
    });

    this.audio.addEventListener('ended', () => {
      this.updateState('ended');
      this.callbacks.onEnded?.();
    });

    this.audio.addEventListener('error', (e) => {
      this.callbacks.onError?.('音频播放出错');
    });
  }

  private updateState(state: PlaybackState) {
    this.playbackState = state;
    this.callbacks.onStateChange?.(state);
  }
}

/**
 * 获取所有播客元数据
 */
export function getAllPodcasts(): PodcastMetadata[] {
  try {
    const data = localStorage.getItem(PODCAST_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 获取笔记对应的播客
 */
export function getPodcastByNoteId(noteId: string): PodcastMetadata | undefined {
  const podcasts = getAllPodcasts();
  return podcasts.find(p => p.noteId === noteId);
}

// ===== 辅助函数 =====

function cleanNoteContent(content: string): string {
  return content
    .replace(/#{1,6}\s/g, '') // 移除Markdown标题
    .replace(/\*\*|__/g, '') // 移除粗体
    .replace(/\*|_/g, '') // 移除斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // 移除代码块
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 转换链接为纯文本
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // 移除图片
    .replace(/\n{3,}/g, '\n\n') // 规范化空行
    .trim();
}

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/([。！？.!?]\s*)/);
  let currentChunk = '';

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '');

    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function estimateDuration(text: string): number {
  // 假设平均每分钟200个中文字符
  const charCount = text.length;
  return Math.ceil(charCount / 200 * 60);
}

function generatePodcastId(): string {
  return `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function savePodcastMetadata(metadata: PodcastMetadata) {
  const podcasts = getAllPodcasts();
  // 移除同一笔记的旧播客
  const filtered = podcasts.filter(p => p.noteId !== metadata.noteId);
  filtered.unshift(metadata);
  localStorage.setItem(PODCAST_STORAGE_KEY, JSON.stringify(filtered.slice(0, 50))); // 最多保存50个
}
