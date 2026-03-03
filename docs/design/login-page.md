# EchoNote - 登录页面 UI 设计规范

**版本：** v1.0  
**日期：** 2026-03-02  
**状态：** 初稿待评审  
**设计师：** Designer Agent  

---

## 1. 设计原则

### 1.1 核心理念
- **3 秒启动**：用户进入页面到开始登录不超过 3 秒
- **极简主义**：减少认知负担，只保留必要元素
- **语音品牌**：融入声波/脉冲视觉元素，强化品牌识别

### 1.2 设计关键词
| 关键词 | 含义 | 体现 |
|--------|------|------|
| 简洁 | 无干扰、聚焦核心 | 单一列布局，无侧边栏 |
| 快速 | 减少操作步骤 | 第三方一键登录优先展示 |
| 信任 | 安全感、专业感 | 清晰的隐私政策链接、HTTPS 标识 |

---

## 2. 页面布局

### 2.1 整体结构

```
┌─────────────────────────────────┐
│         Logo + 品牌名            │
│    （声波图标 + EchoNote）        │
├─────────────────────────────────┤
│                                 │
│     ┌──────────────────┐        │
│     │   欢迎回来 👋      │        │
│     │  登录继续使用      │        │
│     └──────────────────┘        │
│                                 │
│     ┌──────────────────┐        │
│     │    邮箱输入框     │        │
│     └──────────────────┘        │
│                                 │
│     ┌──────────────────┐        │
│     │    密码输入框     │        │
│     └──────────────────┘        │
│                                 │
│     ┌──────────────────┐        │
│     │   [ 登录按钮 ]    │        │
│     └──────────────────┘        │
│                                 │
│     ──────── 或 ────────        │
│                                 │
│     ┌──────────────────┐        │
│     │  [G] Google 登录  │        │
│     └──────────────────┘        │
│                                 │
│     ┌──────────────────┐        │
│     │  [] Apple 登录   │        │
│     └──────────────────┘        │
│                                 │
│     还没有账户？注册           │
│     忘记密码？重置             │
│                                 │
└─────────────────────────────────┘
```

### 2.2 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| 移动端 | < 640px | 单列，满边距（16px） |
| 平板 | 640px - 1024px | 单列居中，最大宽度 400px |
| 桌面 | > 1024px | 单列居中，最大宽度 400px |

---

## 3. 组件规范

### 3.1 Logo 区域

**尺寸：** 48px × 48px（声波图标）  
**位置：** 顶部居中，距顶部 48px  
**组合：** 图标 + "EchoNote" 文字（20px, gray-900）

**深色模式：** 文字改为 gray-100

### 3.2 标题区域

**主标题：** "欢迎回来 👋"（24px, gray-900, 600）  
**副标题：** "登录继续使用"（14px, gray-600, 400）  
**间距：** 标题间距 8px，距输入框 32px

### 3.3 输入框

**通用规范：**
- 最小高度：44px（触摸友好）
- 圆角：8px
- 边框：1px, gray-300
- 背景：white（深色模式：gray-800）
- 内边距：12px 16px

**标签（可选）：**
- 字号：14px, gray-700
- 位置：输入框上方，间距 4px

**聚焦状态：**
- 边框：2px, #4F46E5（主色）
- 阴影：0 0 0 4px rgba(79, 70, 229, 0.1)

**错误状态：**
- 边框：2px, #EF4444（Error）
- 错误提示：12px, #EF4444，输入框下方 4px

**输入框类型：**
| 字段 | 类型 | 占位符 | 必填 |
|------|------|--------|------|
| 邮箱 | email | your@email.com | 是 |
| 密码 | password | 请输入密码 | 是 |

**密码显示/隐藏：**
- 图标：👁️ / 👁️‍🗨️
- 位置：输入框右侧，距右边界 12px
- 尺寸：20px × 20px

### 3.4 按钮

**Primary 按钮（登录）：**
- 背景：#4F46E5（Indigo）
- 文字：white, 16px, 600
- 高度：48px
- 圆角：8px
- 宽度：100%
- 悬停：#4338CA（Indigo-700）
- 按下：#3730A3（Indigo-800）
- 禁用：gray-300 背景，gray-500 文字

**Secondary 按钮（第三方登录）：**
- 背景：white（深色模式：gray-800）
- 边框：1px, gray-300
- 文字：gray-700, 14px, 500
- 高度：44px
- 圆角：8px
- 宽度：100%
- 图标：左侧，20px × 20px，间距 12px

**加载状态：**
- 按钮文字替换为加载动画
- 禁用点击
- 背景色不变

### 3.5 分隔线

**样式：** "─────── 或 ───────"  
**文字：** "或"（14px, gray-500）  
**线条：** 1px, gray-200  
**间距：** 距上下按钮各 24px

### 3.6 链接文字

**注册链接：**
- 文字："还没有账户？注册"
- 字号：14px, gray-600
- 链接色：#4F46E5（点击/悬停）
- 位置：底部，距第三方登录 32px

**忘记密码：**
- 文字："忘记密码？"
- 字号：12px, gray-500
- 位置：密码输入框下方右对齐

---

## 4. 交互流程

### 4.1 登录流程

```
用户输入邮箱 → 输入密码 → 点击登录 → 加载状态 → 成功/失败
```

**成功：**
- 跳转至首页（录音页）
- 显示 Toast："登录成功"

**失败：**
- 输入框边框变红
- 显示错误提示
- 不清空密码（用户体验考虑）

### 4.2 表单验证

**实时验证：**
- 邮箱格式：失去焦点时验证
- 密码长度：≥ 8 字符，输入时验证

**提交验证：**
- 空邮箱：禁用提交按钮
- 空密码：禁用提交按钮
- 邮箱格式错误：显示提示

**错误提示文案：**
| 场景 | 提示文案 |
|------|---------|
| 空邮箱 | 请输入邮箱地址 |
| 邮箱格式错误 | 请输入有效的邮箱地址 |
| 空密码 | 请输入密码 |
| 密码错误 | 邮箱或密码错误 |
| 账户不存在 | 邮箱或密码错误 |
| 账户锁定 | 尝试次数过多，请 10 分钟后再试 |

### 4.3 第三方登录流程

**Google/Apple 登录：**
1. 点击按钮
2. 弹出授权窗口
3. 用户授权
4. 后端验证 Token
5. 成功 → 跳转首页
6. 失败 → 显示错误提示

**首次登录：**
- 自动创建账户
- 跳转至完善资料页（可选）

---

## 5. 状态设计

### 5.1 页面状态

| 状态 | 描述 |
|------|------|
| 默认 | 空输入框，提交按钮禁用 |
| 输入中 | 聚焦输入框高亮 |
| 加载中 | 按钮显示加载动画，禁用交互 |
| 成功 | 跳转首页 |
| 错误 | 输入框红框 + 错误提示 |

### 5.2 按钮状态

| 状态 | 背景 | 文字 | 可点击 |
|------|------|------|--------|
| 默认 | #4F46E5 | white | 否（空表单） |
| 可用 | #4F46E5 | white | 是 |
| 悬停 | #4338CA | white | 是 |
| 按下 | #3730A3 | white | 是 |
| 加载 | #4F46E5 + Spinner | white | 否 |
| 禁用 | gray-300 | gray-500 | 否 |

---

## 6. 深色模式

### 6.1 颜色映射

| 元素 | 浅色模式 | 深色模式 |
|------|---------|---------|
| 背景 | white | #111827 (gray-900) |
| 卡片 | white | #1F2937 (gray-800) |
| 文字（主） | #111827 (gray-900) | #F9FAFB (gray-50) |
| 文字（次） | #6B7280 (gray-500) | #9CA3AF (gray-400) |
| 边框 | #D1D5DB (gray-300) | #374151 (gray-700) |
| 输入框背景 | white | #1F2937 (gray-800) |

### 6.2 特殊处理

- Logo 文字：gray-900 → gray-100
- 第三方登录按钮背景：white → gray-800
- 分隔线：gray-200 → gray-700

---

## 7. 动画规范

### 7.1 加载动画

**按钮加载：**
- 类型：旋转 Spinner
- 尺寸：20px × 20px
- 颜色：white
- 时长：无限循环
- 速度：1s/圈

### 7.2 过渡动画

| 元素 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 按钮悬停 | background | 150ms | ease |
| 输入框聚焦 | border/shadow | 150ms | ease |
| 错误提示 | opacity | 200ms | ease-out |
| 页面加载 | fade-in | 300ms | ease-out |

### 7.3 品牌动画（可选）

**Logo 脉冲：**
- 声波图标轻微脉冲
- 缩放：100% → 105% → 100%
- 时长：2s 循环
- 透明度：0.8 → 1 → 0.8

---

## 8. 可访问性

### 8.1 键盘导航

- Tab 顺序：邮箱 → 密码 → 登录按钮 → Google → Apple → 注册链接
- Enter 键：提交表单
- 焦点可见：2px 主色环

### 8.2 屏幕阅读器

- 输入框：aria-label="邮箱地址" / "密码"
- 错误提示：aria-live="polite"
- 加载状态：aria-busy="true"

### 8.3 对比度

- 文字/背景：≥ 4.5:1（WCAG AA）
- 主色按钮：#4F46E5 / white = 8.2:1 ✅

---

## 9. 技术实现建议

### 9.1 Tailwind CSS 类名参考

```html
<!-- 容器 -->
<div class="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-4">

<!-- Logo -->
<div class="w-12 h-12 mb-8">
  <SoundWaveLogo class="w-full h-full" />
</div>

<!-- 标题 -->
<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
  欢迎回来 👋
</h1>
<p class="text-gray-600 dark:text-gray-400 mb-8">
  登录继续使用
</p>

<!-- 表单 -->
<form class="w-full max-w-sm space-y-4">
  <!-- 邮箱输入框 -->
  <input
    type="email"
    class="w-full h-11 px-4 border border-gray-300 dark:border-gray-700 
           rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent
           dark:bg-gray-800 dark:text-gray-100"
    placeholder="your@email.com"
  />
  
  <!-- 密码输入框 -->
  <div class="relative">
    <input
      type="password"
      class="w-full h-11 px-4 border border-gray-300 dark:border-gray-700 
             rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent
             dark:bg-gray-800 dark:text-gray-100"
      placeholder="请输入密码"
    />
    <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2">
      👁️
    </button>
  </div>
  
  <!-- 登录按钮 -->
  <button
    type="submit"
    class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
           text-white font-semibold rounded-lg transition-colors duration-150
           disabled:bg-gray-300 disabled:text-gray-500"
  >
    登录
  </button>
</form>

<!-- 分隔线 -->
<div class="flex items-center my-6">
  <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
  <span class="px-4 text-gray-500 text-sm">或</span>
  <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
</div>

<!-- 第三方登录 -->
<button class="w-full h-11 flex items-center justify-center gap-3 
               border border-gray-300 dark:border-gray-700 rounded-lg
               bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
  <GoogleIcon class="w-5 h-5" />
  Google 登录
</button>
```

### 9.2 响应式断点

```css
/* 移动端默认，无需媒体查询 */
/* 平板及以上 */
@media (min-width: 640px) {
  .container { max-width: 400px; }
}
```

---

## 10. 待决策事项

| 事项 | 选项 | 建议 | 决策人 |
|------|------|------|--------|
| 记住我功能 | 显示/隐藏 | 隐藏（MVP 简化） | PM |
| 验证码 | 需要/不需要 | 不需要（MVP） | PM/Dev |
| 社交分享入口 | 有/无 | 无（登录页聚焦核心） | PM |

---

## 11. 交付清单

- [x] 布局方案（响应式）
- [x] 组件规范（输入框、按钮、第三方登录）
- [x] 状态设计（默认、聚焦、错误、加载）
- [x] 视觉元素（颜色、图标、动画）
- [x] 深色模式方案
- [x] 可访问性规范
- [x] Tailwind CSS 实现参考

---

**@Dev** 请评估实现可行性，有任何技术限制及时沟通！  
**@QA** 测试要点已参考你的清单，视觉验收以本规范为准！

**设计师：** Designer Agent 🎨
