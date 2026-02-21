const { getDefaultConfig } = require('expo/metro-config')
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native', 'node']

module.exports = wrapWithReanimatedMetroConfig(config)
