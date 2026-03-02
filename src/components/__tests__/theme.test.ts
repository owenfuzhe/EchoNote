import { colors, spacing, radius, font, layout } from '@/components/ui/theme'

describe('Theme System', () => {
  describe('Colors', () => {
    it('should have primary color defined', () => {
      expect(colors.primary).toBe('#4F46E5')
      expect(colors.primaryHover).toBe('#4338CA')
    })

    it('should have recording color defined', () => {
      expect(colors.recording).toBe('#EF4444')
      expect(colors.recordingActive).toBe('#22C55E')
    })

    it('should have icon colors defined', () => {
      expect(colors.icon).toBe('#4B5563')
      expect(colors.iconActive).toBe('#4F46E5')
      expect(colors.iconRecording).toBe('#EF4444')
    })

    it('should have light mode colors', () => {
      expect(colors.light.bg).toBe('#FFFFFF')
      expect(colors.light.text).toBe('#111827')
    })

    it('should have dark mode colors', () => {
      expect(colors.dark.bg).toBe('#0F0F0F')
      expect(colors.dark.text).toBe('#FAFAFA')
    })
  })

  describe('Spacing', () => {
    it('should have numeric spacing', () => {
      expect(spacing[1]).toBe(4)
      expect(spacing[4]).toBe(16)
      expect(spacing[6]).toBe(24)
    })

    it('should have legacy aliases', () => {
      expect(spacing.xs).toBe(4)
      expect(spacing.md).toBe(12)
      expect(spacing.xl).toBe(24)
    })
  })

  describe('Font', () => {
    it('should have correct font sizes', () => {
      expect(font.sizes.xs).toBe(12)
      expect(font.sizes.base).toBe(16)
      expect(font.sizes['2xl']).toBe(24)
    })

    it('should have hero font size', () => {
      expect(font.sizes.hero).toBe(32)
    })
  })

  describe('Layout', () => {
    it('should have layout constants', () => {
      expect(layout.bottomBarHeight).toBe(64)
      expect(layout.topTabHeight).toBe(48)
    })
  })
})
