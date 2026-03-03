'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  X,
  ChevronLeft,
  Check
} from 'lucide-react';
import Link from 'next/link';

// Waveform bar component
interface WaveformBarProps {
  isActive: boolean;
  delay: number;
  height: number;
}

function WaveformBar({ isActive, delay, height }: WaveformBarProps) {
  return (
    <div
      className={`w-1.5 rounded-full transition-all duration-150 ${
        isActive 
          ? 'bg-green-500 animate-pulse' 
          : 'bg-gray-300 dark:bg-zinc-600'
      }`}
      style={{
        height: isActive ? `${height}px` : '4px',
        animationDelay: `${delay}ms`,
        minHeight: '4px',
        maxHeight: '80px',
      }}
    />
  );
}

// Simulated waveform component
function AudioWaveform({ isRecording }: { isRecording: boolean }) {
  const [bars, setBars] = useState<number[]>(Array(32).fill(4));
  
  useEffect(() => {
    if (!isRecording) {
      setBars(Array(32).fill(4));
      return;
    }

    const interval = setInterval(() => {
      setBars(
        Array(32)
          .fill(0)
          .map(() => Math.random() * 60 + 10)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {bars.map((height, index) => (
        <WaveformBar
          key={index}
          isActive={isRecording}
          delay={index * 30}
          height={height}
        />
      ))}
    </div>
  );
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

type RecordingState = 'idle' | 'recording' | 'paused';

export default function RecordPage() {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  // Simulated transcript
  useEffect(() => {
    if (state === 'recording') {
      const phrases = [
        '开始说话，',
        '内容会实时显示在这里...',
        '这是一个语音转文字演示，',
        '实际功能需要集成语音识别API。',
      ];
      let index = 0;
      const interval = setInterval(() => {
        if (index < phrases.length) {
          setTranscript((prev) => prev + phrases[index]);
          index++;
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleMicClick = () => {
    if (state === 'idle') {
      setState('recording');
    } else if (state === 'recording') {
      setState('paused');
    } else if (state === 'paused') {
      setState('recording');
    }
  };

  const handleStop = () => {
    setState('idle');
    setElapsedTime(0);
    setTranscript('');
  };

  const handleSave = () => {
    // TODO: Save recording logic
    alert('录音已保存！');
    handleStop();
  };

  // Get button state based on recording state
  const getButtonState = () => {
    switch (state) {
      case 'idle':
        return {
          color: 'bg-gray-200 dark:bg-zinc-700',
          iconColor: 'text-gray-600 dark:text-zinc-400',
          Icon: Mic,
          label: '点击录音',
        };
      case 'recording':
        return {
          color: 'bg-green-500',
          iconColor: 'text-white',
          Icon: Mic,
          label: '点击暂停',
          pulse: true,
        };
      case 'paused':
        return {
          color: 'bg-amber-500',
          iconColor: 'text-white',
          Icon: Play,
          label: '继续录音',
        };
    }
  };

  const buttonState = getButtonState();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-zinc-800">
        <Link 
          href="/"
          className="flex items-center gap-1 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">返回</span>
        </Link>
        
        <h1 className="text-base font-medium text-gray-900 dark:text-zinc-50">
          新录音
        </h1>
        
        <button 
          onClick={() => window.history.back()}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Timer Display */}
        <div className="text-center mb-8">
          <div className={`text-5xl font-light tabular-nums tracking-wider ${
            state === 'recording' 
              ? 'text-green-600 dark:text-green-400' 
              : state === 'paused'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-gray-400 dark:text-zinc-500'
          }`}>
            {formatTime(elapsedTime)}
            {state === 'paused' && <span className="text-lg ml-2">(已暂停)</span>}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="w-full max-w-md mb-12">
          <AudioWaveform isRecording={state === 'recording'} />
        </div>

        {/* Recording Status Text */}
        <div className="text-center mb-8 h-6">
          {state === 'recording' && (
            <span className="text-green-600 dark:text-green-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              正在录音
            </span>
          )}
          {state === 'paused' && (
            <span className="text-amber-600 dark:text-amber-400 text-sm">
              录音已暂停
            </span>
          )}
          {state === 'idle' && (
            <span className="text-gray-400 dark:text-zinc-500 text-sm">
              准备就绪
            </span>
          )}
        </div>

        {/* Main Record Button */}
        <button
          onClick={handleMicClick}
          className={`relative w-24 h-24 rounded-full ${buttonState.color} shadow-lg flex items-center justify-center transition-all active:scale-95`}
        >
          {/* Pulse animation for recording state */}
          {buttonState.pulse && (
            <>
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
              <span className="absolute inset-0 rounded-full bg-green-500 animate-pulse opacity-20" />
              <span className="absolute -inset-4 rounded-full bg-green-500/10 animate-pulse" />
            </>
          )}
          
          <buttonState.Icon 
            className={`w-10 h-10 ${buttonState.iconColor}`} 
            strokeWidth={2.5} 
          />
        </button>

        {/* Button Label */}
        <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">
          {buttonState.label}
        </p>

        {/* Live Transcript Area */}
        {state !== 'idle' && (
          <div className="w-full max-w-md mt-8 p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">实时转录</p>
            <p className="text-sm text-gray-700 dark:text-zinc-300 min-h-[3rem]">
              {transcript || (<span className="text-gray-400 dark:text-zinc-500">开始说话，内容会显示在这里...{state === 'paused' && ' (暂停中)'}</span>)
              }
            </p>
          </div>
        )}
      </main>

      {/* Bottom Actions */}
      <footer className="px-6 py-6 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          {/* Cancel Button */}
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">取消</span>
          </button>

          {/* Save Button - Only show when recording exists */}
          <button
            onClick={handleSave}
            disabled={state === 'idle' && elapsedTime === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
              elapsedTime > 0 || state !== 'idle'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>完成</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
