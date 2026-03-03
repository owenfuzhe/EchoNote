# EchoNote - 设计规范入口

**设计规范主文档：** [../design/ui-spec.md](../design/ui-spec.md)

---

## 📁 设计文档目录

```
docs/design/
├── ui-spec.md              ← 【主设计规范】Craft + Notion 风格
├── home-page.md            ← 首页设计细节
├── login-page.md           ← 登录页设计
├── note-detail-page.md     ← 笔记详情页设计
├── recording-page.md       ← 录音页设计
├── notes-list.md           ← 笔记列表页设计
├── settings-page.md        ← 设置页设计
├── ui-system-v1.md         ← 【已废弃】旧版设计系统
└── references/             ← Dribbble 参考截图
```

---

## 🎨 设计系统速查

### 颜色
```
Primary: #4F46E5 (Indigo-600)
Recording: #EF4444 (Red-500)
Background: #FFFFFF (纯白)
Text Primary: #111827 (Gray-900)
Text Secondary: #6B7280 (Gray-500)
```

### 字体
```
Font Family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", sans-serif
```

### 圆角
```
Cards: 12px (rounded-xl)
Buttons: 8px (rounded-lg) / 999px (full)
Inputs: 8px (rounded-lg)
```

### 图标
```
Library: Lucide Icons
Size Default: 24px
Color Default: Gray-600
Color Active: Indigo-600
```

---

## 📱 核心页面布局

### 首页
```
┌─────────────────────────────────────────┐
│  主页    资料库    待办                  │  ← Tab Navigation
├─────────────────────────────────────────┤
│                                         │
│           ┌───────────┐                 │
│           │    🎙️     │                 │  ← Recording Button
│           │   录音    │                 │     (Red, 80px)
│           └───────────┘                 │
│                                         │
│  最近笔记                                │
│  ┌───────────────────────────────────┐  │
│  │ 笔记卡片 1                         │  │  ← Note Cards
│  │ 笔记卡片 2                         │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  [+]  [📝]  [🎙️]        [🔍]  [🤖]    │  ← Bottom Bar
│  更多  文字  语音        搜索  AI      │
└─────────────────────────────────────────┘
```

### 录音页
```
┌─────────────────────────────────────────┐
│  ← 返回        新录音          [X]      │
├─────────────────────────────────────────┤
│                                         │
│              00:32                      │  ← Timer
│                                         │
│     ▓▓░░▓▓▓░░▓▓▓░░▓▓▓░                │  ← Waveform
│                                         │
│           ┌───────────┐                 │
│          ╱│    🎙️    │╲                │  ← Mic Button
│         ╱ │   录音中   │ ╲               │     (Green + Pulse)
│        ●  │          │  ●              │
│           └───────────┘                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 实时转录：正在说话的内容...        │  │  ← Transcription
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  [取消]                    [完成]       │
└─────────────────────────────────────────┘
```

---

## 🔄 设计变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-03-01 | ui-spec.md v2.0 | 重构为 Craft + Notion 风格 |
| 2026-03-01 | ui-system-v1.md | 标记为废弃 |
| 2026-03-02 | 补充页面设计 | 新增详情页、列表页、设置页设计 |

---

## 📞 设计问题反馈

设计相关问题请 @Pixel (Designer) 或参考 [ui-spec.md](../design/ui-spec.md) 获取完整规范。
