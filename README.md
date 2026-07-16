Markdown
# AlgoScraper

AlgoScraper is an Electron-based desktop application used to inspect iOS and Android applications and generate XPath locators. The application automatically manages the Appium server and supports both real devices and simulators/emulators.

---

# Features

- Automatic Appium startup.
- Uses an existing Appium server if already running.
- Automatically starts the bundled Appium if no Appium instance is found.
- XPath inspection for iOS and Android applications.
- Accurate child element detection.
- Hover-based element highlighting.
- Zoom, pan and drag support.
- Displays the actual installed application name.
- Export generated locators.

---

# System Requirements

- macOS
- Node.js 18 or later (Node v22+ recommended)
- npm v10+
- Xcode
- CocoaPods
- Homebrew
- iPhone (or) iOS Simulator
- Android Device (or) Emulator

---

# Software Installation

## 1. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL [https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh](https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh))"
Verify:

Bash
brew --version
2. Install Node.js
Bash
brew install node
Verify:

Bash
node -v
npm -v
3. Install Xcode
Install Xcode from the Mac App Store.

Configure Xcode:

Bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
Accept License:

Bash
sudo xcodebuild -license accept
Verify:

Bash
xcodebuild -version
4. Install CocoaPods
Bash
sudo gem install cocoapods
Verify:

Bash
pod --version
5. Install libimobiledevice
Bash
brew install libimobiledevice
Verify:

Bash
idevice_id -l
6. Install ios-deploy
Bash
npm install -g ios-deploy
Verify:

Bash
ios-deploy --version
Clone the Repository
Note: This is a private GitHub repository . Your GitHub account must have access before you can clone it.

Clone the repository:

Bash
git clone [https://github.com/Prashantkage/algoScraperIos.git](https://github.com/Prashantkage/algoScraperIos.git)
Go inside the project:

Bash
cd algoScraperIos
Install Project Dependencies
Install all required dependencies by running:

Bash
npm run setup
The setup script automatically installs:

Root project dependencies

Appium runtime dependencies

If required, dependencies can also be installed manually.

Root Project
Bash
npm install
Appium Runtime
Bash
cd appium-runtime
npm install
cd ..
Start the Application
Bash
npm start
Build macOS Application
Bash
npm run make
Generated files will be available in:

out/
Build Windows Package
Bash
npm run package-win
Connect an iPhone
Connect the iPhone using a USB cable.

Unlock the device.

Tap Trust This Computer when prompted.

Verify the device connection.

Bash
idevice_id -l
The connected device UDID should be displayed.

Running AlgoScraper
Launch AlgoScraper.

Enter your authentication token.

Wait until the status changes to Connected .

Select Real Device or Simulator .

Select the application.

Start inspection.

Click any UI element to generate XPath.

Export the generated locators if required.

Updating the Project
To get the latest code:

Bash
git pull origin main
Install any newly added dependencies:

Bash
npm run setup
Start the application:

Bash
npm start
Useful Git Commands
Clone repository

Bash
git clone [https://github.com/Prashantkage/algoScraperIos.git](https://github.com/Prashantkage/algoScraperIos.git)
cd algoScraperIos
npm run setup
npm start
Pull latest code

Bash
git pull origin main
Run application

Bash
npm start
Build application

Bash
npm run make
Troubleshooting
npm command not found
Install Node.js.

Verify:

Bash
node -v
npm -v
Xcode not found
Bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
CocoaPods not found
Bash
sudo gem install cocoapods
Device not detected
Run:

Bash
idevice_id -l
Reconnect the device and tap Trust This Computer .

Permission Issues
Run:

Bash
sudo xcodebuild -license accept
npm ERR! cb.apply is not a function
This occurs when a legacy node package forces npm to use an outdated local v3 cache. Wipe out the corrupted local paths and reinstall:

Bash
rm -rf node_modules package-lock.json appium-runtime/node_modules appium-runtime/package-lock.json
npm run setup
Missing Driver Error (ENOENT on XCUITest initialization)
Appium cannot resolve the targeted testing extension module. Manually install it inside the runtime workspace:

Bash
cd appium-runtime
npm install appium-xcuitest-driver
cd ..
ENOSPC: no space left on device (Build Failures)
The compiler exhausted the disk space while copying compilation caches. Run a deep clean to free up space before building:

Bash
rm -rf out/ algoScraper-builds/
find . -name "CompilationCache.noindex" -type d -exec rm -rf {} +
find . -name ".cache" -type d -exec rm -rf {} +
Screen Blank After Clicking Reset then Refresh
If you click "Reset", the active view is completely cleared from the app. To refresh the page after a reset, you must select your app configuration and click Launch Application once more to reconstruct the viewport.

Clean Installation
Delete installed dependencies:

Bash
rm -rf node_modules
rm -rf appium-runtime/node_modules
Install again:

Bash
npm run setup
Project Structure
algoScraperIos
│
├── appium-runtime/
├── src/
├── package.json
├── forge.config.js
├── webpack.main.config.js
├── webpack.renderer.config.js
├── webpack.rules.js
├── README.md
└── .gitignore
Support
For any issues during setup or execution, contact the AlgoShack development team and share the error logs along with screenshots for faster troubleshooting.