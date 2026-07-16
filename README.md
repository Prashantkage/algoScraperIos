# AlgoScraper iOS

AlgoScraper iOS is an Electron-based desktop application used to inspect iOS applications and generate XPath locators. The application automatically manages the Appium server and supports both real iOS devices and simulators.

---

# Features

- Automatic Appium startup.
- Uses an existing Appium server if already running.
- Automatically starts the bundled Appium if no Appium instance is found.
- XPath inspection for iOS applications.
- Accurate child element detection.
- Hover-based element highlighting.
- Zoom, pan and drag support.
- Displays the actual installed application name.
- Export generated locators.

---

# System Requirements

- macOS
- Node.js 18 or later
- npm
- Xcode
- CocoaPods
- Homebrew
- iPhone (or) iOS Simulator

---

# Software Installation

## 1. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify:

```bash
brew --version
```

---

## 2. Install Node.js

```bash
brew install node
```

Verify:

```bash
node -v
npm -v
```

---

## 3. Install Xcode

Install Xcode from the Mac App Store.

Configure Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Accept License:

```bash
sudo xcodebuild -license accept
```

Verify:

```bash
xcodebuild -version
```

---

## 4. Install CocoaPods

```bash
sudo gem install cocoapods
```

Verify:

```bash
pod --version
```

---

## 5. Install libimobiledevice

```bash
brew install libimobiledevice
```

Verify:

```bash
idevice_id -l
```

---

## 6. Install ios-deploy

```bash
npm install -g ios-deploy
```

Verify:

```bash
ios-deploy --version
```

---

# Clone the Repository

> **Note:** This is a **private GitHub repository**. Your GitHub account must have access before you can clone it.

Clone the repository:

```bash
git clone https://github.com/Prashantkage/algoScraperIos.git
```

Go inside the project:

```bash
cd algoScraperIos
```

---

# Install Project Dependencies

Install all required dependencies by running:

```bash
npm run setup
```

The setup script automatically installs:

- Root project dependencies
- Appium runtime dependencies

If required, dependencies can also be installed manually.

### Root Project

```bash
npm install
```

### Appium Runtime

```bash
cd appium-runtime
npm install
cd ..
```

---

# Start the Application

```bash
npm start
```

---

# Build macOS Application

```bash
npm run make
```

Generated files will be available in:

```
out/
```

---

# Build Windows Package

```bash
npm run package-win
```

---

# Connect an iPhone

1. Connect the iPhone using a USB cable.
2. Unlock the device.
3. Tap **Trust This Computer** when prompted.
4. Verify the device connection.

```bash
idevice_id -l
```

The connected device UDID should be displayed.

---

# Running AlgoScraper

1. Launch AlgoScraper.
2. Enter your authentication token.
3. Wait until the status changes to **Connected**.
4. Select **Real Device** or **Simulator**.
5. Select the application.
6. Start inspection.
7. Click any UI element to generate XPath.
8. Export the generated locators if required.

---

# Updating the Project

To get the latest code:

```bash
git pull origin main
```

Install any newly added dependencies:

```bash
npm run setup
```

Start the application:

```bash
npm start
```

---

# Useful Git Commands

Clone repository

```bash
git clone https://github.com/Prashantkage/algoScraperIos.git
```

Open project

```bash
cd algoScraperIos
```

Pull latest code

```bash
git pull origin main
```

Install dependencies

```bash
npm run setup
```

Run application

```bash
npm start
```

Build application

```bash
npm run make
```

Create Windows package

```bash
npm run package-win
```

---

# Troubleshooting

## npm command not found

Install Node.js.

Verify:

```bash
node -v
npm -v
```

---

## Xcode not found

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

---

## CocoaPods not found

```bash
sudo gem install cocoapods
```

---

## Device not detected

Run:

```bash
idevice_id -l
```

Reconnect the device and tap **Trust This Computer**.

---

## Permission Issues

Run:

```bash
sudo xcodebuild -license accept
```

---

## Clean Installation

Delete installed dependencies:

```bash
rm -rf node_modules
rm -rf appium-runtime/node_modules
```

Install again:

```bash
npm run setup
```

---

# Project Structure

```
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
```

---

# Support

For any issues during setup or execution, 
contact the AlgoShack development team and share the error logs along with screenshots for faster troubleshooting.