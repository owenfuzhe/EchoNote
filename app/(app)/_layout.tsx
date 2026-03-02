import { Tabs, useRouter, usePathname } from 'expo-router'
import { useColorScheme, View, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { colors, spacing, layout } from '@/components/ui/theme'
import { 
  Plus, 
  SquarePen, 
  Mic, 
  Search, 
  Bot,
  Home,
  Library,
  CheckCircle2
} from 'lucide-react-native'

export default function AppLayout() {
  const isDark = useColorScheme() === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  const pathname = usePathname()

  // 获取当前激活的顶部 Tab
  const getActiveTab = () => {
    if (pathname.includes('/library')) return 'library'
    if (pathname.includes('/todos')) return 'todos'
    return 'home'
  }

  const activeTab = getActiveTab()

  // 底部按钮配置
  const bottomButtons = [
    { icon: Plus, label: '更多', onPress: () => {}, variant: 'default' as const },
    { icon: SquarePen, label: '文字', onPress: () => router.push('/(app)/create?type=text'), variant: 'default' as const },
    { icon: Mic, label: '语音', onPress: () => router.push('/(app)/create?type=voice'), variant: 'recording' as const },
    { icon: Search, label: '搜索', onPress: () => router.push('/(app)/search'), variant: 'default' as const },
    { icon: Bot, label: 'AI', onPress: () => {}, variant: 'brand' as const },
  ]

  return (
    <View style={{ flex: 1 }}>
      {/* 顶部 Tab 导航 */}
      <View style={[styles.topTab, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'home' ? colors.primary : theme.textSecondary },
            activeTab === 'home' && styles.tabTextActive
          ]}>
            主页
          </Text>
          {activeTab === 'home' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/library')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'library' ? colors.primary : theme.textSecondary },
            activeTab === 'library' && styles.tabTextActive
          ]}>
            资料库
          </Text>
          {activeTab === 'library' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/todos')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'todos' ? colors.primary : theme.textSecondary },
            activeTab === 'todos' && styles.tabTextActive
          ]}>
            待办
          </Text>
          {activeTab === 'todos' && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
      </View>

      {/* 主内容区 */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' }, // 隐藏默认 Tab Bar
          }}
          initialRouteName="index"
        >
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="library" options={{ href: null }} />
          <Tabs.Screen name="todos" options={{ href: null }} />
          <Tabs.Screen name="create" options={{ href: null }} />
          <Tabs.Screen name="search" options={{ href: null }} />
          <Tabs.Screen name="notebook/[id]" options={{ href: null }} />
          <Tabs.Screen name="topic-map" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
          <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>
      </View>

      {/* 自定义底部导航栏 */}
      <View style={[styles.bottomBar, { 
        backgroundColor: theme.bg, 
        borderTopColor: theme.border,
        paddingBottom: layout.safeAreaBottom / 2
      }]}>
        {/* 左三按钮组 */}
        <View style={styles.leftGroup}>
          {bottomButtons.slice(0, 3).map((btn, idx) => (
            <NavButton
              key={idx}
              icon={btn.icon}
              label={btn.label}
              onPress={btn.onPress}
              variant={btn.variant}
              theme={theme}
            />
          ))}
        </View>

        {/* 右二按钮组 */}
        <View style={styles.rightGroup}>
          {bottomButtons.slice(3).map((btn, idx) => (
            <NavButton
              key={idx + 3}
              icon={btn.icon}
              label={btn.label}
              onPress={btn.onPress}
              variant={btn.variant}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

// 导航按钮组件
function NavButton({ 
  icon: Icon, 
  label, 
  onPress, 
  variant = 'default',
  theme 
}: { 
  icon: React.ElementType
  label: string
  onPress: () => void
  variant: 'default' | 'recording' | 'brand'
  theme: any
}) {
  const getIconColor = () => {
    switch (variant) {
      case 'recording': return colors.recording
      case 'brand': return colors.primary
      default: return colors.icon
    }
  }

  return (
    <TouchableOpacity 
      style={styles.navButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon 
        size={24} 
        color={getIconColor()}
        strokeWidth={2}
      />
      <Text style={[styles.navLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // 顶部 Tab
  topTab: {
    flexDirection: 'row',
    height: layout.topTabHeight,
    borderBottomWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
  },
  tabTextActive: {
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
  },

  // 底部导航栏
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.bottomBarHeight,
    borderTopWidth: 1,
    paddingHorizontal: spacing['6'],
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
  },
})
