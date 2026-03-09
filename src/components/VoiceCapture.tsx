import { useEffect, useRef, useState, useCallback } from "react";
import { X, Infinity, Mic, Square, Loader2 } from "lucide-react";

interface VoiceCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete: (text: string) => void;
}

// 定义 Web Speech API 类型
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export default function VoiceCapture({
  isOpen,
  onClose,
  onTranscriptionComplete,
}: VoiceCaptureProps) {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0.5);
  const [isAgentMode, setIsAgentMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number>(0);
  const isLongPressRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef("");

  // 初始化语音识别
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("您的浏览器不支持语音识别功能");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setError("语音识别出错，请重试");
      }
    };

    recognition.onend = () => {
      // 如果不是手动停止，自动重启
      if (isListening && !isAgentMode) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    return recognition;
  }, [isListening, isAgentMode]);

  // 初始化音频分析器（用于音量可视化）
  const initAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // 开始音量检测循环
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const detectVolume = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedVolume = Math.min(average / 128, 1);
        setVolumeLevel(normalizedVolume);

        animationFrameRef.current = requestAnimationFrame(detectVolume);
      };
      detectVolume();
    } catch (err) {
      console.error("Audio analyser error:", err);
    }
  }, []);

  // 开始录音
  const startListening = useCallback(async () => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setIsAgentMode(false);

    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
        await initAudioAnalyser();
      } catch (err) {
        console.error("Start recognition error:", err);
        setError("无法启动语音识别");
      }
    }
  }, [initSpeechRecognition, initAudioAnalyser]);

  // 停止录音
  const stopListening = useCallback(() => {
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 忽略停止错误
      }
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // 处理录音完成
  const handleComplete = useCallback(() => {
    stopListening();
    const finalText = finalTranscriptRef.current || transcript;
    if (finalText.trim()) {
      onTranscriptionComplete(finalText.trim());
    } else {
      onClose();
    }
  }, [stopListening, transcript, onTranscriptionComplete, onClose]);

  // 处理 Agent 模式（上滑触发）
  const handleAgentTrigger = useCallback(() => {
    stopListening();
    setIsAgentMode(true);
    const finalText = finalTranscriptRef.current || transcript;

    // TODO: 调用 Agent API 执行操作
    console.log("Agent mode triggered with:", finalText);

    // 这里可以调用 Agent 执行逻辑
    // 暂时直接关闭
    setTimeout(() => {
      onClose();
    }, 500);
  }, [stopListening, transcript, onClose]);

  // 触摸/鼠标事件处理（支持上滑手势）
  const handleTouchStart = useCallback((e: TouchEvent | MouseEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    touchStartYRef.current = clientY;
    isLongPressRef.current = false;

    // 长按检测
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
    }, 200);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isListening) return;

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = touchStartYRef.current - clientY;

    // 上滑超过 100px 触发 Agent 模式
    if (deltaY > 100 && isLongPressRef.current) {
      handleAgentTrigger();
    }
  }, [isListening, handleAgentTrigger]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 如果不是上滑触发 Agent，则正常结束录音
    if (isListening && !isAgentMode) {
      handleComplete();
    }
  }, [isListening, isAgentMode, handleComplete]);

  // 组件打开时开始录音
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [isOpen, startListening, stopListening]);

  if (!isOpen) return null;

  // 计算脉冲圆环的动画参数
  const baseScale = 1 + volumeLevel * 0.3;
  const ring1Scale = baseScale;
  const ring2Scale = baseScale * 1.15;
  const ring3Scale = baseScale * 1.3;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xl flex flex-col">
      {/* 关闭按钮 */}
      <button
        onClick={() => {
          stopListening();
          onClose();
        }}
        className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors z-10"
      >
        <X size={20} />
      </button>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* 能量球动画区域 */}
        <div
          className="relative w-64 h-64 flex items-center justify-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          {/* 最外层脉冲圆环 */}
          <div
            className="absolute rounded-full border border-teal-400/20 transition-transform duration-100"
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${ring3Scale})`,
              animationDelay: "0ms",
            }}
          />

          {/* 中间层脉冲圆环 */}
          <div
            className="absolute rounded-full border border-teal-400/30 transition-transform duration-100"
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${ring2Scale})`,
              animationDelay: "200ms",
            }}
          />

          {/* 内层脉冲圆环 */}
          <div
            className="absolute rounded-full border border-teal-400/40 transition-transform duration-100"
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${ring1Scale})`,
              animationDelay: "400ms",
            }}
          />

          {/* 核心能量球 */}
          <div
            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_0_60px_rgba(20,184,166,0.5)] transition-transform duration-100"
            style={{
              transform: `scale(${0.9 + volumeLevel * 0.2})`,
            }}
          >
            {/* 内部光晕 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/20 to-transparent" />

            {/* ♾️ 图标 */}
            <Infinity
              size={48}
              className="text-white relative z-10"
              strokeWidth={2.5}
            />
          </div>

          {/* 动态波纹效果 */}
          <div
            className="absolute rounded-full bg-teal-400/10 animate-ping"
            style={{
              width: "100%",
              height: "100%",
              animationDuration: "2s",
            }}
          />
        </div>

        {/* 实时转文字区域 */}
        <div className="mt-12 px-8 w-full max-w-md text-center">
          {/* 状态提示 */}
          <p className="text-white/60 text-sm font-medium mb-4 tracking-wide">
            {isListening ? "正在倾听..." : error ? "识别失败" : "准备就绪"}
          </p>

          {/* 转录文字显示 */}
          <div className="min-h-[80px] flex items-center justify-center">
            {error ? (
              <p className="text-red-400 text-base">{error}</p>
            ) : (
              <p className="text-white text-xl font-medium leading-relaxed">
                {transcript || interimTranscript ? (
                  <>
                    <span>{transcript}</span>
                    <span className="text-white/50">{interimTranscript}</span>
                  </>
                ) : (
                  <span className="text-white/30">说出你的想法...</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作提示 */}
      <div className="pb-16 pt-8 text-center">
        <p className="text-white/50 text-sm font-medium">
          <span className="text-white/70">[ 松开结束 ]</span>
          <span className="mx-3 text-white/30">|</span>
          <span className="text-teal-400/80">[ 划向上方由 AI 执行 ]</span>
        </p>
      </div>
    </div>
  );
}
