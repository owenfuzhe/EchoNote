# EchoNote 综合整改计划

**生成时间:** 2026-03-06  
**评估来源:** 
- ui-audit (Tommy Geoco)
- ui-ux-pro-max  
- superdesign

---

## 一、三大 Skill 评估汇总

### 1. ui-audit 评估结果: 7.2/10
- **视觉层次**: 7/10 - Section header 字号偏小
- **视觉风格**: 8/10 - 整体协调
- **可访问性**: 5/10 - Focus/active 状态缺失
- **导航**: 9/10 - 清晰易用
- **可用性**: 7/10 - 反馈机制待完善

### 2. ui-ux-pro-max 设计系统建议
- **风格**: Vibrant & Block-based (当前偏保守，可更活泼)
- **颜色**: 建议 Cyan (#0891B2) + Green (#059669) 组合
- **字体**: Atkinson Hyperlegible (无障碍友好)
- **动效**: 200-300ms，bold hover effects
- **避坑**: 避免 flat design without depth

### 3. superdesign 前端规范
- **颜色**: 避免 bootstrap 蓝，使用 oklch()
- **字体**: Inter, DM Sans, Outfit 等现代字体
- **动画**: 150-400ms ease-out
- **响应式**: 375px / 768px / 1024px / 1440px
- **无障碍**: cursor-pointer, focus states, 4.5:1 对比度

---

## 二、整改任务清单 (按优先级)

### 🔴 P0 - 关键问题 (影响可用性)

| # | 问题 | 位置 | 修复方案 | 工时 |
|---|------|------|----------|------|
| 1 | Focus 状态缺失 | 所有交互元素 | 添加 focus:ring-2 focus:ring-blue-500 | 15min |
| 2 | Active/Pressed 状态缺失 | 按钮、卡片 | 添加 active:scale-95 + 颜色变化 | 20min |
| 3 | Hover 效果缺失 | 卡片、按钮 | 添加 hover:shadow-md hover:-translate-y-0.5 | 20min |

### 🟠 P1 - 高优先级 (提升体验)

| # | 问题 | 位置 | 修复方案 | 工时 |
|---|------|------|----------|------|
| 4 | Section header 层级不清 | HomeView | 增大字号至 18px 或加粗至 700 | 10min |
| 5 | 底部导航对比度低 | BottomNav | 未选中 #9CA3AF → #6B7280，选中加深 | 10min |
| 6 | 缺少加载状态 | 搜索、任务 | 添加骨架屏 Skeleton 组件 | 30min |
| 7 | 取消操作无确认 | 任务卡片 | 添加二次确认弹窗 | 20min |

### 🟡 P2 - 中优先级 (完善细节)

| # | 问题 | 位置 | 修复方案 | 工时 |
|---|------|------|----------|------|
| 8 | ARIA 地标缺失 | App.tsx | 添加 `<main>`, `<nav>`, `<header>` | 15min |
| 9 | 图标缺少 aria-label | 所有图标 | 添加 aria-label 描述 | 20min |
| 10 | 颜色系统现代化 | 全局 | 引入 oklch() 或优化现有色值 | 30min |
| 11 | 微交互动画 | 全局 | 按钮涟漪、页面过渡动画 | 1h |

### 🟢 P3 - 低优先级 (锦上添花)

| # | 问题 | 位置 | 修复方案 | 工时 |
|---|------|------|----------|------|
| 12 | 深色模式支持 | 全局 | 添加 dark mode 变量 | 2h |
| 13 | 字体优化 | 全局 | 引入 Inter 或 DM Sans | 30min |
| 14 | 响应式断点优化 | 全局 | 完善 tablet/desktop 布局 | 1h |

---

## 三、具体代码修改指南

### 3.1 Focus & Active 状态 (P0)

```tsx
// Button 组件示例
<button
  className="
    transition-all duration-150 ease-out
    hover:shadow-md hover:-translate-y-0.5
    active:scale-95 active:shadow-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  "
>
```

### 3.2 卡片 Hover 效果 (P0)

```tsx
// Card 组件
<div className="
  transition-all duration-200 ease-out
  hover:shadow-lg hover:-translate-y-1
  active:scale-[0.98]
">
```

### 3.3 Section Header 优化 (P1)

```tsx
// HomeView.tsx
<h2 className="text-lg font-bold text-gray-900">
  进行中的任务
</h2>
// 改为
<h2 className="text-xl font-bold text-gray-900 tracking-tight">
  进行中的任务
</h2>
```

### 3.4 底部导航对比度 (P1)

```tsx
// BottomNav.tsx
// 未选中状态
className="text-gray-400" 
// 改为
className="text-gray-500"

// 选中状态  
className="text-blue-500"
// 改为
className="text-blue-600 font-medium"
```

### 3.5 骨架屏组件 (P1)

```tsx
// Skeleton.tsx 新组件
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// 使用
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

### 3.6 确认弹窗 (P1)

```tsx
// 使用浏览器原生 confirm 或自定义 Modal
const handleCancel = (taskId: string) => {
  if (confirm('确定要取消这个任务吗？')) {
    setActiveTasks(prev => prev.filter(t => t.noteId !== taskId));
  }
};
```

### 3.7 ARIA 地标 (P2)

```tsx
// App.tsx
<header className="...">...</header>
<nav className="...">...</nav>
<main className="flex-1 overflow-y-auto">
  {currentView === 'home' && <HomeView />}
  ...
</main>
```

---

## 四、验收标准

### P0 验收
- [ ] Tab 键可导航所有交互元素
- [ ] 每个交互元素有可见 focus ring
- [ ] 按钮点击有视觉反馈（缩放或颜色变化）
- [ ] 卡片悬停有阴影/抬升效果

### P1 验收  
- [ ] Section header 比内容更突出
- [ ] 底部导航选中/未选中对比明显
- [ ] 搜索/任务加载时显示骨架屏
- [ ] 取消任务前弹出确认对话框

### P2 验收
- [ ] 页面结构包含 `<main>`, `<nav>`
- [ ] 所有图标有 aria-label
- [ ] 构建无错误，TypeScript 检查通过

---

## 五、执行命令

```bash
# 1. 启动开发服务器
cd ~/Echonote && npm run dev

# 2. 构建验证
npm run build

# 3. TypeScript 检查
npx tsc --noEmit
```

---

*整改计划已就绪，等待 CC 执行*
