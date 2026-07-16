const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const url = require('url');
const path = require('path');
const wd = require("selenium-webdriver");
const { exec, spawn } = require('child_process');
const { Menu } = require('electron');
const ADB_PATH = '/Users/divum/Library/Android/sdk/platform-tools/adb';
var appPackage
var deviceId;
let mainWindow;
let loadingWindow;
var deviceName;
let launchedFromProtocol = false;


const http = require('http');
let appiumProcess = null;

function checkAppium() {

    return new Promise((resolve) => {

        const req = http.get(
            "http://127.0.0.1:4723/status",
            (res) => {
                resolve(res.statusCode === 200);
            }
        );

        req.on("error", () => {
            resolve(false);
        });

        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });

    });

}

const { fork } = require('child_process'); // Ensure fork is extracted along with spawn/exec at top if not already

async function startAppium() {

    return new Promise((resolve, reject) => {

        if (appiumProcess) {
            resolve();
            return;
        }

        const baseRuntimePath = app.isPackaged
            ? path.join(process.resourcesPath, "appium-runtime")
            : path.join(__dirname, "..", "appium-runtime");

        const appiumMain = path.join(
            baseRuntimePath,
            "node_modules",
            "appium",
            "build",
            "lib",
            "main.js"
        );

        console.log("Starting bundled Appium:", appiumMain);

        // Explicitly inherit system environment variables and force APPIUM_HOME
        // to point right into your unpacked runtime workspace folder.
        const appiumEnv = Object.assign({}, process.env, {
            APPIUM_HOME: baseRuntimePath
        });

        appiumProcess = fork(
            appiumMain,
            [],
            {
                cwd: baseRuntimePath,
                detached: false,
                env: appiumEnv, // <-- Passes down the runtime route context
                stdio: ["ignore", "pipe", "pipe", "ipc"]
            }
        );

        let started = false;

        appiumProcess.on("spawn", () => {
            started = true;
            resolve();
        });

        appiumProcess.stdout.on("data", (data) => {
            console.log("[Appium]", data.toString());
        });

        appiumProcess.stderr.on("data", (data) => {
            console.log("[Appium Error]", data.toString());
        });

        appiumProcess.on("error", (err) => {
            reject(err);
        });

        appiumProcess.on("exit", (code) => {
            if (!started) {
                reject(new Error(`Appium exited immediately with code ${code}`));
            }
        });
    });
}

async function waitForAppium(timeout = 60000) {

    const start = Date.now();

    while (Date.now() - start < timeout) {

        const running = await checkAppium();

        if (running) {
            return true;
        }

        await new Promise(r => setTimeout(r, 1000));

    }

    return false;

}

async function ensureAppiumStarted() {

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        console.log(`Starting Appium (Attempt ${attempt}/${MAX_RETRIES})`);

        updateLoadingMessage(
            `Starting Automation Engine (${attempt}/${MAX_RETRIES})`
        );

        try {

            await startAppium();

            const running = await waitForAppium(20000);

            if (running) {
                return true;
            }

        } catch (e) {
            console.log("Appium start failed:", e);
        }

        if (appiumProcess) {
            appiumProcess.kill();
            appiumProcess = null;
        }

        await new Promise(r => setTimeout(r, 2000));

    }

    return false;

}

async function checkDeviceConnected() {

  await getConnectedIOSDevices();

  if (connectedDevices.length > 0) {
    deviceId = connectedDevices[0].id;
    deviceName = connectedDevices[0].name;
  }

  return connectedDevices.length > 0;
}

ipcMain.on('msg', (event, message) => {
  if (message){
    // startApp(message);
  }
 });
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createLoadingWindow() {

  loadingWindow = new BrowserWindow({
    width: 400,
    height: 250,
    frame: false,
    transparent: false,
    backgroundColor: "#2d2d30",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    show: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Convert the local GIF to inline Base64 to bypass Chromium security restrictions on data: URLs
  let loaderSrc = "";
  try {
    const fs = require('fs');
    // Checks root execution path first, then common subdirectories
    let iconPath = path.join(__dirname, 'icon', 'load-8510_256.gif');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, 'src', 'icon', 'load-8510_256.gif');
    }

    if (fs.existsSync(iconPath)) {
      const base64Data = fs.readFileSync(iconPath, 'base64');
      loaderSrc = `data:image/gif;base64,${base64Data}`;
    }
  } catch (err) {
    console.error("Error reading loader GIF asset:", err);
  }

  loadingWindow.loadURL(
    "data:text/html;charset=utf-8," +
    encodeURIComponent(`
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">

<style>

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

html,
body{
  width:100%;
  height:100%;
  overflow:hidden;
}

body{
  background:#2d2d30;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}

.popup{

  position:relative;

  width:100%;
  height:100%;

  background:linear-gradient(
    180deg,
    #3a3a3d 0%,
    #2d2d30 100%
  );

  border:1px solid rgba(255,255,255,.15);

  border-radius:18px;

  overflow:hidden;

}

/* AlgoScraper badge */

.brand{

  position:absolute;

  top:0;
  left:0;

  width:215px;
  height:48px;

  background:linear-gradient(
    90deg,
    #1f6fff,
    #46b9ff
  );

  border-radius:0 0 30px 0;

  display:flex;

  align-items:center;

  padding-left:18px;

  color:#ffffff;

  font-size:16px;

  font-weight:700;

  z-index:2;

}

/* Bottom blue line continuing to the end */
.bottom-line{

  position:absolute;

  top:48px;

  left:0;

  width:100%;

  height:2px;

  background:#3aa9ff;

  z-index:1;

}

/* Main content */

.content{

  width:100%;
  height:100%;

  display:flex;

  flex-direction:column;

  justify-content:center;

  align-items:center;

  padding-top:40px;

}

.loader-image {
  width: 64px;
  height: 64px;
  margin-bottom: 18px;
  object-fit: contain;
  -webkit-user-drag: none;
}

h1{

  color:#ffffff;

  font-size:22px;

  font-weight:700;

  margin-bottom:10px;

}

p{

  color:#d0d0d0;

  font-size:15px;

  font-weight:500;

}

</style>

</head>

<body>

<div class="popup">

  <div class="bottom-line"></div>

  <div class="brand">
    AlgoScraper
  </div>

  <div class="content">

    <!-- Replaced old CSS spinner container with the fluid native GIF element link context -->
    <img src="${loaderSrc}" class="loader-image" alt="Loading Engine Context..." />

    <h1>Please wait</h1>

    <p>
      Checking prerequisites<span id="dots"></span>
    </p>

  </div>

</div>

<script>

let dots = 0;

setInterval(() => {

  dots = (dots + 1) % 4;

  document.getElementById("dots").textContent =
    ".".repeat(dots);

}, 450);

</script>

</body>

</html>
`)
  );

}

function updateLoadingMessage(message) {

  if (
    loadingWindow &&
    !loadingWindow.isDestroyed()
  ) {

    loadingWindow.webContents.executeJavaScript(`
      document.querySelector(".content p").innerHTML =
      "${message}<span id='dots'></span>";
    `);

  }

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showStep(message, delay = 1000) {

    updateLoadingMessage(message);

    await sleep(delay);

}

async function showSuccess(message, delay = 700) {

    updateLoadingMessage(`✔ ${message}`);

    await sleep(delay);

}






const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
            nodeIntegration: true,
//             preload: path.join(__dirname, 'popup.js'),
            contextIsolation: false,
            enableRemoteModule: true,
         }
  });

  Menu.setApplicationMenu(null);
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'Close' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  // and load the index.html of the app.
 mainWindow.loadFile('./src/index.html');

 mainWindow.maximize();

 mainWindow.once("ready-to-show", () => {

    mainWindow.show();
    mainWindow.focus();

    mainWindow.webContents.send(
       "launch-mode",
       launchedFromProtocol
    );

 });

  // Open the DevTools.
//  mainWindow.webContents.openDevTools();
};

// By = wd.By,
// until = wd.until;

 async function startApp(message) {
   var desiredCaps = {
     platformName: message[0],
     deviceName: message[1],
     appPackage: message[2],
     appActivity: message[3],
     browserName: '',
 };
     //Initiating the Driver
     try{
     let driver = await new wd.Builder().usingServer("http://127.0.0.1:4723/wd/hub").withCapabilities(desiredCaps).build();
     }catch(error){
       console.log("error: ", error)
     }

 }



// Variable to store the list of devices
let connectedDevices = [];

async function getConnectedIOSDevices() {
  return new Promise((resolve, reject) => {

    const devices = [];

    // 1. Get BOOTED simulators
    exec("xcrun simctl list devices booted", (simError, simStdout) => {

      if (!simError) {

        const lines = simStdout.split("\n");

        lines.forEach(line => {

          const match = line.match(/(.*?)\s+\(([A-F0-9-]+)\)\s+\(Booted\)/);

          if (match) {
            devices.push({
                id: match[2],
                name: match[1].trim(),
                type: "simulator"
            });
          }

        });

      }

      // 2. Get CONNECTED physical iPhones
      // 2. Get CONNECTED physical iPhones
            exec("xcrun xcdevice list", (phyError, phyStdout) => {

              if (!phyError && phyStdout) {
                try {
                  const allDevices = JSON.parse(phyStdout);
                  if (Array.isArray(allDevices)) {
                      allDevices.forEach(device => {
                        if (
                          device &&
                          device.available === true &&
                          device.simulator === false &&
                          device.platform === "com.apple.platform.iphoneos"
                        ) {
                          devices.push({
                              id: device.identifier,
                              name: device.name,
                              type: "physical"
                          });
                        }
                      });
                  }
                } catch (e) {
                  console.log("xcdevice parse error safely caught:", e);
                }
              }

              connectedDevices = devices;
              resolve(devices); // Keeps the promise resolving cleanly even if no physical devices exist
            });

    });

  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow);
app.on('ready', async () => {

  app.setAsDefaultProtocolClient("myapp");

  // Show loading window
  createLoadingWindow();

  await showStep(
      "Checking Prerequisites",
      1000
  );

  await showSuccess(
      "Prerequisites Checked",
      600
  );

  console.log("CHECKING APPIUM");

  await showStep(
      "Checking Appium",
      1000
  );

  // Check if Appium is already running externally
  let appiumRunning = await checkAppium();

  if (appiumRunning) {

      usingBundledAppium = false;

      await showSuccess(
          "Appium Running",
          700
      );

  } else {

      // If not running, fall back to starting the built-in bundled Appium
      console.log("Starting Appium...");

      await showStep(
          "Starting Automation Engine",
          800
      );

      usingBundledAppium = true;
      appiumRunning = await ensureAppiumStarted();

      if (appiumRunning) {

          await showSuccess(
              "Automation Engine Ready",
              700
          );

      } else {

          if (loadingWindow && !loadingWindow.isDestroyed()) {
              loadingWindow.destroy();
              loadingWindow = null;
          }

          dialog.showErrorBox(
              "Startup Failed",
              "AlgoScraper couldn't initialize its automation engine.\n\nPlease restart the application."
          );

          app.quit();
          return;
      }
  }

  // Check for connected devices after Appium state is determined
  // Check for connected devices after Appium state is determined
    console.log("CHECKING DEVICE");

    await showStep(
        "Checking Connected Device",
        1000
    );

    let deviceConnected = false;
    try {
        deviceConnected = await checkDeviceConnected();
    } catch (deviceError) {
        console.error("Device detection caught an execution error:", deviceError);
        deviceConnected = false;
    }

    if (deviceConnected) {

        await showSuccess(
            `${deviceName} Ready`,
            1000
        );

    } else {

        if (loadingWindow && !loadingWindow.isDestroyed()) {
          loadingWindow.destroy();
          loadingWindow = null;
        }

        dialog.showErrorBox(
          "No iOS Device Found",
          "Please connect an iPhone or start an iOS Simulator."
        );

        app.quit();
        return;
    }

  // Close loading window safely
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.destroy();
    loadingWindow = null;
  }

  await showStep(
      "Launching AlgoScraper",
      700
  );

  // Open scraper main window
  createWindow();

});

app.on("second-instance", (event, commandLine) => {
  const deepLink = commandLine.find(arg => arg.startsWith("myapp://"));

  if (deepLink) {
    console.log("Received deep link:", deepLink);
  }

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("open-url", (event, deepLink) => {
launchedFromProtocol = true;
  event.preventDefault();

  console.log("========== DEEP LINK ==========");
  console.log(deepLink);

  const parsed = new URL(deepLink);

  const userId = parsed.searchParams.get("userId");
  const baseUrl = parsed.searchParams.get("baseUrl");
  const projectId = parsed.searchParams.get("project_id");
  const launchUrl = parsed.searchParams.get("launchUrl");
  const projectName = parsed.searchParams.get("project_name");
  const applicationTypeId = parsed.searchParams.get("application_type_id");
  const subscriptionExpiryDate =
    parsed.searchParams.get("subscription_expiry_date");

    const userData = {
      userID: Number(userId),
      baseUrl: baseUrl,
      project_id: projectId,
      launchUrl: launchUrl,
      project_name: projectName,
      application_type_id: Number(applicationTypeId),
      subscription_expiry_date: subscriptionExpiryDate
    };

  console.log("userId:", userId);
  console.log("baseUrl:", baseUrl);
  console.log("projectId:", projectId);
  console.log("launchUrl:", launchUrl);
  console.log("projectName:", projectName);
  console.log("applicationTypeId:", applicationTypeId);
  console.log("subscriptionExpiryDate:", subscriptionExpiryDate);

  // Build the final URL
  const finalUrl = launchUrl.startsWith("http")
    ? launchUrl
    : `${baseUrl}${launchUrl}`;

  console.log("Opening:", finalUrl);

  // Open the page inside Electron
  if (mainWindow) {

    mainWindow.loadURL(finalUrl);

    mainWindow.webContents.once(
      "did-finish-load",
      () => {

        mainWindow.webContents.send(
          "user-data",
          userData
        );

      }
    );

    mainWindow.show();
    mainWindow.focus();
  }
});

// Quit when all winxdows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

app.on("before-quit", () => {

    if (appiumProcess) {

        appiumProcess.kill();

        appiumProcess = null;

    }

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    const command = `adb shell am force-stop ${appPackage}`;
    exec(command, (error, stdout, stderr) => {
    });
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
   // Open scraper
   createWindow();

   mainWindow.webContents.once("did-finish-load", () => {
     mainWindow.webContents.send(
       "launch-mode",
       launchedFromProtocol
     );
   });
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


// code to recieve message from popup.js and close electron UI
ipcMain.on('appPackage', (event, message) => {
  appPackage = message
});

const appDataPath = app.getPath('appData');
const folderPath = path.join(appDataPath, 'algoScraperScreenShot');
ipcMain.on('message', (event, message) => {
  if(message === 'get me appData and device details'){
  //   if(deviceId != undefined || deviceName !=undefined){
  // event.reply('message-from-main', {folderPath, deviceId, deviceName});
  //   }
    // else{
      event.reply('message-from-main', {folderPath, connectedDevices});
    // }
  }
});

ipcMain.on('message', (event, message) => {
  if(message === 'get me appData and device details'){
      event.reply('message-from-main', {folderPath, connectedDevices});
  }
});

ipcMain.on("close-app", () => {

    console.log("Closing AlgoScraper...");

    // Close any running simulator
    exec(
        "xcrun simctl shutdown all",
        (err) => {

            if (err) {
                console.log(
                    "No simulator running"
                );
            }

            app.quit();
        }
    );

});
ipcMain.on("get-installed-apps", (event, selectedDevice) => {

    if (!selectedDevice) {
        event.reply("installed-apps", []);
        return;
    }

    const udid = selectedDevice.id;

    let command = "";

    if (selectedDevice.type === "simulator") {
        command = `xcrun simctl listapps "${udid}"`;
    } else {
        command = `xcrun devicectl device info apps --device "${udid}"`;
    }

    exec(command, (error, stdout) => {

        if (error) {
            event.reply("installed-apps", []);
            return;
        }

        const apps = [];

        const appRegex = /"([^"]+)"\s*=\s*\{([\s\S]*?)\n\s*\};/g;

        let match;

        while ((match = appRegex.exec(stdout)) !== null) {

            const bundleId = match[1];
            const body = match[2];

            let displayName = bundleId;

            const displayMatch = body.match(/CFBundleDisplayName\s*=\s*"([^"]+)"/);
            const nameMatch = body.match(/CFBundleName\s*=\s*"([^"]+)"/);
            const executableMatch = body.match(/CFBundleExecutable\s*=\s*"?([^";]+)"?/);

            if (displayMatch) {

                displayName = displayMatch[1];

            } else if (nameMatch) {

                displayName = nameMatch[1];

            } else if (executableMatch) {

                displayName = executableMatch[1];

            }

            const executable = executableMatch ? executableMatch[1] : "";

            // Skip invalid entries
            if (!displayName || !executable) {
                continue;
            }

            // Skip internal Apple helper apps
            if (
                bundleId.includes("WebDriverAgent") ||
                bundleId.includes("Poster") ||
                bundleId.includes("Wallpaper") ||
                bundleId.includes("Bridge") ||
                bundleId.includes("IntegrationApp") ||
                bundleId.includes("Preview") ||
                bundleId.includes("webapp") ||
                bundleId.includes("Runner") ||
                bundleId.includes("Sticker") ||
                bundleId.includes("MessagesViewService") ||
                bundleId.includes("ShareExtension") ||
                bundleId.includes("Notification") ||
                bundleId.includes("QuickLook")
            ) {
                continue;
            }

            apps.push({
                name: displayName,
                bundleId: bundleId
            });
        }

        // Remove duplicate bundle IDs
        const uniqueApps = Array.from(
            new Map(apps.map(app => [app.bundleId, app])).values()
        );

        uniqueApps.sort((a, b) => a.name.localeCompare(b.name));

        event.reply("installed-apps", uniqueApps);

    });

});