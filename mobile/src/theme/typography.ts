import { TextStyle } from 'react-native';

export const mobileType: Record<string, TextStyle> = {
  screenTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#0f172a',
  },
  screenTitleCompact: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#111827',
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: '#111827',
  },
  screenMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
    color: '#64748b',
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    color: '#6b7280',
  },
};
