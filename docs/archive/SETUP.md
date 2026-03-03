# EchoNotes — Setup Guide

## Prerequisites

1. **Node.js** (v18+) — https://nodejs.org/
2. **Expo CLI** — installed automatically via npx
3. **Supabase account** — https://supabase.com (free tier is fine)
4. **API key** for at least one LLM provider (Claude recommended)

---

## 1. Install dependencies

```bash
cd EchoNotes
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Set up Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run `supabase/migrations/001_initial.sql`
3. Enable **pgvector** (it's in the SQL file)
4. Copy your Project URL and anon key into `.env`

## 4. Run the app

```bash
# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web

# Expo Go (scan QR code with phone)
npm start
```

## 5. Add your API keys (in-app)

1. Open the app → **Settings** tab
2. Expand the provider you want to use (e.g. Claude)
3. Paste your API key and tap **Save key**
4. Select it as your **Active AI Provider**

---

## LLM Provider Setup

| Provider | API Key From | Base URL |
|---|---|---|
| Claude (Anthropic) | https://console.anthropic.com | *(auto)* |
| OpenAI | https://platform.openai.com | *(auto)* |
| Kimi (Moonshot) | https://platform.moonshot.cn | *(auto)* |
| Qwen (Alibaba) | https://dashscope.aliyuncs.com | *(auto)* |
| Zhipu AI (ZAI) | https://open.bigmodel.cn | *(auto)* |
| Ollama (Local) | *(no key needed)* | http://localhost:11434 |

---

## Voice Transcription

By default, EchoNotes uses **OpenAI Whisper API** for transcription (supports Chinese/English/auto-detect).

**To enable fully on-device transcription** (private, no network required):
1. Set up an EAS Build or use bare workflow
2. Install `whisper.rn`: https://github.com/mybigday/whisper.rn
3. Replace the `transcribeAudio` function in `src/hooks/use-voice.ts`

---

## Project Backup

`EchoNotes-base` 是当前项目的完整备份，记录了 2026-02-20 的开发状态。

**主要特性：**
- 文档式笔记布局（非 Cell 卡片式）
- Web 端使用 Web Speech API 进行语音识别
- 支持中文/英文语音输入
- Supabase 后端 + Anthropic Claude AI 分析

**如需回滚：**
```bash
# 用备份覆盖当前项目
robocopy "c:\Users\crisp\EchoNotes-base" "c:\Users\crisp\EchoNotes" /MIR /XD node_modules .git
```

---

## Project Structure

```
app/               Expo Router screens
  (auth)/          Login / register
  (app)/           Main app tabs
    notebook/[id]  Notebook editor
src/
  components/
    cells/         All cell type components
    editor/        NotebookEditor + AddCellMenu
    ui/            Theme + shared UI
  hooks/           use-llm, use-voice, etc.
  providers/llm/   Provider adapters (Anthropic, OpenAI, Ollama, etc.)
  store/           Zustand state (notebooks, settings)
  lib/             Supabase client, secure storage
  types/           Cell and notebook TypeScript types
supabase/
  migrations/      SQL schema with pgvector
```
