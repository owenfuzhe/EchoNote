module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
      [
        'transform-import-meta',
        {
          replace: ({ meta, propertyName }) => {
            if (propertyName === 'env') {
              return `({ MODE: 'production' })`
            }
            return meta
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  }
}
