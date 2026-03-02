// EchoNote UI/UX Design System v2.0
// Craft + Notion 风格，纯白背景，统一图标

export const colors = {
  // Primary - Indigo (品牌色)
  primary: '#4F46E5',           // Indigo-600
  primaryHover: '#4338CA',      // Indigo-700
  primaryLight: '#EEF2FF',      // Indigo-50

  // Semantic Colors
  recording: '#EF4444',         // Red-500 - 录音按钮专用
  recordingHover: '#DC2626',    // Red-600
  recordingActive: '#22C55E',   // Green-500 - 录音中状态
  recordingPaused: '#F59E0B',   // Amber-500 - 暂停状态
  success: '#10B981',           // Emerald-500
  warning: '#F59E0B',           // Amber-500
  error: '#EF4444',             // Red-500

  // Icon Colors (Lucide Icons 统一使用)
  icon: '#4B5563',              // Gray-600 - 图标默认
  iconActive: '#4F46E5',        // Indigo-600 - 图标激活
  iconRecording: '#EF4444',     // Red-500 - 录音按钮
  iconBrand: '#4F46E5',         // Indigo-600 - AI 按钮

  // Per-cell-type accent colors (Legacy support)
  cell: {
    text: '#6366F1',        // indigo
    voice: '#10B981',       // emerald
    image: '#F59E0B',       // amber
    ai_output: '#8B5CF6',   // violet
    todo: '#EF4444',        // red
    chart: '#3B82F6',       // blue
    correlation: '#06B6D4', // cyan
    link: '#EC4899',        // pink
  },

  // Light Mode - Craft 风格纯白
  light: {
    bg: '#FFFFFF',              // 纯白背景
    bgSecondary: '#FAFAFA',     // 几乎纯白
    bgTertiary: '#F3F4F6',      // Gray-100 - 卡片背景
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',      // Gray-50
    border: '#E5E7EB',          // Gray-200
    borderLight: '#F3F4F6',     // Gray-100
    text: '#111827',            // Gray-900
    textSecondary: '#6B7280',   // Gray-500
    textTertiary: '#9CA3AF',    // Gray-400
  },

  // Dark Mode
  dark: {
    bg: '#0F0F0F',              // 近纯黑
    bgSecondary: '#18181B',     // Zinc-900
    bgTertiary: '#27272A',      // Zinc-800
    surface: '#18181B',
    surfaceAlt: '#27272A',
    border: '#27272A',
    borderLight: '#3F3F46',
    text: '#FAFAFA',            // Zinc-50
    textSecondary: '#A1A1AA',   // Zinc-400
    textTertiary: '#71717A',    // Zinc-500
  },
}

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  // Fractional aliases
  '1.5': 6,
  // Legacy aliases
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 6,     // 小按钮
  md: 8,     // 卡片
  lg: 12,    // 大卡片
  xl: 16,    // 模态框
  full: 9999,
  // Legacy aliases
}

export const font = {
  sizes: {
    xs: 12,     // Tab 标签、辅助文字
    sm: 14,     // 次要信息
    base: 16,   // 正文
    md: 16,     // 正文 (alias)
    lg: 18,     // 卡片标题
    xl: 20,     // 页面标题
    '2xl': 24,  // 大标题
    xxl: 24,    // Legacy alias
    hero: 32,   // 超大标题
  },
  weights: {
    normal: '400' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
}

// 布局常量
export const layout = {
  bottomBarHeight: 64,
  topTabHeight: 48,
  pagePadding: 16,
  sectionGap: 24,
  cardGap: 12,
  safeAreaBottom: 34, // iOS safe area
}

// 阴影样式
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
}
