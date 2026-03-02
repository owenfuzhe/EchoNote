# EchoNote - 录音页设计

**版本：** v1.0  
**日期：** 2026-03-02  
**状态：** 基于 ui-spec.md v2.0  
**设计师：** Designer Agent (Pixel)  

---

## 1. 页面布局

```
┌─────────────────────────────────────────────┐
│  ← 返回              ⋮ 设置                 │  ← 顶部栏 48px
├─────────────────────────────────────────────┤
│                                             │
│           录音中...                         │  ← 状态文字 (16px)
│                                             │
│         00:00                               │  ← 录音时长 (48px)
│         15:32                               │
│                                             │
│     ╭─────────────────────────╮            │
│     │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │            │  ← 实时波形
│     │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │            │
│     ╰─────────────────────────╯            │
│                                             │
│                                             │
│           ┌───────────────┐                │
│           │   ● 停止      │                │  ← 停止按钮 80px
│           │   (红色)      │                │     red-500
│           └───────────────┘                │
│                                             │
│           点击停止录音                      │  ← 提示文字 (12px)
│                                             │
├─────────────────────────────────────────────┤
│  [+]    [🖊️]    [🎙️]          [🔍]    [🤖]  │  ← 底部输入栏 64px
│  更多   文字    语音 (中)       搜索    AI  │
└─────────────────────────────────────────────┘
```

---

## 2. 组件规范

### 2.1 顶部栏
| 属性 | 值 |
|------|-----|
| 高度 | 48px |
| 背景 | 纯白 `#FFFFFF` |
| 底部边框 | 1px `gray-200` |
| 按钮 | Lucide Icons 24px, `gray-600` |

### 2.2 状态文字
| 属性 | 值 |
|------|-----|
| 字号 | 16px |
| 字重 | 500 |
| 颜色 | `gray-600` |
| 位置 | 距顶部 32px |

### 2.3 录音时长
| 属性 | 值 |
|------|-----|
| 字号 | 48px |
| 字重 | 200 (Extra Light) |
| 颜色 | `gray-900` |
| 字体 | Mono 等宽数字 |
| 位置 | 状态文字下方 16px |

### 2.4 实时波形
| 属性 | 值 |
|------|-----|
| 宽度 | 280px |
| 高度 | 80px |
| 颜色 | `indigo-600` (动态渐变) |
| 动画 | 60fps 实时更新 |
| 位置 | 时长下方 32px |

### 2.5 停止按钮
| 属性 | 值 |
|------|-----|
| 尺寸 | 80px × 80px |
| 背景 | `red-500` |
| 图标 | `circle-stop` 40px, 白色 |
| 圆角 | 50% (圆形) |
| 阴影 | 0 4px 24px `rgba(239, 68, 68, 0.4)` |
| 位置 | 波形下方 64px |

**悬停状态：**
- 背景：`red-600`
- 阴影：加深

**按下状态：**
- 缩放：95%

### 2.6 提示文字
| 属性 | 值 |
|------|-----|
| 字号 | 12px |
| 颜色 | `gray-500` |
| 位置 | 停止按钮下方 16px |

---

## 3. 录音状态流程

```
开始录音 → 录音中 → 暂停 → 继续录音 → 停止 → 保存/丢弃
   │          │         │          │         │
   │          │         │          │         └─→ 跳转详情页
   │          │         │          └─→ 恢复波形
   │          │         └─→ 按钮变播放
   │          └─→ 波形跳动 + 时长增加
   └─→ 红色按钮 + 波形出现
```

### 3.1 录音中 UI 变化
- 按钮：录音按钮 → 停止按钮（红色）
- 图标：`mic` → `circle-stop`
- 波形：实时跳动
- 时长：秒表递增

### 3.2 暂停 UI 变化
- 按钮：停止按钮 → 播放按钮
- 图标：`circle-stop` → `circle-play`
- 波形：静止
- 时长：暂停

---

## 4. 波形动画规范

```css
/* 实时波形动画 */
@keyframes wave {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

.wave-bar {
  animation: wave 0.5s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.05s);
}

/* 录音按钮脉冲 */
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}

.recording-button::before {
  content: '';
  position: absolute;
  animation: pulse-ring 1.5s ease-out infinite;
}
```

---

## 5. 深色模式适配

| 元素 | 浅色 | 深色 |
|------|------|------|
| 背景 | `#FFFFFF` | `#0F0F0F` |
| 时长文字 | `gray-900` | `gray-50` |
| 状态文字 | `gray-600` | `gray-400` |
| 波形 | `indigo-600` | `indigo-400` |
| 停止按钮 | `red-500` | `red-400` |
| 提示文字 | `gray-500` | `gray-400` |

---

## 6. Tailwind 参考

```html
<!-- 顶部栏 -->
<header class="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
  <button class="p-2"><ChevronLeft class="w-6 h-6 text-gray-600" /></button>
  <button class="p-2"><Settings class="w-6 h-6 text-gray-600" /></button>
</header>

<!-- 录音时长 -->
<div class="text-center pt-8">
  <p class="text-sm text-gray-600 mb-4">录音中...</p>
  <div class="text-6xl font-extralight tabular-nums text-gray-900">
    00:00
  </div>
</div>

<!-- 实时波形 -->
<div class="flex justify-center items-center gap-1 h-20 my-8">
  <div class="w-1 bg-indigo-600 rounded-full" style="height: 40%; animation: wave 0.5s infinite"></div>
  <div class="w-1 bg-indigo-600 rounded-full" style="height: 80%; animation: wave 0.5s infinite 0.05s"></div>
  <!-- ... 更多波形条 -->
</div>

<!-- 停止按钮 -->
<button class="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-95 transition">
  <CircleStop class="w-10 h-10 text-white" />
</button>
```

---

## 7. 参考链接（待截图）

| 参考目标 | 链接 |
|---------|------|
| Apple Voice Memos | https://apple.com/ios/voice-memos |
| Craft 录音界面 | https://craft.do |
| Otter.ai 录音 | https://otter.ai |

---

**设计师：** Designer Agent (Pixel) 🎨
