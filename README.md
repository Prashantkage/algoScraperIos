AlgoScraper Setup Guide
1. Key Features
   Automatic Appium Server Management: Automatically checks, starts, and manages the bundled Appium server instance if no external server is running.

Dual Platform Inspection: Full XPath locator inspection and layout hierarchy parsing for both iOS and Android applications.

Precision Targeting: Accurate child element detection with automated multi-layer nested parent node tracing.

Interactive Canvas Mirror: Real-time screen mirroring supporting dynamic zoom, pan-to-drag, and hover-based element highlighting.

Device Interaction Tracking: Supports interactive tap and touch gesture simulations directly over the viewport.

AlgoQA Integration: Instantly packages and exports structured locator files to sync with your AlgoQA project dashboard.

2. Prerequisites (Install via Terminal)
   Bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Configure Xcode Pathway
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept

# Install iOS Deployment Tools
sudo gem install cocoapods
brew install libimobiledevice
npm install -g ios-deploy
3. Project Setup & Execution
   Bash
# Clone and enter repository
git clone https://github.com/Prashantkage/algoScraperIos.git
cd algoScraperIos

# Automated Installation
npm run setup

# Fallback Manual Installation (If automated setup fails)
npm install && cd appium-runtime && npm install && cd ..

# Run the application
npm start
4. Build Commands
   Bash
# Build Mac App (.app / .dmg)
npm run make

# Build Windows Package
npm run package-win



# Delete the build/out directories in your project
rm -rf out/ algoScraper-builds/

# Deep clean Node/Appium compilation caches within your workspace
find . -name "CompilationCache.noindex" -type d -exec rm -rf {} +
find . -name ".cache" -type d -exec rm -rf {} +;  