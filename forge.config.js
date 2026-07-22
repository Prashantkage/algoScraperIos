const path = require('path');

module.exports = {
  packagerConfig: {
    // Force an absolute path so Electron Forge cannot fail to find it
    icon: path.resolve(__dirname, 'assets', 'algoScraper Logo'),

    executableName: 'AlgoScraper IOS',
    appBundleId: 'com.algoshack.algoscraperios',

    extendInfo: {
      CFBundleName: 'AlgoScraper IOS',
      CFBundleDisplayName: 'AlgoScraper IOS'
    },

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
      config: {},
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
  ],
};