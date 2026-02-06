const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      '@bringup/alert': join(__dirname, '../../libs/alert/src/index.ts'),
      '@bringup/auth': join(__dirname, '../../libs/auth/src/index.ts'),
      '@bringup/config': join(__dirname, '../../libs/config/src/index.ts'),
      '@bringup/database': join(__dirname, '../../libs/database/src/index.ts'),
      '@bringup/logger': join(__dirname, '../../libs/logger/src/index.ts'),
      '@bringup/shared': join(__dirname, '../../libs/shared/src/index.ts'),
      '@bringup/tasks': join(__dirname, '../../libs/tasks/src/index.ts'),
      '@bringup/utils': join(__dirname, '../../libs/utils/src/index.ts'),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
