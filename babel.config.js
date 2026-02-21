module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      'babel-preset-expo',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
      ['@babel/plugin-transform-runtime', {
        regenerator: false,
        useESModules: false,
      }],
      'react-native-reanimated/plugin',
    ],
  }
}
