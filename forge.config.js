module.exports = {
  packagerConfig: {
      // Keep asar enabled but cleanly unpack your main automation directories
      asar: {
          unpackDir: '{appium-runtime,node_modules/appium-xcuitest-driver}'
      },
      extraResource: [
          "./appium-runtime"
      ]
    },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
//    {
//      name: '@electron-forge/plugin-webpack',
//      config: {
//        mainConfig: './webpack.main.config.js',
//        renderer: {
//          config: './webpack.renderer.config.js',
//          entryPoints: [
//            {
//              html: './src/index.html',
//              js: './src/renderer.js',
//              name: 'main_window',
//              preload: {
//                js: './src/preload.js',
//              },
//            },
//          ],
//        },
//      },
//    },
  ],
};
