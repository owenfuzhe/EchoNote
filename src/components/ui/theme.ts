export const colors = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',

  // Per-cell-type accent colors
  cell: {
    text: '#6366F1',        // indigo
    voice: '#10B981',       // emerald
    image: '#F59E0B',       // amber
    ai_output: '#8B5CF6',   // violet
    todo: '#EF4444',        // red
    chart: '#3B82F6',       // blue
    correlation: '#06B6D4', // cyan
  },

  light: {
    bg: '#F8F8FC',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6',
    border: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
  },

  dark: {
    bg: '#0D0D12',
    surface: '#16161E',
    surfaceAlt: '#1E1E2A',
    border: '#2A2A38',
    text: '#F1F1F8',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
}

export const font = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    hero: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
}
