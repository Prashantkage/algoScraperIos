# AlgoScraper iOS

AlgoScraper iOS is an Electron-based application used to inspect iOS applications and generate XPath locators. The application automatically manages the Appium server and supports both real iOS devices and simulators.

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

# Prerequisites

Before running the application, install the following software.

## 1. Install Homebrew (if not already installed)

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

After installation:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Accept the license:

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

Clone the project from GitHub.

```bash
git clone https://github.com/Prashantkage/algoScraperautoappium.git
```

Go inside the project.

```bash
cd algoScraperautoappium
```

---

# Install Project Dependencies

Run the setup command.

```bash
npm run setup
```

This command automatically installs:

- Root project dependencies
- Appium runtime dependencies

If required, you can also install them manually.

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

# Build the macOS Application

```bash
npm run make
```

Generated application will be available under:

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

Connect the iPhone using a USB cable.

Trust the Mac when prompted.

Verify device detection.

```bash
idevice_id -l
```

A connected device UDID should be displayed.

---

# Run the Scraper

1. Launch AlgoScraper.
2. Enter the authentication token.
3. Wait until the status changes to **Connected**.
4. Choose Simulator or Real Device.
5. Select the application.
6. Start inspection.
7. Click any UI element to generate XPath.
8. Export the generated locators if required.

---

# Update the Project

If the repository receives updates:

```bash
git pull origin main
```

Install any newly added dependencies.

```bash
npm run setup
```

Start the application.

```bash
npm start
```

---

# Git Commands

Clone Repository

```bash
git clone https://github.com/Prashantkage/algoScraperautoappium.git
```

Move into project

```bash
cd algoScraperautoappium
```

Pull latest changes

```bash
git pull origin main
```

Install dependencies

```bash
npm run setup
```

Start application

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

Verify:

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

Delete dependencies.

```bash
rm -rf node_modules
rm -rf appium-runtime/node_modules
```

Install again.

```bash
npm run setup
```

---

# Project Structure

```
algoScraperautoappium
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

If you encounter any issues while setting up or running the application, 
contact the AlgoShack development team with the error logs and screenshots for assistance.