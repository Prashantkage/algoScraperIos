    //now changed
    const wd = require("selenium-webdriver");
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const { ipcRenderer } = require('electron');

    const os = require('os');
    const { exec } = require('child_process');
    var folderPath;
    By = wd.By,
      until = wd.until;
    var initialData = [];
    var driver;
    var imgTagFlag = false;
    var ssflag = false;
    var dtControls = [];
    let counter = 0;
    let count = 0;
    var downloadcontrolNameLists=[];
    var controlNameLists = [];
    var systemAppData
    var tableCreated = false;
    var xpath_id = 0;
    var showElement = false;
    var screenNameList = [];
    var deviceId;
    var deviceName;
    var connectedDevices = [];
    let launchedViaProtocol = false;
    let rotation = 0;
    let zoomLevel = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let scrollStartLeft = 0;
    let scrollStartTop = 0;
    let hasDragged = false;
    const BASE_WIDTH = 250;
    const BASE_HEIGHT = 480;
    let tapMode = true;   // default enabled
    let showElementHover = false;
    let touchInProgress = false;
    let hoverRequestId = 0;
    let hoverTimer = null;
    let lastXPath = "";


    function showErrorPopup(title, error) {
        const titleElem = document.getElementById('launchErrorTitle');
        const logElem = document.getElementById('launchErrorLog');
        const popupElem = document.getElementById('launchErrorPopup');
        const overlayElem = document.getElementById('overlay');
        const appRunningPopup = document.getElementById('AppRunningPopup');

        if (appRunningPopup) appRunningPopup.style.display = 'none';
        if (overlayElem) overlayElem.style.display = 'block';

        if (titleElem) titleElem.innerText = title;
        if (logElem) {
            logElem.innerText = error?.stack || error?.message || String(error);
        }

        if (popupElem) popupElem.style.display = 'block';

        const okBtn = document.getElementById("okay_button");
        if (okBtn) {
            okBtn.onclick = () => {
                if (popupElem) popupElem.style.display = 'none';
                if (overlayElem) overlayElem.style.display = 'none';

                // Send close event to main process to stop all background processes and quit app
                ipcRenderer.send("close-app");
            };
        }
    }

    ipcRenderer.on(
        "user-data",
        (event, userData) => {

            console.log(
                "Received User Data:",
                userData
            );

            localStorage.setItem(
                "algoQAUser",
                JSON.stringify(userData)
            );

            console.log(
                "Saved To LocalStorage:",
                userData
            );
        }
    );

    // 1. Create a dedicated ResizeObserver for the table container
    const tableContainerObserver = new ResizeObserver(() => {
        // requestAnimationFrame ensures this runs smoothly alongside browser repaints
        requestAnimationFrame(adjustEmptyRows);
    });

    window.addEventListener("DOMContentLoaded", () => {
        const tableContainer = document.getElementById('table-container');

        if (tableContainer) {
            // 2. Attach the observer. Any time the container changes size
            // (including when display goes from 'none' to 'block'), it will auto-adjust rows.
            tableContainerObserver.observe(tableContainer);
            tableContainer.style.display = "block";
        }

        // 3. Use a slight timeout on initial load to guarantee CSS files have fully applied
        setTimeout(() => {
            renderDefaultExcelGrid();
            initResizableTable();
        }, 50);
    });

    window.addEventListener("DOMContentLoaded", () => {
            document.getElementById("split-div3").style.display = "none";

            document.getElementById("tapBtn").style.background = "#4285F4";
            document.getElementById("tapBtn").style.color = "#fff";

            document.getElementById("touchBtn").style.background = "#fff";
            document.getElementById("touchBtn").style.color = "#333";

            const tokenInput = document.getElementById("tokenInput");
            const tokenStatus = document.getElementById("tokenStatus");
            const changeTokenBtn = document.getElementById("changeTokenBtn");

            // ALWAYS clear past session on a fresh app launch so it never auto-connects
            localStorage.removeItem("algoQAUser");

            // STRICT DISCONNECTED STATE ON LOAD: Show input, strictly hide status and change button
            if (tokenInput) {
                tokenInput.value = "";
                tokenInput.style.setProperty("display", "inline-block", "important");
                tokenInput.disabled = false;
                tokenInput.readOnly = false;
            }
            if (tokenStatus) tokenStatus.style.setProperty("display", "none", "important");
            if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "none", "important");

            const runBtn = document.getElementById("Run");
            if (runBtn) {
                runBtn.disabled = true;
                runBtn.style.backgroundColor = "#B6B6B4";
            }
        });

    // 1. Unified function to handle UI state safely
    function applyLaunchModeState() {
        const tokenInput = document.getElementById("tokenInput");
        const changeTokenBtn = document.getElementById("changeTokenBtn");
        const tokenStatus = document.getElementById("tokenStatus");

        if (launchedViaProtocol) {
            // DEEP LINK MODE: Hide all token controls completely
            if (tokenInput) tokenInput.style.setProperty("display", "none", "important");
            if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "none", "important");
            if (tokenStatus) tokenStatus.style.setProperty("display", "none", "important");

            document.getElementById("Run").disabled = false;
            document.getElementById("Run").style.backgroundColor = "#4285F4";
            document.getElementById("Scrape").disabled = true;
            document.getElementById("Scrape").style.backgroundColor = "#B6B6B4";
            document.getElementById("download").disabled = true;
            document.getElementById("download").style.backgroundColor = "#B6B6B4";
            document.getElementById("reset").disabled = true;
            document.getElementById("reset").style.backgroundColor = "#B6B6B4";
            document.getElementById("scrapeUI").disabled = true;
            document.getElementById("scrapeUI").style.backgroundColor = "#B6B6B4";
            document.getElementById("algoQA").disabled = true;
            document.getElementById("algoQA").style.backgroundColor = "#B6B6B4";
        } else {
            // NORMAL MODE: Enforce strict disconnected state.
            if (tokenInput) {
                tokenInput.style.setProperty("display", "inline-block", "important");
                tokenInput.value = "";
                tokenInput.disabled = false;
                tokenInput.readOnly = false;
            }
            if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "none", "important");
            if (tokenStatus) tokenStatus.style.setProperty("display", "none", "important");

            const runBtn = document.getElementById("Run");
            if (runBtn) {
                runBtn.disabled = true;
                runBtn.style.backgroundColor = "#B6B6B4";
            }
        }
    }

    // 2. Handle incoming IPC from main process
    ipcRenderer.on("launch-mode", (event, launchedFromProtocol) => {
        launchedViaProtocol = launchedFromProtocol;

        // If DOM is already loaded (e.g., app was already open), apply changes immediately
        if (document.readyState === "interactive" || document.readyState === "complete") {
            applyLaunchModeState();
        }
    });

    // 3. Handle initial DOM load
    window.addEventListener("DOMContentLoaded", () => {
        document.getElementById("split-div3").style.display = "none";

        document.getElementById("tapBtn").style.background = "#4285F4";
        document.getElementById("tapBtn").style.color = "#fff";

        document.getElementById("touchBtn").style.background = "#fff";
        document.getElementById("touchBtn").style.color = "#333";

        // ALWAYS clear past session on a fresh app launch so it never auto-connects
        localStorage.removeItem("algoQAUser");

        // Apply the correct state (this fixes the cold boot race condition)
        applyLaunchModeState();
    });

    const CryptoJS = require("crypto-js");

    const secretKey = "algoshackv5-123";

    function decryptData(cipherText) {
        try {
            const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
            // Enforcing strict UTF-8 conversion drops malformed block fragments
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);

            // If the parsing fails to return readable text, it's an invalid block sequence
            if (!decrypted || decrypted.trim() === "") {
                return null;
            }

            console.log("Decrypted successfully:", decrypted);
            return decrypted;
        } catch (err) {
            console.error("Decrypt Error:", err);
            return null;
        }
    }

    // var controlIdList =[];
    // let screenName = false;

    var plateformName = document.getElementById('platformname');
    var plateformOption = plateformName.options[plateformName.selectedIndex].text;

    document.getElementById('platformname').value = 'IOS';
    document.getElementById('platformname').disabled = true;

    prestart();
    document.getElementById('automationName').value = 'XCUITest';

    ipcRenderer.send('message', 'get me appData and device details');

    ipcRenderer.on('message-from-main', (event, message) => {

        connectedDevices = message.connectedDevices || [];

        console.log("connectedDevices =", connectedDevices);

        if (connectedDevices.length > 0) {

            const deviceSelect = document.getElementById('devicename');

            deviceSelect.innerHTML = '';

            connectedDevices.forEach((device) => {

                const option = document.createElement('option');

                option.value = device.name;
                option.text = device.name;

                deviceSelect.appendChild(option);
            });

            deviceId = connectedDevices[0].id;
            deviceName = connectedDevices[0].name;

            deviceSelect.value = deviceName;

            document.getElementById('udid').value = deviceId;

            const selectedDevice =
                connectedDevices.find(
                    device =>
                        device.name ===
                        document.getElementById("devicename").value
                );

            ipcRenderer.send(
                "get-installed-apps",
                selectedDevice
            );
        }
    });

    document.getElementById('platformname').disabled = true;


    ipcRenderer.on("installed-apps", (event, apps) => {

        console.log("Installed Apps:", apps);

        const dropdown = document.getElementById("appname");

        dropdown.innerHTML = "";

        apps.forEach(app => {

            const option = document.createElement("option");

            option.text = app.name;
            option.value = app.bundleId;

            dropdown.appendChild(option);

        });

        if (apps.length > 0) {
            dropdown.selectedIndex = 0;
            document.getElementById("bundleID").value =
                apps[0].bundleId;
        }

    });

    document
    .getElementById("appname")
    .addEventListener("change", function(){

        document.getElementById("bundleID").value =
            this.value;

    });


    const homeDirectory = require('os').homedir();
    folderPath = path.join(homeDirectory, 'algoScraperScreenShot');
    document.getElementById('Scrape').disabled = true;
    document.getElementById('Scrape').style.backgroundColor = '#B6B6B4'
    document.getElementById('download').disabled = true;
    document.getElementById('download').style.backgroundColor = '#B6B6B4'
        document.getElementById('reset').disabled = true;
      document.getElementById('reset').style.backgroundColor = '#B6B6B4'
    document.getElementById('scrapeUI').disabled = true;
    document.getElementById('scrapeUI').style.backgroundColor = '#B6B6B4';

    document.getElementById('algoQA').disabled = true;
    document.getElementById('algoQA').style.backgroundColor = '#B6B6B4';

    document.getElementById("Run").addEventListener('click', async () => {
          var plateformName = document.getElementById('platformname');
          var plateformOption = plateformName.options[plateformName.selectedIndex].text;
          const information = document.getElementById('info')
          var appName = document.getElementById('appname').value;
          var deviceName = document.getElementById('devicename').value;
          var udidName = document.getElementById('udid').value;
          var platformVersion = document.getElementById('platformversion').value;
          var automationName = document.getElementById('automationName').value;
          var bundleID = document.getElementById('bundleID').value;
          var appPackage = document.getElementById('apppackage').value;
          var appActivity = document.getElementById('appactivity').value;
          var appiumURL = document.getElementById('appiumurl').value;

          // NEW HELPER: Shows the loading GIF beautifully inside the screenshot dummy container
          function triggerScreenshotLoader() {
              document.getElementById('overlay').style.display = 'block'; // Keep background unclickable
              document.getElementById('AppRunningPopup').style.display = 'none'; // Force hide the giant popup

              const dummyDevice = document.getElementById("dummyDevice");
              if (dummyDevice) {
                  dummyDevice.style.display = "block";
                  dummyDevice.innerHTML = `
                      <div class="phone-welcome-overlay">
                          <img src="icon/load-8510_256.gif" style="height: 50px; width: 50px; margin-bottom: 15px;" />
                          <p>Starting Session & Fetching Screen...</p>
                      </div>
                  `;
              }
          }


            if (appName.trim() === '') document.getElementById('appname').style.borderColor = 'red';
            if (deviceName.trim() === '') document.getElementById('devicename').style.borderColor = 'red';
            if (udidName.trim() === '') document.getElementById('udid').style.borderColor = 'red';
            if (appiumURL.trim() === '') document.getElementById('appiumurl').style.borderColor = 'red';
            if (platformVersion.trim() === '') document.getElementById('platformversion').style.borderColor = 'red';
            if (automationName.trim() === '') document.getElementById('automationName').style.borderColor = 'red';
            if (bundleID.trim() === '') document.getElementById('bundleID').style.borderColor = 'red';

            if (appName.trim() != '' && deviceName.trim() != '' && udidName.trim() != '' && platformVersion.trim() != '' && automationName.trim() != '' && appiumURL.trim() != '' && bundleID.trim() != '') {
              document.getElementById('platformname').disabled = true;

              triggerScreenshotLoader(); // Show loading in screenshot area

              initialData.push(plateformOption, deviceName, platformVersion, automationName, appiumURL, udidName, bundleID);
              launchApp(initialData)
              document.getElementById("appname").disabled = true;
              document.getElementById("devicename").disabled = true;
              document.getElementById("udid").disabled = true;
              document.getElementById("appiumurl").disabled = true;
              document.getElementById("platformversion").disabled = true;
              document.getElementById("automationName").disabled = true;
              document.getElementById("bundleID").disabled = true;
            }

        });


    async function startApp(initialData) {


        var IOS_desiredCaps = {
            platformName: initialData[0],
            "appium:options": {
                deviceName: initialData[1],
                platformVersion: initialData[2],
                automationName: initialData[3],
                udid: initialData[5],
                bundleId: initialData[6],
                simpleIsVisibleCheck: true,
                preventWDAAttachments: true,
                useJSONSource: false,
                newCommandTimeout: 500000
            }
        };
    }


    async function launchApp(initialData) {
        var darwin_IOS_desiredCaps = {
            platformName: initialData[0],
            "appium:options": {
                deviceName: initialData[1],
                platformVersion: initialData[2],
                automationName: initialData[3],
                udid: initialData[5],
                bundleId: initialData[6],
                simpleIsVisibleCheck: true,
                preventWDAAttachments: true,
                useJSONSource: false,
                newCommandTimeout: 500000
            }
        };

        try {
                driver = await new wd.Builder().usingServer(initialData[4]).withCapabilities(darwin_IOS_desiredCaps).forBrowser("").build();
                console.log("iOS Driver Session Established. Activating application bundle...");
                await driver.executeScript("mobile: activateApp", { bundleId: initialData[6] });
        } catch (error) {
            console.error("Failed to initialize driver session:", error);
            showErrorPopup("Appium Driver Initialization Failed", error);
            return;
        }

        document.getElementById('Run').disabled = true;
        document.getElementById('Run').style.backgroundColor = '#B6B6B4';
        document.getElementById('Scrape').disabled = false;
        document.getElementById('Scrape').style.backgroundColor = '#4285F4';
        document.getElementById('download').disabled = false;
        document.getElementById('download').style.backgroundColor = '#4285F4';
        document.getElementById('reset').disabled = false;
        document.getElementById('reset').style.backgroundColor = '#4285F4';
        document.getElementById('scrapeUI').disabled = false;
        document.getElementById('scrapeUI').style.backgroundColor = '#4285F4';
        document.getElementById('algoQA').disabled = false;
        document.getElementById('algoQA').style.backgroundColor = '#4285F4';
        document.getElementById('AppRunningPopup').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('recordScenarioBtn').disabled = false;
        document.getElementById('recordScenarioBtn').style.backgroundColor = '#4285F4';

        await loadFirstScreen();
    }






    async function loadFirstScreen() {
        try {
            await driver.sleep(2000);

            const image =
                await driver.takeScreenshot();

            const homeDirectory =
                require("os").homedir();

            folderPath =
                path.join(
                    homeDirectory,
                    "algoScraperScreenShot"
                );

            if (!fs.existsSync(folderPath)) {

                fs.mkdirSync(
                    folderPath,
                    { recursive: true }
                );
            }

            require("fs").writeFileSync(
                `${folderPath}/image0.png`,
                image,
                "base64"
            );

            const dummy =
                document.getElementById("dummyDevice");

            if (dummy) {

                dummy.style.display = "none";

            }

            let img =
                document.getElementById("screenshot");

            if (!img) {

                img =
                    document.createElement("img");

                img.id = "screenshot";
                enableImageDragging(img);

                img.onmousemove = function (e) {

                    previewElement(e);

                };

                img.onmouseleave = function () {

                    showElementHover = false;

                    lastXPath = "";

                    clearTimeout(hoverTimer);

                    clearOverlay();

                };

                let deviceSwipeStartX = 0;
                let deviceSwipeStartY = 0;
                let isDeviceSwiping = false;

                img.onmousedown = function (e) {
                    if (tapMode || zoomLevel > 1) return; // Ignore if in scrape mode or zoomed
                    deviceSwipeStartX = e.clientX;
                    deviceSwipeStartY = e.clientY;
                    isDeviceSwiping = false;
                };

                img.onmouseup = async function (e) {
                    if (tapMode || zoomLevel > 1) return;

                    const diffX = e.clientX - deviceSwipeStartX;
                    const diffY = e.clientY - deviceSwipeStartY;
                    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

                    // If dragged more than 15 pixels, treat it as a scroll
                    if (distance > 15) {
                        isDeviceSwiping = true;

                        const rect = img.getBoundingClientRect();
                        const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                        const appWidth = parseFloat(appNode.getAttribute("width"));
                        const appHeight = parseFloat(appNode.getAttribute("height"));
                        const scaleX = appWidth / rect.width;
                        const scaleY = appHeight / rect.height;

                        const startX = Math.round((deviceSwipeStartX - rect.left) * scaleX);
                        const startY = Math.round((deviceSwipeStartY - rect.top) * scaleY);
                        const endX = Math.round((e.clientX - rect.left) * scaleX);
                        const endY = Math.round((e.clientY - rect.top) * scaleY);

                        await performSwipe(startX, startY, endX, endY);
                    }
                };

                img.onclick = async function (e) {
                    if (hasDragged) return;

                    if (!tapMode) {
                        if (isDeviceSwiping) return; // Prevent tapping if we just finished scrolling

                        const rect = img.getBoundingClientRect();
                        const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                        const appWidth = parseFloat(appNode.getAttribute("width"));
                        const appHeight = parseFloat(appNode.getAttribute("height"));
                        const scaleX = appWidth / rect.width;
                        const scaleY = appHeight / rect.height;
                        const x = Math.round((e.clientX - rect.left) * scaleX);
                        const y = Math.round((e.clientY - rect.top) * scaleY);

                        await performTouch(x, y);
                        return;
                    }

                    const rect = img.getBoundingClientRect();
                    const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                    const appWidth = parseFloat(appNode.getAttribute("width"));
                    const appHeight = parseFloat(appNode.getAttribute("height"));
                    const scaleX = appWidth / rect.width;
                    const scaleY = appHeight / rect.height;
                    const clickX = (e.clientX - rect.left) * scaleX;
                    const clickY = (e.clientY - rect.top) * scaleY;

                    findIOSLocator(clickX, clickY);
                };

                document
                    .getElementById("image-container")
                    .appendChild(img);

                imgTagFlag = true;
            }

            rotation = 0;
            zoomLevel = 1;

            img.src =
                `${folderPath}/image0.png?${Date.now()}`;

            img.style.width =
                BASE_WIDTH + "px";

            img.style.height =
                BASE_HEIGHT + "px";

            img.style.maxWidth =
                "none";

            img.style.maxHeight =
                "none";

            img.style.objectFit =
                "unset";

            img.style.display =
                "block";

            img.style.margin =
                "0 auto";

            img.style.transform =
                "scale(1) rotate(0deg)";

            // Load XML so hover/tap/show element work immediately

            const pageSource =
                await driver.getPageSource();

            const parser =
                new DOMParser();

            window.xmlDoc =
                parser.parseFromString(
                    pageSource,
                    "text/xml"
                );

        } catch (error) {
            console.error("Screenshot capture failed:", error);
            // Call the new UI error handler instead of crashing
            displayScreenshotError(error);
        }
    }




// action to perform on clicking scrape (Load Page) button
document.getElementById("Scrape").addEventListener('click', async () => {
    document.getElementById('searchbox').value = '';
    document.getElementById('brokenText').style.display = 'none';
    const ssElement = document.getElementById('ss');
    if (ssElement) {
        ssElement.remove();
    }
    if (typeof noResultsMessage !== 'undefined') {
        noResultsMessage.style.display = 'none';
    }

    try {
        var plateformName = document.getElementById('platformname');
        var pagename_searchbox_Field = document.getElementById('pagename_searchbox').value;

        // 1. STRICT GLOBAL VALIDATION CHECK
        if (!isGlobalPageNameValid(pagename_searchbox_Field)) {
            handleInvalidPageNameAttempt();
            return;
        }

        var controlIdList = [];
        controlNameLists = [];

        // 2. DUPLICATE PAGE NAME CHECK
        if (!screenNameList.includes(pagename_searchbox_Field)) {

            var plateformOption = plateformName.options[plateformName.selectedIndex].text;
            document.getElementById('sttus_bar_div').style.display = 'none';
            document.getElementById('div_status_bar').style.display = 'block';

            // Lock UI during scrape
            document.getElementById('Scrape').style.backgroundColor = '#B6B6B4';
            document.getElementById('Scrape').disabled = true;
            document.getElementById('reset').style.backgroundColor = '#B6B6B4';
            document.getElementById('reset').disabled = true;
            document.getElementById('download').style.backgroundColor = '#B6B6B4';
            document.getElementById('download').disabled = true;

            const homeDirectory = require('os').homedir();
            folderPath = path.join(homeDirectory, 'algoScraperScreenShot');

            try {
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
            } catch (err) {
                console.error("Folder creation error:", err);
            }

            // Capture screenshot
            const image = await driver.takeScreenshot();
            require('fs').writeFileSync(`${folderPath}/image${counter}.png`, image, 'base64');

            await addImage();

            var firstlist = [];

            async function addImage() {
                if (imgTagFlag === false) {
                    let img = document.createElement('img');
                    img.src = `${folderPath}/image${counter}.png?${new Date().getTime()}`;
                    img.id = 'screenshot';
                    enableImageDragging(img);
                    rotation = 0;
                    zoomLevel = 1;

                    img.style.transform = "scale(1) rotate(0deg)";
                    img.style.height = BASE_HEIGHT + "px";
                    img.style.width = BASE_WIDTH + "px";
                    img.style.maxWidth = "none";
                    img.style.maxHeight = "none";
                    img.style.objectFit = "unset";
                    img.style.display = "block";
                    img.style.margin = "0 auto";

                    img.onmousemove = function(e) {
                        previewElement(e);
                    };

                    img.onmouseleave = function () {
                        showElementHover = false;
                        clearOverlay();
                    };

                    img.onclick = async function(e) {
                        if (hasDragged) return;

                        if (!tapMode) {
                            const rect = img.getBoundingClientRect();
                            const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                            const appWidth = parseFloat(appNode.getAttribute("width"));
                            const appHeight = parseFloat(appNode.getAttribute("height"));
                            const scaleX = appWidth / rect.width;
                            const scaleY = appHeight / rect.height;

                            const x = Math.round((e.clientX - rect.left) * scaleX);
                            const y = Math.round((e.clientY - rect.top) * scaleY);

                            await performTouch(x, y);
                            return;
                        }

                        const rect = img.getBoundingClientRect();
                        const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                        const appWidth = parseFloat(appNode.getAttribute("width"));
                        const appHeight = parseFloat(appNode.getAttribute("height"));
                        const scaleX = appWidth / rect.width;
                        const scaleY = appHeight / rect.height;

                        const clickX = (e.clientX - rect.left) * scaleX;
                        const clickY = (e.clientY - rect.top) * scaleY;

                        console.log("CLICK:", clickX, clickY);
                        findIOSLocator(clickX, clickY);
                    };

                    const dummy = document.getElementById("dummyDevice");
                    if (dummy) {
                        dummy.style.display = "none";
                    }
                    document.getElementById('image-container').appendChild(img);
                    counter = counter + 1;
                    imgTagFlag = true;
                } else {
                    let ss = document.getElementById('screenshot');
                    const dummy = document.getElementById("dummyDevice");

                    if (dummy) {
                        dummy.style.display = "none";
                    }
                    rotation = 0;
                    zoomLevel = 1;

                    ss.style.transform = "scale(1) rotate(0deg)";
                    ss.src = `${folderPath}/image${counter}.png?${new Date().getTime()}`;
                    ss.style.width = BASE_WIDTH + "px";
                    ss.style.height = BASE_HEIGHT + "px";
                    ss.style.maxWidth = "none";
                    ss.style.maxHeight = "none";
                    ss.style.objectFit = "unset";
                    ss.style.display = "block";
                    ss.style.margin = "0 auto";

                    imgTagFlag = true;
                    counter = counter + 1;
                }
            }

            var pageSource = await driver.getPageSource();
            parser = new DOMParser();
            xmlDoc = parser.parseFromString(pageSource, "text/xml");
            window.xmlDoc = xmlDoc;
            showElementHover = false;

            function selectNodes(path) {
                var xpathResult = xmlDoc.evaluate(path, xmlDoc, null, XPathResult.ANY_TYPE, null);
                var nodes = [];
                var node;
                while (node = xpathResult.iterateNext()) {
                    nodes.push(node);
                }
                return nodes;
            }

            let listOfTags = [];
            function addTag(tag) {
                listOfTags.push(tag);
            }

            addTag("XCUIElementTypeButton");
            addTag("XCUIElementTypeStaticText");
            addTag("XCUIElementTypeTextField");
            addTag("XCUIElementTypeSecureTextField");
            addTag("XCUIElementTypeSearchField");
            addTag("XCUIElementTypeImage");
            addTag("XCUIElementTypeTextView");

            var xmlNodes = [];

            listOfTags.forEach(function (stringTag) {
                var getElements = xmlDoc.getElementsByTagName(stringTag);
                for (var i = 0; i < getElements.length; i++) {
                    xmlNodes.push(getElements[i]);
                }
            });

            for (var i = 0; i < xmlNodes.length; i++) {
                var node = xmlNodes[i];

                if (node.nodeName !== "AppiumAUT" && node.nodeName !== "XCUIElementTypeApplication"
                    && !node.nodeName.includes("XCUIElementTypeWindow") && !node.nodeName.includes("XCUIElementTypeOther")
                    && node.nodeName !== "" && node.nodeName !== null) {

                    var controlName = "";
                    var controlType = node.nodeName;
                    var controlIdentificationType = "XPath";
                    var controlId = "";
                    var xpath = "";

                    if (node.nodeName === "XCUIElementTypeButton" || node.nodeName === "XCUIElementTypeTextView") {
                        controlType = "Button";
                    } else if (node.nodeName === "XCUIElementTypeTextField" || node.nodeName === "XCUIElementTypeSecureTextField" || node.nodeName === "XCUIElementTypeSearchField" || node.nodeName === "XCUIElementTypeTextView" || node.nodeName === "XCUIElementTypeStaticText") {
                        controlType = "TextBox";
                    } else if (node.nodeName === "XCUIElementTypeOther") {
                        controlType = "Other";
                    } else if (node.nodeName === "XCUIElementTypeImage") {
                        controlType = "Image";
                    }

                    try {
                        if (node.getAttribute("name") !== null && node.getAttribute("name").trim() !== "") {
                            let rawName = node.getAttribute("name").trim();
                            controlName = rawName;
                            controlName = checkForSingleQuote(controlName);
                            controlId = "//" + node.nodeName + "[@name=\"" + rawName + "\"]";
                            if (controlIdList.includes(controlId)) {
                                controlIdList.push(controlId);
                                var CNcount = 0;
                                var CN_ID = controlId;
                                for (var k = 0; k < controlIdList.length; k++) {
                                    if (CN_ID === controlIdList[k]) CNcount++;
                                }
                                xpath = "(" + controlId + ")[" + CNcount + "]";
                            } else {
                                controlIdList.push(controlId);
                                xpath = controlId;
                            }
                        } else if (node.getAttribute("value") !== null && node.getAttribute("value").trim() !== "") {
                            controlName = node.getAttribute("value").trim();
                            controlName = checkForSingleQuote(controlName);
                            controlId = "//" + node.nodeName + "[@value=\"" + controlName + "\"]";
                            if (controlIdList.includes(controlId)) {
                                controlIdList.push(controlId);
                                var CNcount = 0;
                                var CN_ID = controlId;
                                for (var k = 0; k < controlIdList.length; k++) {
                                    if (CN_ID === controlIdList[k]) CNcount++;
                                }
                                xpath = "(" + controlId + ")[" + CNcount + "]";
                            } else {
                                controlIdList.push(controlId);
                                xpath = controlId;
                            }
                        } else if (node.getAttribute("label") !== null && node.getAttribute("label").trim() !== "") {
                            controlName = node.getAttribute("label").trim();
                            controlId = "//" + node.nodeName + "[@label=\"" + controlName + "\"]";
                            if (controlIdList.includes(controlId)) {
                                controlIdList.push(controlId);
                                var CNcount = 0;
                                var CN_ID = controlId;
                                for (var k = 0; k < controlIdList.length; k++) {
                                    if (CN_ID === controlIdList[k]) CNcount++;
                                }
                                xpath = "(" + controlId + ")[" + CNcount + "]";
                            } else {
                                controlIdList.push(controlId);
                                xpath = controlId;
                            }
                        } else {
                            controlId = "//" + node.nodeName;
                            if (controlIdList.includes(controlId)) {
                                controlIdList.push(controlId);
                                var CNcount = 0;
                                var CN_ID = controlId;
                                for (var k = 0; k < controlIdList.length; k++) {
                                    if (CN_ID === controlIdList[k]) CNcount++;
                                }
                                xpath = "(" + controlId + ")[" + CNcount + "]";
                            } else {
                                controlIdList.push(controlId);
                                xpath = controlId;
                            }
                        }
                    } catch (err) {
                        console.log("Error :", err);
                        controlId = "//" + node.nodeName;
                        controlName = node.nodeName;
                    }

                    if (controlName === "") {
                        controlName = node.nodeName;
                    }

                    if (controlName !== "") {
                        controlName = controlName.substring(0, Math.min(40, controlName.length));
                        controlName = controlName.replace(/[^a-zA-Z0-9 ]/g, "").trimStart();
                        if (/^\d/.test(controlName)) {
                            controlName = `NUM_` + controlName;
                        }
                        var count = 0;

                        firstlist.forEach(function (item) {
                            if (item.toLowerCase() === controlName.toLowerCase()) {
                                count++;
                            }
                        });

                        if (count > 1) {
                            controlName = controlName + "_" + count;
                        }

                        // remove duplicates from page
                        if (!controlNameLists.includes(controlName)) {
                            controlNameLists.push(controlName);
                        } else {
                            controlNameLists.push(controlName);
                            if (controlNameLists.includes(controlName)) {
                                var CNcount = 0;
                                var CN = controlName;
                                for (var j = 0; j < controlNameLists.length; j++) {
                                    if (CN === controlNameLists[j]) CNcount++;
                                }
                                controlName = controlName + "_" + (CNcount);
                            }
                        }

                        // Extract input value if it is a text/search field
                        let controlValue = "";
                        if (["XCUIElementTypeTextField", "XCUIElementTypeSecureTextField", "XCUIElementTypeSearchField", "XCUIElementTypeTextView"].includes(node.nodeName)) {
                            controlValue = node.getAttribute("value") || "";
                            let label = node.getAttribute("label") || "";
                            let name = node.getAttribute("name") || "";
                            let placeholder = node.getAttribute("placeholderValue") || "";

                            // If value matches placeholder/label/name, it's a default hint, not input
                            if (controlValue === placeholder || controlValue === label || controlValue === name) {
                                controlValue = "";
                            }
                        }

                        dtControls.push({
                            ControlName: controlName,
                            ControlType: controlType,
                            ControlId: xpath,
                            ControlValue: controlValue,
                            Fingerprint: new XMLSerializer().serializeToString(node)
                        });
                    }
                }
            }

            createAndAppendTable(dtControls);
            dtControls = [];

            // Restore UI after successful scrape
            document.getElementById('div_status_bar').style.display = 'none';
            showElementHover = false;
            hoverRequestId++;
            clearOverlay();
            document.getElementById('Scrape').style.backgroundColor = '#4285F4';
            document.getElementById('Scrape').disabled = false;
            document.getElementById('reset').style.backgroundColor = '#4285F4';
            document.getElementById('reset').disabled = false;
            document.getElementById('download').style.backgroundColor = '#4285F4';
            document.getElementById('download').disabled = false;
            document.getElementById('scrapeUI').disabled = false;
            document.getElementById('scrapeUI').style.backgroundColor = '#4285F4';
            document.getElementById('algoQA').disabled = false;
            document.getElementById('algoQA').style.backgroundColor = '#4285F4';

        } else {
            // Duplicate Page Name logic
            document.getElementById('SamePageNameError').style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
            document.getElementById("okay").addEventListener('click', async () => {
                document.getElementById('confirmationPopup').style.display = 'none';
                document.getElementById('SamePageNameError').style.display = 'none';
                document.getElementById('overlay').style.display = 'none';
            });
        }

    } catch(error) {
        document.getElementById('div_status_bar').style.display = 'none';
        document.getElementById('download').disabled = false;
        document.getElementById('download').style.backgroundColor = '#4285F4';

        console.error("Scraping Error:", error);
        showErrorPopup("Error occurred while scraping", error);
    }
});










    let pendingExportAction = null;
    let rowToDelete = null;

       // Helper to check if table actually contains user data
           function hasValidTableData(tableId) {
               var rows = document.querySelectorAll(`#${tableId} tr`);
               var validCount = 0;
               rows.forEach(row => {
                   // Ignore placeholder background rows and error rows
                   if (row.classList.contains('empty-excel-row') || row.classList.contains('no-results-row')) return;

                   // If it is a real row (scraped or added manually), count it as valid data
                   validCount++;
               });
               return validCount > 0;
           }

        document.getElementById("download").addEventListener('click', async () => {
                  if (!tableCreated || !hasValidTableData('myTable')) {
                      showCustomAlert("Export Failed", "No scraped data found to download.");
                      return;
                  }

                  if ((hiddenColumns && hiddenColumns.length > 0) || (hiddenRows && hiddenRows.length > 0)) {
                      pendingExportAction = "download";
                      showHiddenColumnsWarning();
                  } else {
                      downloadTableAsJSON('myTable');
                  }
                });


    function downloadTableAsJSON(tableId) {
            document.getElementById('sttus_bar_div').style.display = 'none';

            const now = new Date();
            const dateTime = now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0];

            var allHeaders = Array.from(document.querySelectorAll('#mainTable thead tr th'));

            // Map visible headers and their original indices to safely extract cells from hidden rows
            var visibleHeaderIndices = [];
            var visibleHeaders = allHeaders.filter((th, index) => {
                if (window.getComputedStyle(th).display !== 'none') {
                    visibleHeaderIndices.push(index);
                    return true;
                }
                return false;
            });

            var rows = document.querySelectorAll(`#${tableId} tr`);
            var dashboardControls = [];

            rows.forEach((row) => {
                // Always skip empty placeholders and error rows
                if (row.classList.contains('empty-excel-row') || row.classList.contains('no-results-row')) return;

                // Only skip if the row is explicitly hidden by the user's Context Menu feature
                if (typeof hiddenRows !== 'undefined' && hiddenRows.some(h => h.rowElement === row)) return;

                var allCells = Array.from(row.querySelectorAll('td'));
                if (allCells.length === 0) return;

                var rowObj = {
                    "CONTROL NAME": "",
                    "CONTROL TYPE": "",
                    "XPATH": "",
                    "PAGE NAME": "",
                    "IDENTIFICATION TYPE": "",
                    "CONTROL VALUE": "",
                    "FEATURE NAME": "",
                    "NODE NAME": "",
                    "FINGERPRINT": "",
                    "APP URL": ""
                };

                visibleHeaders.forEach((th, idx) => {
                    var cellIndex = visibleHeaderIndices[idx];
                    var cell = allCells[cellIndex];
                    if (!cell) return;

                    var thText = th.innerText.replace('Delete Column', '').replace('Add Column', '').trim().toUpperCase();
                    var selectEl = cell.querySelector('select');
                    var val = selectEl ? selectEl.value.trim() : cell.innerText.trim();

                    if (thText.includes('CONTROL NAME')) rowObj["CONTROL NAME"] = val;
                    else if (thText.includes('CONTROL TYPE')) rowObj["CONTROL TYPE"] = val;
                    else if (thText.includes('CONTROL ID')) rowObj["XPATH"] = val;
                    else if (thText.includes('PAGE NAME')) rowObj["PAGE NAME"] = val;
                    else if (thText.includes('IDENTIFICATION TYPE')) rowObj["IDENTIFICATION TYPE"] = val;
                    else if (thText.includes('CONTROL VALUE')) rowObj["CONTROL VALUE"] = val;
                    else if (thText.includes('FEATURE NAME')) rowObj["FEATURE NAME"] = val;
                    else if (thText.includes('NODE NAME')) rowObj["NODE NAME"] = val;
                    else if (th.classList.contains('custom-editable-header')) {
                        var colName = th.querySelector('span')?.innerText.trim() || thText;
                        rowObj[colName] = val;
                    }
                });

                dashboardControls.push(rowObj);
            });

            var jsonContent = {
                "isRecordscenario": false,
                "dashboardControls": dashboardControls
            };

            var blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: "application/json;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;

            var appSelect = document.getElementById('appname');
            var appName = appSelect ? appSelect.options[appSelect.selectedIndex].text.trim() : "App";

            a.download = appName + "_" + dateTime + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }




    // actions to perform on clicking reset button
    document.getElementById("reset").addEventListener('click', async () => {
            // ADD THESE TWO LINES:
            document.getElementById('back_btn').style.display = 'inline-block';
            document.getElementById('okay_btn').innerText = 'Confirm';

            document.getElementById('popup_title').innerText = "Confirm Reset";
            document.getElementById('popup_main_text').innerHTML = "Do you really want to reset?";
            document.getElementById('popup_sub_text').innerText = "You will not be able to recover the data!";

            document.getElementById('confirmationPopup').style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
        });

    document.getElementById("okay_btn").addEventListener('click', async () => {
      document.getElementById('confirmationPopup').style.display = 'none'
      document.getElementById('overlay').style.display = 'none';
      document.getElementById('sttus_bar_div').style.display = 'none'
      document.getElementById('brokenText').style.display = 'none'
      counter = 0;
      initialData = [];
      xpath_id = 0;
      screenNameList = [];
      showElement = false;
      // inputHistory = [];
      const imgElement = document.getElementById('screenshot');
      if (imgElement) {
        imgElement.remove();
      }
      const dummy = document.getElementById("dummyDevice");
      if (dummy) {
          dummy.style.display = "block";
          dummy.innerHTML = `
              <div class="phone-welcome-overlay">
                  <svg id="dummyIcon" class="info-svg" viewBox="0 0 24 24" fill="#4285F4" xmlns="http://www.w3.org/2000/svg" style="width: 45px; height: 45px; margin-bottom: 15px;">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <p id="dummyMainText" style="color: #333; padding: 0 10px;">Data cleared. Click the Refresh button (↻) in the toolbar to fetch the current device screen.</p>
                  <p id="dummyErrorText" style="display: none; color: #d9534f; font-size: 11px; margin-top: 12px; line-height: 1.4; padding: 0 10px; font-weight: 600; word-break: break-word;"></p>
              </div>
          `;
      }
      imgTagFlag = false;
      const ssElement = document.getElementById('ss');
      if (ssElement) {
        ssElement.remove();
      }
      ssflag = false;
      // Close the Show Element preview window
      document.getElementById("split-div3").style.display = "none";

      const previewContainer = document.getElementById("image-container_ss");
      if (previewContainer) {
          previewContainer.innerHTML = "";
      }
      deleteAllRows()
      renderDefaultExcelGrid(5);

      function deleteAllRows() {
        var table = document.getElementById('myTable');
        var rowCount = table.rows.length;

        for (var i = rowCount - 1; i >= 0; i--) {
          table.deleteRow(i);
        }
      }

      document.getElementById('table-container').style.display = "none"
      var plateformName = document.getElementById('platformname');
      var plateformOption = plateformName.options[plateformName.selectedIndex].text;
        deletePngFile(folderPath)
      async function deletePngFile(folderPath) {
        fs.readdir(folderPath, (err, files) => {
          if (err) {
            console.error('Error reading folder:', err);
            return;
          }

          files.forEach(file => {
            const filePath = path.join(folderPath, file);

            if (path.extname(filePath) === '.png') {
              fs.unlink(filePath, err => {
                if (err) {
                  return;
                }
              });
            }
          });
        });
      }
      const pageNameField = document.getElementById('pagename_searchbox');
      var searchBoxField = document.getElementById('searchbox');
      var packageName = document.getElementById('apppackage').value;
      // Function to reset the placeholder value
      function resetPlaceholder() {
        pageNameField.value = '';
        searchBoxField.value = ''
      }

      resetPlaceholder()
      document.getElementById("appname").style.borderColor = ''
      document.getElementById("devicename").style.borderColor = ''
      document.getElementById("udid").style.borderColor = ''
      document.getElementById("platformversion").style.borderColor = ''
      document.getElementById("automationName").style.borderColor = ''
      document.getElementById("bundleID").style.borderColor = ''
      document.getElementById("apppackage").style.borderColor = ''
      document.getElementById("appactivity").style.borderColor = ''
      document.getElementById("appiumurl").style.borderColor = ''
      document.getElementById("pagename_searchbox").style.borderColor = ''

      document.getElementById('download').disabled = true;
      document.getElementById('download').style.backgroundColor = '#B6B6B4'

      document.getElementById('reset').disabled = true;
      document.getElementById('reset').style.backgroundColor = '#B6B6B4'

      document.getElementById('scrapeUI').disabled = true;
      document.getElementById('scrapeUI').style.backgroundColor = '#B6B6B4';

      document.getElementById('algoQA').disabled = true;
      document.getElementById('algoQA').style.backgroundColor = '#B6B6B4';

      document.getElementById('Scrape').disabled = false;
      document.getElementById('Scrape').style.backgroundColor = '#4285F4';

      function forceStopApp(packageName) {
        const command = `adb shell am force-stop ${packageName}`;
        exec(command, (error, stdout, stderr) => {
        });
      }


    });

    document.getElementById("back_btn").addEventListener('click', async () => {
      document.getElementById('overlay').style.display = 'none';
      document.getElementById('confirmationPopup').style.display = 'none'
    });

    var searchBox = document.getElementById('searchbox');
    var table = document.getElementById('myTable');

    // Add event listener to the search box
    searchBox.addEventListener('keyup', function () {
        var searchText = this.value.toLowerCase().trim();
        var found = false;
        var tableBody = document.getElementById('myTable');

        // Remove existing "No results found" row if present
        var existingNoResultRow = tableBody.querySelector('.no-results-row');
        if (existingNoResultRow) {
            existingNoResultRow.remove();
        }

        // Iterate through each row in the table
        for (var i = 0; i < table.rows.length; i++) {
            var row = table.rows[i];

            // Always keep empty placeholder Excel rows hidden during search
            if (row.classList.contains('empty-excel-row')) {
                row.style.display = searchText === "" ? '' : 'none';
                continue;
            }

            // Extract searchable text exclusively from visible content cells (skip Index, Delete, Hidden columns)
            var visibleCells = Array.from(row.cells).filter((cell, index) => {
                return index > 0 && cell.style.display !== 'none' && !cell.classList.contains('delete-cell');
            });

            var rowSearchableText = visibleCells.map(cell => {
                var selectEl = cell.querySelector('select');
                if (selectEl) {
                    return selectEl.value;
                }
                return cell.innerText;
            }).join(' ').toLowerCase();

           // INSTEAD of hiding/showing directly, flag them!
                   if (searchText === "" || rowSearchableText.indexOf(searchText) > -1) {
                       row.classList.remove('search-hidden');
                       found = true;
                   } else {
                       row.classList.add('search-hidden');
                   }
               }

               // NEW: Apply pagination to handle the actual hiding/showing
               currentPage = 1;
               applyPagination();
        // If search text is typed but no rows match, insert an in-table error row
        if (searchText !== "" && !found) {
            var noResultRow = document.createElement('tr');
            noResultRow.className = "no-results-row";
            noResultRow.innerHTML = `
                <td class="row-index">1</td>
                <td class="cn pt-3-half" style="color: red; font-weight: 700; text-align: center;">No results found</td>
                <td class="ct pt-3-half">&nbsp;</td>
                <td class="xpath pt-3-half">&nbsp;</td>
                <td class="page pt-3-half">&nbsp;</td>
                <td class="identificationType pt-3-half">&nbsp;</td>
                <td class="controlValue pt-3-half">&nbsp;</td>
                <td class="featureName pt-3-half">&nbsp;</td>
                <td class="nodeName pt-3-half">&nbsp;</td>
                <td class="fingerprint" style="display:none;"></td>
                <td class="appUrl" style="display:none;"></td>
                <td class="delete-cell" style="border-color:black"></td>
            `;
            tableBody.appendChild(noResultRow);
        }
    });

    const tableEl = document.getElementById("myTable");

    tableEl.addEventListener("click", onTableClick);
    tableEl.addEventListener("mouseover", onShowElementHover);
    tableEl.addEventListener("mouseout", (e) => {
        // Clear overlay when cursor moves out of an XPath cell
        if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".xpath")) {
            onShowElementLeave(e);
        }
    });
    tableEl.addEventListener("mouseleave", onShowElementLeave);


    //show element

    async function onTableClick(e) {

            // 1. DELETE ROW HANDLER
            if (e.target.classList.contains("deleteBtn")) {
                const targetRow = e.target.closest("tr");
                if (!targetRow) return;

                // A. Extract Control Name & Page Name dynamically from the row
                const cnCell = targetRow.querySelector(".cn");
                const pageCell = targetRow.querySelector(".page"); // Extract page name cell

                let controlName = cnCell && cnCell.innerText.trim() !== "" ? cnCell.innerText.trim() : null;
                let pageName = pageCell && pageCell.innerText.trim() !== "" ? pageCell.innerText.trim() : null;

                // B. Build the confirmation text to include the Page Name
                let mainText;
                if (controlName && pageName) {
                    mainText = `Are you sure you want to delete<br>"${controlName}" from "${pageName}"?`;
                } else if (controlName) {
                    mainText = `Are you sure you want to delete<br>"${controlName}"?`;
                } else {
                    mainText = `Are you sure you want to delete this row?`;
                }

                // C. Inject text into the modal
                document.getElementById('back_btn').style.display = 'inline-block';
                document.getElementById('okay_btn').innerText = 'Confirm';

                document.getElementById('popup_title').innerText = "Confirm Deletion";
                document.getElementById('popup_main_text').innerHTML = mainText;
                document.getElementById('popup_sub_text').innerHTML = "This action cannot be undone.";

                // D. Set action state and store the row reference
                pendingExportAction = "deleteRow";
                rowToDelete = targetRow;

                // E. Show the popup
                document.getElementById('confirmationPopup').style.display = 'block';
                document.getElementById('overlay').style.display = 'block';

                return;
            }

        // 2. SHOW ELEMENT HANDLER
        if (e.target.id && e.target.id.startsWith("info_")) {
            document.getElementById("split-div3").style.display = "block";
            const row = e.target.closest("tr");
            const xpath = row.querySelector(".xpath").innerText.trim();

            if (xpath.startsWith("COORDINATE(")) {
                const match = xpath.match(/COORDINATE\((\d+),(\d+)\)/);
                if (match) {
                    const x = parseInt(match[1]);
                    const y = parseInt(match[2]);
                    showCoordinateMarker(x, y);
                    return;
                }
            }

            try {
                document.getElementById("split-div3").style.display = "block";
                document.getElementById("image-container_ss").style.display = "flex";
                document.getElementById("image-container_ss").style.justifyContent = "center";
                document.getElementById("image-container_ss").style.alignItems = "center";
                document.getElementById("image-container_ss").innerHTML = "";

                const el = await driver.findElement(By.xpath(xpath));
                const image = await el.takeScreenshot();

                let ss = document.getElementById("ss");
                if (!ss) {
                    ss = document.createElement("img");
                    ss.id = "ss";
                    ss.style.width = "280px";
                    ss.style.height = "520px";
                    ss.style.objectFit = "contain";
                    document.getElementById("image-container_ss").appendChild(ss);
                }

                ss.src = "data:image/png;base64," + image;
                showElementHover = false;
                clearOverlay();
            } catch (err) {
                console.error("Show Element Error:", err);
                showErrorPopup("Unable to locate element", err);
            }
        }
    }


    async function onShowElementHover(e) {
            const xpathCell = e.target.closest(".xpath");

            if (!xpathCell) {
                onShowElementLeave(e);
                return;
            }

            const selectEl = xpathCell.querySelector("select");
            const xpath = selectEl ? selectEl.value.trim() : xpathCell.innerText.trim();

            if (!xpath) {
                onShowElementLeave(e);
                return;
            }

            if (xpath === lastXPath) return;

            lastXPath = xpath;
            clearTimeout(hoverTimer);

            hoverRequestId++; // Invalidate previous requests
            const currentRequestId = hoverRequestId;

            // IMMEDIATELY clear overlay to prevent confusion between rows
            clearOverlay();

            if (xpath.startsWith("SWIPE(")) {
                const match = xpath.match(/SWIPE\((\d+),(\d+),(\d+),(\d+)\)/);
                if (match) {
                    drawSwipeHoverMarker(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[4], 10));
                }
                return;
            }

            if (xpath.startsWith("COORDINATE(")) {
                const match = xpath.match(/COORDINATE\((\d+),(\d+)\)/);
                if (match) {
                    const x = parseInt(match[1], 10);
                    const y = parseInt(match[2], 10);
                    drawCoordinateHoverMarker(x, y);
                }
                return;
            }

            hoverTimer = setTimeout(async () => {
                if (currentRequestId !== hoverRequestId) return;

                showElementHover = true;
                try {
                    const element = await driver.findElement(By.xpath(xpath));
                    const rect = await element.getRect();

                    if (currentRequestId === hoverRequestId) {
                        drawShowElementMarker(rect);
                    }
                } catch {
                    if (currentRequestId === hoverRequestId) {
                        clearOverlay();
                    }
                }
            }, 80);
        }

        // Dedicated handler for option hover events
        async function onOptionHover(xpath) {
            if (!xpath || xpath === lastXPath) return;

            lastXPath = xpath;
            clearTimeout(hoverTimer);

            hoverRequestId++;
            const currentRequestId = hoverRequestId;

            // IMMEDIATELY clear overlay
            clearOverlay();

            if (xpath.startsWith("SWIPE(")) {
                const match = xpath.match(/SWIPE\((\d+),(\d+),(\d+),(\d+)\)/);
                if (match) {
                    drawSwipeHoverMarker(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[4], 10));
                }
                return;
            }

            if (xpath.startsWith("COORDINATE(")) {
                const match = xpath.match(/COORDINATE\((\d+),(\d+)\)/);
                if (match) {
                    const x = parseInt(match[1], 10);
                    const y = parseInt(match[2], 10);
                    drawCoordinateHoverMarker(x, y);
                }
                return;
            }

            hoverTimer = setTimeout(async () => {
                if (currentRequestId !== hoverRequestId) return;

                showElementHover = true;

                try {
                    const element = await driver.findElement(By.xpath(xpath));
                    const rect = await element.getRect();

                    // CRITICAL FIX: Only draw if this is STILL the active hover session
                    if (currentRequestId === hoverRequestId) {
                        drawShowElementMarker(rect);
                    }
                } catch (err) {
                    if (currentRequestId === hoverRequestId) {
                        clearOverlay();
                    }
                }
            }, 60);
        }

        // Handler for when user selects a different option in the dropdown
        async function onDropdownChange(selectElement) {
            // Kill any pending hover operations triggered while navigating the dropdown menu
            clearTimeout(hoverTimer);
            hoverRequestId++;
            clearOverlay();

            const xpath = selectElement.value.trim();

            // Set lastXPath so that resting the mouse on the select doesn't immediately re-trigger
            lastXPath = xpath;

            if (!xpath) return;

            if (xpath.startsWith("SWIPE(")) {
                const match = xpath.match(/SWIPE\((\d+),(\d+),(\d+),(\d+)\)/);
                if (match) {
                    drawSwipeHoverMarker(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[4], 10));
                }
                return;
            }

            if (xpath.startsWith("COORDINATE(")) {
                const match = xpath.match(/COORDINATE\((\d+),(\d+)\)/);
                if (match) {
                    const x = parseInt(match[1], 10);
                    const y = parseInt(match[2], 10);
                    drawCoordinateHoverMarker(x, y);
                }
                return;
            }

            try {
                const element = await driver.findElement(By.xpath(xpath));
                const rect = await element.getRect();
                drawShowElementMarker(rect);
            } catch {
                clearOverlay();
            }
        }

    function onShowElementLeave(e) {
            showElementHover = false;
            lastXPath = "";
            hoverRequestId++; // MAGIC FIX: Instantly kills any pending Appium drawings!
            clearTimeout(hoverTimer);
            clearOverlay();
        }

    document.getElementById("platformname").addEventListener('change', async () => {
      prestart();
    })



// HELPER: Checks if the target application is actually in the foreground
async function checkAppForegroundState() {
    if (!driver) throw new Error("No active session driver found.");

    var plateformName = document.getElementById('platformname');
    var plateformOption = plateformName.options[plateformName.selectedIndex].text;
    var appId = plateformOption === 'IOS'
        ? document.getElementById('bundleID').value.trim()
        : document.getElementById('apppackage').value.trim();

    if (appId) {
        let state;
        try {
            if (plateformOption === 'IOS') {
                state = await driver.executeScript("mobile: queryAppState", { bundleId: appId });
            } else {
                state = await driver.executeScript("mobile: queryAppState", { appId: appId });
            }
        } catch (e) {
            // If the Appium version doesn't support queryAppState, ignore and proceed
            console.log("App state query bypassed:", e.message);
            return;
        }

        // Appium App States: 0 (Not Installed), 1 (Not Running), 2 (Suspended), 3 (Background), 4 (Foreground)
        if (state !== 4) {
            throw new Error("Application is closed or running in the background.");
        }
    }
}

//Perform touch action for device connected
    async function performTouch(x, y) {
        if (touchInProgress) return;
        touchInProgress = true;

        const container = document.getElementById("image-container");
        const globalOverlay = document.getElementById("overlay");
        const appRunningPopup = document.getElementById("AppRunningPopup");

        if (globalOverlay) globalOverlay.style.display = "none";
        if (appRunningPopup) appRunningPopup.style.display = "none";

        let localLoader = document.getElementById("localTouchLoader");
        if (!localLoader && container) {
            localLoader = document.createElement("div");
            localLoader.id = "localTouchLoader";
            localLoader.innerHTML = `
                <div class="local-blur-overlay">
                    <img src="icon/load-8510_256.gif" style="height: 60px; width: 60px; max-width:none; max-height:none;"/>
                </div>
            `;
            container.appendChild(localLoader);
        }

        if (localLoader) localLoader.style.display = "block";

        try {
            // ---> NEW CHECK: Verifies app is actually in foreground <---
            await checkAppForegroundState();

            console.log("Touch:", x, y);
            await driver.executeScript("mobile: tap", { x: x, y: y });
            console.log("Touch Success");

            await driver.sleep(1500);

            const image = await driver.takeScreenshot();
            require("fs").writeFileSync(`${folderPath}/image0.png`, image, "base64");

            const screenshot = document.getElementById("screenshot");
            if (screenshot) {
                screenshot.src = `${folderPath}/image0.png?${Date.now()}`;
                await new Promise(resolve => {
                    screenshot.onload = resolve;
                    screenshot.onerror = resolve;
                });
            }

            const pageSource = await driver.getPageSource();
            const parser = new DOMParser();
            window.xmlDoc = parser.parseFromString(pageSource, "text/xml");

            clearOverlay();

        } catch (err) {
                    console.error("Touch Error:", err);

                    let readableError = err && err.message ? err.message.split('\n')[0].substring(0, 80) : String(err).substring(0, 80);

                    const screenshotImg = document.getElementById("screenshot");
                    if (screenshotImg) screenshotImg.style.display = "none";

                    const dummy = document.getElementById("dummyDevice");
                    if (dummy) {
                        dummy.style.display = "block";
                        dummy.innerHTML = `
                            <div class="phone-welcome-overlay">
                                <svg id="dummyIcon" class="info-svg" viewBox="0 0 24 24" fill="#d9534f" xmlns="http://www.w3.org/2000/svg" style="width: 40px; height: 40px; margin-bottom: 12px;">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                </svg>
                                <p id="dummyMainText" style="color: #d9534f; padding: 0 10px; font-weight: 600; font-size: 13px; margin-bottom: 5px; line-height: 1.4;">App session interrupted.<br>Please ensure the app is active, then click 'Launch Application' to reconnect.</p>
                                <p id="dummyErrorText" style="display: block; color: #d9534f; font-size: 10px; margin-top: 8px; line-height: 1.2; padding: 0 10px; word-break: break-word; opacity: 0.8;">*${readableError}</p>
                            </div>
                        `;
                    }

                    const runBtn = document.getElementById('Run');
                    if (runBtn) {
                        runBtn.disabled = false;
                        runBtn.style.backgroundColor = '#4285F4';
                    }

                    const actionButtons = ['Scrape', 'scrapeUI', 'reset', 'download', 'algoQA', 'recordScenarioBtn'];
                    actionButtons.forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) {
                            btn.disabled = true;
                            btn.style.backgroundColor = '#B6B6B4';
                        }
                    });

                    driver = null;

                } finally {
            const targetLoader = document.getElementById("localTouchLoader");
            if (targetLoader) targetLoader.style.display = "none";
            touchInProgress = false;
        }
    }


//Perform swipe action on connected device
async function performSwipe(startX, startY, endX, endY) {
    if (touchInProgress) return;
    touchInProgress = true; // Lock interactions instantly

    // 1. ABSOLUTE FIRST THING: Turn on the loader immediately! No checks, no waits.
    const container = document.getElementById("image-container");
    const globalOverlay = document.getElementById("overlay");
    const appRunningPopup = document.getElementById("AppRunningPopup");

    if (globalOverlay) globalOverlay.style.display = "none";
    if (appRunningPopup) appRunningPopup.style.display = "none";

    let localLoader = document.getElementById("localTouchLoader");
    if (!localLoader && container) {
        localLoader = document.createElement("div");
        localLoader.id = "localTouchLoader";
        localLoader.innerHTML = `
            <div class="local-blur-overlay">
                <img src="icon/load-8510_256.gif" style="height: 60px; width: 60px; max-width:none; max-height:none;"/>
            </div>
        `;
        container.appendChild(localLoader);
    }

    if (localLoader) {
        localLoader.style.display = "block";
    }

    // ---> CRITICAL FIX: Stop Javascript for 50ms so the browser has time to physically draw the spinning GIF on the screen! <---
    await new Promise(resolve => setTimeout(resolve, 50));

    // --- Bulletproof Screen State Comparison ---
    function getPageStructureState(xmlDocument) {
        if (!xmlDocument) return "";
        let state = [];
        const nodes = xmlDocument.getElementsByTagName("*");

        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            let nodeName = n.nodeName;

            // STRICT FILTER: Ignore transient UI elements that falsely trigger state changes
            if (nodeName.includes("StatusBar") || nodeName.includes("ScrollBar") || nodeName.includes("ActivityIndicator") || nodeName === "XCUIElementTypeWindow") {
                continue;
            }

            // Extract real text content
            let text = n.getAttribute("label") || n.getAttribute("text") || n.getAttribute("value") || n.getAttribute("name") || "";
            text = text.trim();

            // Skip empty tags and clock/battery text
            if (text === "" || /^\d{1,2}:\d{2}/.test(text) || text.includes("battery")) {
                continue;
            }

            let y = parseFloat(n.getAttribute("y"));

            // Fallback for Android bounds
            if (isNaN(y)) {
                let bounds = n.getAttribute("bounds");
                if (bounds) {
                    let match = bounds.match(/\[(\d+),(\d+)\]/);
                    if (match) y = parseInt(match[2], 10);
                }
            }

            if (!isNaN(y)) {
                // Group elements by Text + rough Y position (rounded to nearest 10px to ignore 1px micro-jitters)
                state.push(`${text}_${Math.round(y/10)*10}`);
            }
        }
        return state.join("|");
    }

    try {
        // 2. NOW check the Page Name. (The loader is already spinning on screen!)
        const pageName = document.getElementById("pagename_searchbox").value.trim();
        if (pageName === "") {
            document.getElementById("pagename_searchbox").style.borderColor = "red";
            showCustomAlert("Missing Information", "Please enter Page Name before attempting to scroll.", "warning");
            flashPageNameError(); // Flashes the badge red for 2 seconds
            return; // Exit! The loader stays visible behind the alert until 'Okay' is clicked.
        }

        // ---> Verifies app is actually in foreground <---
        await checkAppForegroundState();

        // 3. Capture the exact text & layout state BEFORE swiping
        const preSwipeState = getPageStructureState(window.xmlDoc);

        console.log("Swipe from:", startX, startY, "to", endX, endY);
        var plateformName = document.getElementById('platformname');
        var plateformOption = plateformName.options[plateformName.selectedIndex].text;

        await driver.executeScript("mobile: dragFromToForDuration", {
            fromX: startX,
            fromY: startY,
            toX: endX,
            toY: endY,
            duration: 0.6
        });

        await driver.sleep(2000);

        const image = await driver.takeScreenshot();
        require("fs").writeFileSync(`${folderPath}/image0.png`, image, "base64");

        const screenshot = document.getElementById("screenshot");
        if (screenshot) {
            screenshot.src = `${folderPath}/image0.png?${Date.now()}`;
            await new Promise(resolve => { screenshot.onload = resolve; screenshot.onerror = resolve; });
        }

        const pageSource = await driver.getPageSource();
        const parser = new DOMParser();
        window.xmlDoc = parser.parseFromString(pageSource, "text/xml");
        clearOverlay();

        // 4. Capture the exact text & layout state AFTER swiping
        const postSwipeState = getPageStructureState(window.xmlDoc);

        // 5. Compare States. If identical, the screen just bounced and nothing changed.
        if (preSwipeState === postSwipeState) {
            showCustomAlert("Scroll Complete", "No extra scrollable elements found on this page, or end of page reached.", "info");
            return; // Exit! The loader stays visible behind the alert until 'Okay' is clicked.
        }

        // 6. Record the Scroll Action in the Table ONLY if a successful scroll occurred
        let rootXPath = plateformOption === 'IOS' ? "//XCUIElementTypeApplication" : "//hierarchy";

        createAndAppendTable([
            {
                ControlName: `act_Scroll_${Math.round(startX)}_${Math.round(startY)}`,
                ControlType: "Scroll",
                ControlId: [
                    `SWIPE(${Math.round(startX)},${Math.round(startY)},${Math.round(endX)},${Math.round(endY)})`,
                    rootXPath
                ],
                Fingerprint: "<Action Type=\"Scroll\" />"
            }
        ]);

    } catch (err) {
        console.error("Swipe Error:", err);

        let readableError = err && err.message ? err.message.split('\n')[0].substring(0, 150) : String(err).substring(0, 150);

        const screenshotImg = document.getElementById("screenshot");
        if (screenshotImg) screenshotImg.style.display = "none";

        const dummy = document.getElementById("dummyDevice");
        if (dummy) {
            dummy.style.display = "block";
            dummy.innerHTML = `
                <div class="phone-welcome-overlay">
                    <svg id="dummyIcon" class="info-svg" viewBox="0 0 24 24" fill="#d9534f" xmlns="http://www.w3.org/2000/svg" style="width: 45px; height: 45px; margin-bottom: 15px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <p id="dummyMainText" style="color: #d9534f; padding: 0 10px; font-weight: 600; font-size: 13px; margin-bottom: 5px; line-height: 1.4;">App session interrupted.<br>Please ensure the app is active, then click 'Launch Application' to reconnect.</p>
                    <p id="dummyErrorText" style="display: block; color: #d9534f; font-size: 11px; margin-top: 12px; line-height: 1.4; padding: 0 10px; font-weight: 600; word-break: break-word;">*Error: ${readableError}</p>
                </div>
            `;
        }

        const runBtn = document.getElementById('Run');
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.style.backgroundColor = '#4285F4';
        }

        const actionButtons = ['Scrape', 'scrapeUI', 'reset', 'download', 'algoQA', 'recordScenarioBtn'];
        actionButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
                btn.style.backgroundColor = '#B6B6B4';
            }
        });

        driver = null;
    } finally {
        // ONLY turn the loader off automatically if we are NOT waiting for the user to click "Okay" on an alert
        if (pendingExportAction !== "alertOnly") {
            const targetLoader = document.getElementById("localTouchLoader");
            if (targetLoader) targetLoader.style.display = "none";
            touchInProgress = false;
        }
    }
}

    function previewElement(e){

        if (isDragging) {
            clearOverlay();
            return;
        }

        if(showElementHover){
            return;
        }

        // Don't show hover highlight in Touch Mode
            if (!tapMode) {
                clearOverlay();
                return;
            }

        const img =
            document.getElementById(
                "screenshot"
            );

        if(!img || !window.xmlDoc)
            return;

        const rect =
            img.getBoundingClientRect();

        const appNode =
            window.xmlDoc.getElementsByTagName(
                "XCUIElementTypeApplication"
            )[0];

        if(!appNode)
            return;

        const appWidth =
            parseFloat(
                appNode.getAttribute("width")
            );

        const appHeight =
            parseFloat(
                appNode.getAttribute("height")
            );

        const scaleX =
            appWidth / rect.width;

        const scaleY =
            appHeight / rect.height;

        const x =
            Math.round(
                (e.clientX - rect.left) * scaleX
            );

        const y =
            Math.round(
                (e.clientY - rect.top) * scaleY
            );

            const node =
                findHoveredNode(
                    x,
                    y
                );

            if(node){

                drawHoveredNode(node);

            }
            else{

                clearOverlay();

            }

    }

    function findHoveredNode(x, y){

        if(!window.xmlDoc)
            return null;

        const allNodes =
            window.xmlDoc.getElementsByTagName("*");

        let smallestNode = null;

        let smallestArea =
            Number.MAX_VALUE;

        for(let i=0;i<allNodes.length;i++){

            const node =
                allNodes[i];

            const nx =
                parseFloat(
                    node.getAttribute("x")
                );

            const ny =
                parseFloat(
                    node.getAttribute("y")
                );

            const nw =
                parseFloat(
                    node.getAttribute("width")
                );

            const nh =
                parseFloat(
                    node.getAttribute("height")
                );

            if(
                isNaN(nx) ||
                isNaN(ny) ||
                isNaN(nw) ||
                isNaN(nh)
            ){
                continue;
            }

            if(
                x>=nx &&
                x<=nx+nw &&
                y>=ny &&
                y<=ny+nh
            ){

                const area =
                    nw*nh;

                if(area<smallestArea){

                    smallestArea =
                        area;

                    smallestNode =
                        node;

                }

            }

        }

        return smallestNode;

    }

    function prestart() {
      var plateformName = document.getElementById('platformname');
      var plateformOption = plateformName.options[plateformName.selectedIndex].text;
        document.getElementById('pfVersion').style.display = "block"
        document.getElementById('automatione_name').style.display = "block"
        // document.getElementById('orgID').style.display = "block"
        // document.getElementById('signingID').style.display = "block"
        document.getElementById('bndlID').style.display = "block"
        document.getElementById('appPkg').style.display = "none"
        document.getElementById('appActvty').style.display = "none"
        document.getElementById('automatione_name').style.display = "block"
    }





   // 1. Add Row Handler (Inserts 1 new row at top, pushing default rows down without replacing them)
       const addRowBtn = document.getElementById("add_row_btn");
       if (addRowBtn && !addRowBtn.dataset.listenerAttached) {
           addRowBtn.dataset.listenerAttached = "true";

           addRowBtn.addEventListener('click', async (e) => {
               e.preventDefault();
               e.stopPropagation();

               var pageName = document.getElementById('pagename_searchbox').value || "";
               var table = document.getElementById('myTable');
               var tableTopRow = table.insertRow(0);

               var allHeaders = Array.from(document.querySelectorAll('#mainTable thead tr > *'));
               var rowHtml = "";

               allHeaders.forEach((th) => {
                   // FIX: Use textContent to securely find headers even if CSS hides them
                   var thText = (th.textContent || th.innerText || '').replace('Delete Column', '').replace('Add Column', '').trim().toUpperCase();
                   var isHidden = window.getComputedStyle(th).display === 'none';
                   var displayStyle = isHidden ? 'display: none !important;' : '';

                   if (th.classList.contains('excel-header-corner')) {
                       rowHtml += `<td class="row-index" style="${displayStyle}"></td>`;
                   } else if (th.id === 'add_empty_column') {
                       rowHtml += `<td class="add-col-cell" style="${displayStyle}">&nbsp;</td>`;
                   } else if (th.classList.contains('custom-editable-header')) {
                       rowHtml += `<td contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
                   } else if (thText.includes('CONTROL NAME')) {
                       rowHtml += `<td class="cn pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}"></td>`;
                   } else if (thText.includes('CONTROL TYPE')) {
                       // 1. Define available Control Types
                                       const allControlTypes = [
                                           "TextBox", "Button", "RadioButton", "CheckBox", "Link",
                                           "DropDownList", "Image", "TextArea", "FileUpload", "Label",
                                           "Page", "AnchorTag", "Mouse", "Scroll", "Window",
                                           "NewTab", "Parent"
                                       ];
                       let ctSelectOptionsHtml = allControlTypes.map(type => `<option value="${type}">${type}</option>`).join('');
                       let controlTypeCellHtml = `<select class="xpath-dropdown" style="width: 100%; border: none; background: transparent; font-size: 11px; font-weight: 600;"><option value="" disabled selected hidden>Controls</option>${ctSelectOptionsHtml}</select>`;

                       rowHtml += `<td class="ct pt-3-half" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-color: black; text-align: center; ${displayStyle}">${controlTypeCellHtml}</td>`;
                   } else if (thText.includes('CONTROL ID')) {
                       rowHtml += `<td class="xpath pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}"></td>`;
                   } else if (thText.includes('PAGE NAME')) {
                       rowHtml += `<td class="page pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${pageName}</td>`;
                   } else if (thText.includes('IDENTIFICATION TYPE')) {
                       rowHtml += `<td class="identificationType pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}"></td>`;
                   } else if (thText.includes('CONTROL VALUE')) {
                       rowHtml += `<td class="controlValue pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}"></td>`;
                   } else if (thText.includes('FEATURE NAME')) {
                       rowHtml += `<td class="featureName pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${pageName}</td>`;
                   } else if (thText.includes('NODE NAME')) {
                       rowHtml += `<td class="nodeName pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${pageName}</td>`;
                   } else if (th.classList.contains('fingerprint')) {
                       rowHtml += `<td class="fingerprint" style="display:none;"></td>`;
                   } else if (th.id === 'appUrl' || thText.includes('APP URL')) {
                       rowHtml += `<td class="appUrl" style="display:none;"></td>`;
                   } else if (thText.includes('DELETE')) {
                       rowHtml += `<td class="delete-cell" style="border-color:black; ${displayStyle}">
                           <input type="checkbox" class="bulk-delete-cb" style="display:none; cursor:pointer; margin:0 auto;">
                           <img src="icon/icons8-delete_red.svg" alt="delete" class="deleteBtn" style="margin-left: auto; margin-right: 1px; max-width:17px; cursor: pointer; -webkit-user-drag: none; display:inline-block;">
                       </td>`;
                   }else {
                       rowHtml += `<td contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
                   }
               });

               tableTopRow.innerHTML = rowHtml;
               tableCreated = true;
               document.getElementById('table-container').style.display = "block";

               updateRowNumbers();
           });
       }

    // 2. Add Column Handler (Adds 1 column with editable header & delete trash icon)
        const addColBtn = document.getElementById("add_empty_column");
        if (addColBtn && !addColBtn.dataset.listenerAttached) {
            addColBtn.dataset.listenerAttached = "true";

            addColBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                var headerRow = document.querySelector('#mainTable thead tr');
                if (!headerRow) return;

                var existingCustomCols = headerRow.querySelectorAll('.custom-editable-header').length + 1;

                var newTh = document.createElement('th');
                newTh.className = "custom-editable-header";
                newTh.style.width = "180px";
                newTh.style.textAlign = "center";
                newTh.style.borderColor = "black";

                newTh.innerHTML = `
                    <span contenteditable="true" style="outline:none; cursor:text;">NEW_COLUMN_${existingCustomCols}</span>
                    <img src="icon/icons8-delete_red.svg" class="deleteColBtn" style="width:13px; cursor:pointer; margin-left:6px; vertical-align:middle;" title="Delete Column" />
                    <div class="resizer"></div>
                `;

                // Column Delete Listener
                const deleteColImg = newTh.querySelector('.deleteColBtn');
                deleteColImg.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    var colIndex = newTh.cellIndex;
                    deleteCustomColumn(colIndex);
                });

                // FIX: Securely locate the Delete column using textContent
                var deleteTh = Array.from(headerRow.children).find(th => {
                    let t = (th.textContent || th.innerText || "").toUpperCase();
                    return t.includes('DELETE');
                });

                if (deleteTh) {
                    headerRow.insertBefore(newTh, deleteTh);
                } else {
                    headerRow.insertBefore(newTh, addColBtn);
                }

                // Add matching cell to all existing body rows BEFORE the Delete cell
                var allBodyRows = document.querySelectorAll('#myTable tr');
                allBodyRows.forEach(row => {
                    var newTd = document.createElement('td');
                    newTd.contentEditable = "true";
                    newTd.style.overflow = "hidden";
                    newTd.style.whiteSpace = "nowrap";
                    newTd.style.textOverflow = "ellipsis";
                    newTd.style.fontSize = "11px";
                    newTd.style.fontWeight = "600";
                    newTd.style.borderColor = "black";
                    newTd.style.textAlign = "center";
                    newTd.innerHTML = "&nbsp;";

                    var deleteTd = row.querySelector('.delete-cell');
                    if (deleteTd) {
                        row.insertBefore(newTd, deleteTd);
                    } else {
                        var lastCell = row.querySelector('.add-col-cell') || row.lastElementChild;
                        row.insertBefore(newTd, lastCell);
                    }
                });

                initResizableTable();

                // Auto-scroll the table to the far right so the user immediately sees the new column
                const tableContainer = document.getElementById('table-container');
                if (tableContainer) {
                    setTimeout(() => {
                        tableContainer.scrollLeft = tableContainer.scrollWidth;
                    }, 50);
                }
            });
        }



    document.getElementById("appname").addEventListener('click', async () => {
      document.getElementById("appname").style.borderColor = ''
    })
    document.getElementById("devicename").addEventListener('click', async () => {
      document.getElementById("devicename").style.borderColor = ''
    })
    document.getElementById("udid").addEventListener('click', async () => {
      document.getElementById("udid").style.borderColor = ''
    })
    document.getElementById("platformversion").addEventListener('click', async () => {
      document.getElementById("platformversion").style.borderColor = ''
    })
    document.getElementById("automationName").addEventListener('click', async () => {
      document.getElementById("automationName").style.borderColor = ''
    })
    document.getElementById("bundleID").addEventListener('click', async () => {
      document.getElementById("bundleID").style.borderColor = ''
    })
    document.getElementById("appiumurl").addEventListener('click', async () => {
      document.getElementById("appiumurl").style.borderColor = ''
    })
    document.getElementById("pagename_searchbox").addEventListener('click', async () => {
      document.getElementById("pagename_searchbox").style.borderColor = ''
    })


    function checkForSingleQuote(statement) {
      var words = statement.split(" ");
      for (var i = 0; i < words.length; i++) {
        if (words[i].includes("'")) {
          words[i] = ""
        }
      }
      statement = words.join(" ");
      return statement;
    }


function createAndAppendTable(dtControls) {
    if (typeof noResultsMessage !== 'undefined') {
        noResultsMessage.style.display = 'none';
    }

    var pageName = document.getElementById('pagename_searchbox').value;
    var tbody = document.getElementById('myTable');

    var allHeaders = Array.from(document.querySelectorAll('#mainTable thead tr > *'));

    for (var i = 0; i < dtControls.length; i++) {
        let xpaths = Array.isArray(dtControls[i].ControlId)
            ? dtControls[i].ControlId
            : [dtControls[i].ControlId];

        let selectOptionsHtml = xpaths.map(xp =>
            `<option value="${xp.replace(/"/g, '&quot;')}" onmousemove="onOptionHover('${xp.replace(/'/g, "\\'")}')">${xp}</option>`
        ).join('');

        let controlIdCellHtml = `<select class="xpath-dropdown" onchange="onDropdownChange(this)" onmouseleave="onShowElementLeave(event)" style="width: 100%; border: none; background: transparent; font-size: 11px; font-weight: 600;">${selectOptionsHtml}</select>`;

        let tr = tbody.insertRow(0);

        let emptyRows = tbody.querySelectorAll('tr.empty-excel-row');
        if (emptyRows.length > 0) {
            emptyRows[emptyRows.length - 1].remove();
        }

        td_id = i;

                // 1. Define available Control Types (Comprehensive & Alphabetical) All Control Types
                   const allControlTypes = [
                                             "TextBox", "Button", "RadioButton", "CheckBox", "Link",
                                             "DropDownList", "Image", "TextArea", "FileUpload", "Label",
                                             "Page", "AnchorTag", "Mouse", "Scroll", "Window",
                                             "NewTab", "Parent"
                                                      ];


                let currentControlType = dtControls[i].ControlType || "";

                // 2. Ensure current type is in the list, then build options
                let optionsList = [...new Set([currentControlType, ...allControlTypes])].filter(Boolean);
                let ctSelectOptionsHtml = optionsList.map(type =>
                    `<option value="${type}" ${type === currentControlType ? 'selected' : ''}>${type}</option>`
                ).join('');

                // 3. Create the Dropdown HTML
                let controlTypeCellHtml = `<select class="xpath-dropdown" style="width: 100%; border: none; background: transparent; font-size: 11px; font-weight: 600;">${ctSelectOptionsHtml}</select>`;

                let rowDataMap = {
                                    "#": "",
                                    "CONTROL NAME": dtControls[i].ControlName || "",
                                    "CONTROL TYPE": controlTypeCellHtml, // Use dropdown HTML
                                    "CONTROL ID": controlIdCellHtml,
                            "PAGE NAME": pageName,
                            "IDENTIFICATION TYPE": "",
                            "CONTROL VALUE": dtControls[i].ControlValue || "", // UPDATED to catch the passed value
                            "FEATURE NAME": pageName,
                            "NODE NAME": pageName,
                            "DELETE": `<img src="icon/icons8-delete_red.svg" id="del_${td_id}" alt="delete" class="deleteBtn" style="margin-left: auto; margin-right: 1px; max-width:17px; overflow: hidden; cursor: pointer; -webkit-user-drag: none; display:inline-block;">`,
                            "FINGERPRINT": (dtControls[i].Fingerprint || "").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                            "APP URL": ""
                        };

        var rowHtml = "";

        // Build cells dynamically and hide them if the header is currently hidden
        allHeaders.forEach((th) => {
            // FIX: securely fetch header text ignoring CSS
            var thText = (th.textContent || th.innerText || '').replace('Delete Column', '').replace('Add Column', '').trim().toUpperCase();

            var isHidden = window.getComputedStyle(th).display === 'none';
            var displayStyle = isHidden ? 'display: none !important;' : '';

            if (th.classList.contains('excel-header-corner')) {
                rowHtml += `<td class="row-index" style="${displayStyle}"></td>`;
            } else if (th.id === 'add_empty_column') {
                rowHtml += `<td class="add-col-cell" style="${displayStyle}">&nbsp;</td>`;
            } else if (th.classList.contains('custom-editable-header')) {
                rowHtml += `<td contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
            } else if (thText.includes('CONTROL NAME')) {
                rowHtml += `<td class="cn pt-3-half" id="cn_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["CONTROL NAME"]}</td>`;
            } else if (thText.includes('CONTROL TYPE')) {
                            rowHtml += `<td class="ct pt-3-half" id="ct_${td_id}" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["CONTROL TYPE"]}</td>`;
            } else if (thText.includes('CONTROL ID')) {
                rowHtml += `<td class="xpath pt-3-half" id="xpath_${td_id}" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["CONTROL ID"]}</td>`;
            } else if (thText.includes('PAGE NAME')) {
                rowHtml += `<td class="page pt-3-half" id="page_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["PAGE NAME"]}</td>`;
            } else if (thText.includes('IDENTIFICATION TYPE')) {
                rowHtml += `<td class="identificationType pt-3-half" id="identificationType_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["IDENTIFICATION TYPE"]}</td>`;
            } else if (thText.includes('CONTROL VALUE')) {
                rowHtml += `<td class="controlValue pt-3-half" id="controlValue_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["CONTROL VALUE"]}</td>`;
            } else if (thText.includes('FEATURE NAME')) {
                rowHtml += `<td class="featureName pt-3-half" id="featureName_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["FEATURE NAME"]}</td>`;
            } else if (thText.includes('NODE NAME')) {
                rowHtml += `<td class="nodeName pt-3-half" id="nodeName_${td_id}" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">${rowDataMap["NODE NAME"]}</td>`;
            } else if (th.classList.contains('fingerprint')) {
                rowHtml += `<td class="fingerprint" style="display:none;">${rowDataMap["FINGERPRINT"]}</td>`;
            } else if (th.id === 'appUrl' || thText.includes('APP URL')) {
                rowHtml += `<td class="appUrl" style="display:none;"></td>`;
            } else if (thText.includes('DELETE')) {
                rowHtml += `<td class="delete-cell" style="border-color:black; ${displayStyle}">
                    <input type="checkbox" class="bulk-delete-cb" style="display:none; cursor:pointer; margin:0 auto;">
                    <img src="icon/icons8-delete_red.svg" alt="delete" class="deleteBtn" style="margin-left: auto; margin-right: 1px; max-width:17px; cursor: pointer; -webkit-user-drag: none; display:inline-block;">
                </td>`;
            }else {
                rowHtml += `<td contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
            }
        });

        tr.innerHTML = rowHtml;
    }

    tableCreated = true;
    document.getElementById('download').disabled = false;
    document.getElementById('download').style.backgroundColor = '#4285F4';
    document.getElementById('table-container').style.display = "block";

    updateRowNumbers();
    initResizableTable();

    applyPagination();
}

    function initResizableTable() {
        const resizers = document.querySelectorAll('#mainTable .resizer');

        resizers.forEach(resizer => {
            const th = resizer.parentElement;

            // Prevent attaching duplicate event listeners
            if (resizer.dataset.resizableInit === "true") {
                return;
            }
            resizer.dataset.resizableInit = "true";

            // 1. Mouse Drag Resizing
            resizer.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const startX = e.clientX;
                const startWidth = th.offsetWidth;
                let currentWidth = startWidth;
                let animationFrameId = null;

                function updateWidth() {
                    // Minimum column width limit: 25px
                    if (currentWidth >= 25) {
                        th.style.width = `${currentWidth}px`;
                        th.style.minWidth = `${currentWidth}px`;
                    }
                    animationFrameId = null;
                }

                function handleMouseMove(e) {
                    currentWidth = startWidth + (e.clientX - startX);
                    if (!animationFrameId) {
                        animationFrameId = requestAnimationFrame(updateWidth);
                    }
                }

                function handleMouseUp() {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                    }
                }

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });

            // 2. Double-Click Auto-Fit Calculation
            resizer.addEventListener('dblclick', function(e) {
                e.preventDefault();
                e.stopPropagation();

                th.style.width = '';
                th.style.minWidth = '';

                const table = document.getElementById('mainTable');
                const colIndex = th.cellIndex;
                let maxWidth = 30; // Baseline safety minimum

                const dummySpan = document.createElement('span');
                dummySpan.style.visibility = 'hidden';
                dummySpan.style.position = 'absolute';
                dummySpan.style.whiteSpace = 'nowrap';
                dummySpan.style.font = window.getComputedStyle(th).font;
                document.body.appendChild(dummySpan);

                // Measure header text
                dummySpan.innerText = th.innerText.replace(/\s+/g, ' ').trim();
                maxWidth = Math.max(maxWidth, dummySpan.offsetWidth + 20);

                // Measure cell contents in rows
                                const rows = table.querySelectorAll('tbody tr');
                                rows.forEach(row => {
                                    const cell = row.cells[colIndex];
                                    if (cell) {
                                        let textToMeasure = "";
                                        let extraPadding = 25; // Default padding for normal text cells

                                        const selectEl = cell.querySelector('select');
                                        if (selectEl) {
                                            // ONLY measure the currently selected option, ignoring hidden long XPaths
                                            if (selectEl.selectedIndex >= 0) {
                                                textToMeasure = selectEl.options[selectEl.selectedIndex].text;
                                            } else {
                                                textToMeasure = selectEl.value;
                                            }
                                            // Add extra padding to account for the physical dropdown arrow icon
                                            extraPadding = 45;
                                        } else {
                                            textToMeasure = cell.innerText;
                                        }

                                        dummySpan.innerText = textToMeasure;
                                        const cellWidth = dummySpan.offsetWidth + extraPadding;
                                        if (cellWidth > maxWidth) {
                                            maxWidth = cellWidth;
                                        }
                                    }
                                });

                document.body.removeChild(dummySpan);

                th.style.width = `${maxWidth}px`;
                th.style.minWidth = `${maxWidth}px`;
            });
        });
    }

    function clearOverlay(){

        const overlay =
            document.getElementById(
                "overlayContainer"
            );

        if(overlay){

            overlay.innerHTML = "";

        }

    }

    function drawHoveredNode(node){

        clearOverlay();

        const overlay =
            document.getElementById("overlayContainer");

        const img =
            document.getElementById("screenshot");

        if(!overlay || !img || !node)
            return;

        const app =
            window.xmlDoc.getElementsByTagName(
                "XCUIElementTypeApplication"
            )[0];

        const appWidth =
            parseFloat(app.getAttribute("width"));

        const appHeight =
            parseFloat(app.getAttribute("height"));

        const rect =
            img.getBoundingClientRect();

        const scaleX =
            rect.width / appWidth;

        const scaleY =
            rect.height / appHeight;

        const x =
            parseFloat(node.getAttribute("x"));

        const y =
            parseFloat(node.getAttribute("y"));

        const width =
            parseFloat(node.getAttribute("width"));

        const height =
            parseFloat(node.getAttribute("height"));

        const box =
            document.createElement("div");

        box.style.position = "absolute";

        const overlayRect =
            overlay.getBoundingClientRect();

        const imgRect =
            img.getBoundingClientRect();

        const offsetX =
            imgRect.left - overlayRect.left;

        const offsetY =
            imgRect.top - overlayRect.top;

        box.style.left =
            (offsetX + x * scaleX) + "px";

        box.style.top =
            (offsetY + y * scaleY) + "px";

        box.style.width =
            (width * scaleX) + "px";

        box.style.height =
            (height * scaleY) + "px";

        box.style.border =
            "2px dashed blue";

        box.style.pointerEvents =
            "none";

        box.style.boxSizing =
            "border-box";

        overlay.appendChild(box);

        drawParentLayers(node);

    }

    function drawShowElementMarker(rect){

        clearOverlay();

        const overlay =
            document.getElementById("overlayContainer");

        const img =
            document.getElementById("screenshot");

        if(!overlay || !img)
            return;

        const app =
            window.xmlDoc.getElementsByTagName(
                "XCUIElementTypeApplication"
            )[0];

        const appWidth =
            parseFloat(app.getAttribute("width"));

        const appHeight =
            parseFloat(app.getAttribute("height"));

        const imgRect =
            img.getBoundingClientRect();

        const overlayRect =
            overlay.getBoundingClientRect();

        const scaleX =
            imgRect.width / appWidth;

        const scaleY =
            imgRect.height / appHeight;

        const left =
            imgRect.left -
            overlayRect.left +
            rect.x * scaleX;

        const top =
            imgRect.top -
            overlayRect.top +
            rect.y * scaleY;

        const width =
            rect.width * scaleX;

        const height =
            rect.height * scaleY;

        // Red Border
        const box =
            document.createElement("div");

        box.style.position = "absolute";
        box.style.left = left + "px";
        box.style.top = top + "px";
        box.style.width = width + "px";
        box.style.height = height + "px";
        box.style.border = "2px dashed blue";
        box.style.boxSizing = "border-box";
        box.style.pointerEvents = "none";

        overlay.appendChild(box);

    }


    //dotted over lay for specific element and it's node

    function drawParentLayers(node){

        let parent = node.parentNode;

        const colors = [
            "green",
            "orange",
            "purple",
            "cyan"
        ];

        let level = 0;

        while(parent){

            if(parent.nodeType !== 1){

                parent = parent.parentNode;
                continue;

            }

            const type = parent.nodeName;

            // Skip unwanted parents
            if(
                type === "XCUIElementTypeApplication" ||
                type === "XCUIElementTypeWindow" ||
                type === "XCUIElementTypeOther"
            ){

                parent = parent.parentNode;
                continue;

            }

            drawLayer(
                parent,
                colors[level]
            );

            // Stop after first meaningful parent
            break;

        }

    }


    //dotted over lay for specific element and it's node and it's parent node also

    //function drawParentLayers(node){
    //
    //    let parent = node.parentNode;
    //
    //    const colors = [
    //        "green",
    //        "orange",
    //        "purple",
    //        "cyan"
    //    ];
    //
    //    let level = 0;
    //
    //    while(parent){
    //
    //        if(parent.nodeType !== 1){
    //            parent = parent.parentNode;
    //            continue;
    //        }
    //
    //        const type = parent.nodeName;
    //
    //        if(
    //            type === "XCUIElementTypeApplication" ||
    //            type === "XCUIElementTypeWindow"
    //        ){
    //            break;
    //        }
    //
    //        drawLayer(
    //            parent,
    //            colors[level % colors.length]
    //        );
    //
    //        parent = parent.parentNode;
    //
    //        level++;
    //
    //    }
    //
    //}

    function drawLayer(node,color){

        const overlay =
            document.getElementById("overlayContainer");

        const img =
            document.getElementById("screenshot");

        const app =
            window.xmlDoc.getElementsByTagName(
                "XCUIElementTypeApplication"
            )[0];

        const appWidth =
            parseFloat(app.getAttribute("width"));

        const appHeight =
            parseFloat(app.getAttribute("height"));

        const rect =
            img.getBoundingClientRect();

        const scaleX =
            rect.width / appWidth;

        const scaleY =
            rect.height / appHeight;

        const overlayRect =
            overlay.getBoundingClientRect();

        const imgRect =
            img.getBoundingClientRect();

        const offsetX =
            imgRect.left - overlayRect.left;

        const offsetY =
            imgRect.top - overlayRect.top;

        const x =
            parseFloat(node.getAttribute("x"));

        const y =
            parseFloat(node.getAttribute("y"));

        const w =
            parseFloat(node.getAttribute("width"));

        const h =
            parseFloat(node.getAttribute("height"));

        const div =
            document.createElement("div");

        div.style.position = "absolute";

        div.style.left =
            (offsetX + x * scaleX) + "px";

        div.style.top =
            (offsetY + y * scaleY) + "px";

        div.style.width =
            (w * scaleX) + "px";

        div.style.height =
            (h * scaleY) + "px";

        div.style.border =
            "2px dashed " + color;

        div.style.pointerEvents =
            "none";

        div.style.boxSizing =
            "border-box";

        overlay.appendChild(div);

    }

    function testOverlay(){

        clearOverlay();

        const overlay =
            document.getElementById(
                "overlayContainer"
            );

        const box =
            document.createElement("div");

        box.style.position = "absolute";
        box.style.left = "60px";
        box.style.top = "80px";
        box.style.width = "120px";
        box.style.height = "50px";
        box.style.border = "2px dashed red";
        box.style.boxSizing = "border-box";

        overlay.appendChild(box);

    }

    //for coordinates
    async function showCoordinateMarker(x, y) {


        const oldSS =
                document.getElementById("ss");

            if (oldSS) {
                oldSS.remove();
            }

        const container =
            document.getElementById(
                "image-container_ss"
            );

        if (!container) return;

        const screenshot =
            document.getElementById(
                "screenshot"
            );

        if (!screenshot) return;

        // Clear previous content
        container.innerHTML = "";

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.style.position =
            "relative";

        wrapper.style.display =
            "inline-block";

        const img =
            document.createElement(
                "img"
            );

        img.src =
            screenshot.src;

        img.style.width =
            "100px";

        wrapper.appendChild(
            img
        );

        img.onload = () => {

            const appNode =
                window.xmlDoc.getElementsByTagName(
                    "XCUIElementTypeApplication"
                )[0];

            if (!appNode) return;

            const appWidth =
                parseFloat(
                    appNode.getAttribute(
                        "width"
                    )
                );

            const appHeight =
                parseFloat(
                    appNode.getAttribute(
                        "height"
                    )
                );

            const marker =
                document.createElement(
                    "div"
                );

            marker.style.position =
                "absolute";

            marker.style.width =
                "12px";

            marker.style.height =
                "12px";

            marker.style.borderRadius =
                "50%";

            marker.style.background =
                "red";

            marker.style.left =
                (
                    (x / appWidth) *
                    img.width
                    - 6
                ) + "px";

            marker.style.top =
                (
                    (y / appHeight) *
                    img.height
                    - 6
                ) + "px";

            wrapper.appendChild(
                marker
            );
        };

        container.replaceChildren(
            wrapper
        );

        lastClickedImg =
            wrapper;

        container.style.display =
            "flex";
    }

    const tableEC = document.getElementById("myTable");
    let loadingImage = false; // Flag to indicate if an image is currently being loaded
    let lastClickedImg = null; // Variable to keep track of the last clicked image

    tableEC.addEventListener("click", async (event) => {
      // Check if an image is currently being loaded, if yes, cancel the loading
      if (loadingImage) return;

      var plateformOption = plateformName.options[plateformName.selectedIndex].text;
      if (event.target.tagName === "TD" && event.target.cellIndex === 4) {
        const thirdCell = event.target.parentNode.cells[2];
        const innerText = thirdCell.innerText;


    //for coordinates

        if (innerText.startsWith("COORDINATE(")) {

            const match = innerText.match(
                /COORDINATE\((\d+),(\d+)\)/
            );

            const x = parseInt(match[1]);
            const y = parseInt(match[2]);

            showCoordinateMarker(x, y);

            return;
        }
        document.getElementById("brokenText").style.display = "none";

        try {
          loadingImage = true; // Set loadingImage to true to indicate image loading
          if (lastClickedImg) {
            lastClickedImg.remove(); // Remove the previously clicked image
          }

          const imageContainer =
              document.getElementById("image-container_ss");

          const statusBar =
              document.getElementById("div_status_bar_ss");

          if (imageContainer)
              imageContainer.style.display = "flex";

          if (statusBar)
              statusBar.style.display = "flex";

          const el = await driver.findElement(By.xpath(innerText));
          const data = await el.takeScreenshot();
          const screenshot = Buffer.from(data, "base64");
            fs.writeFileSync(`${folderPath}/ss_${count}.png`, screenshot);
          let img = document.createElement("img");
            img.src = `${folderPath}/ss_${count}.png`;
          img.id = "ss";
          style.maxWidth = "100%";
          style.maxHeight = "100%";
          style.width = "100%";
          style.height = "100%";
          style.objectFit = "contain";
          document.getElementById("image-container_ss").appendChild(img);
          lastClickedImg = img; // Set the last clicked image
          count = count + 1;
        } catch (e) {

                const imageContainer =
                    document.getElementById("image-container_ss");

                const brokenText =
                    document.getElementById("brokenText");

                if (imageContainer)
                    imageContainer.style.display = "none";

                if (brokenText)
                    brokenText.style.display = "flex";

                console.error("IOS ELEMENT ERROR:", e);
                                showErrorPopup("Failed to Load Element Image", e);
                        } finally {
          loadingImage = false; // Reset loadingImage flag after image loading is complete or failed
          document.getElementById("div_status_bar_ss").style.display = "none";
        }
      }
    });

    document.getElementById("scrapeUI").addEventListener("click", async () => {

            const pageNameInput = document.getElementById("pagename_searchbox");
            const pageName = pageNameInput ? pageNameInput.value : "";

            // NEW: Strict Global Validation Check BEFORE anything else happens
            if (!isGlobalPageNameValid(pageName)) {
                handleInvalidPageNameAttempt();
                return;
            }

            dtControls = [];
            controlNameLists = [];

        const xmlNodes = window.xmlDoc.getElementsByTagName("*");

        const ignoreSystemTypes = [
            "AppiumAUT",
            "XCUIElementTypeApplication",
            "XCUIElementTypeWindow",
            "hierarchy"
        ];

        for (let i = 0; i < xmlNodes.length; i++) {
            const node = xmlNodes[i];

            // 1. Skip system root elements
            if (ignoreSystemTypes.includes(node.nodeName))
                continue;

            // 2. Filter out invisible or unrendered 0-sized elements
            const width = parseFloat(node.getAttribute("width"));
            const height = parseFloat(node.getAttribute("height"));
            if (!isNaN(width) && !isNaN(height) && (width <= 0 || height <= 0)) {
                continue;
            }

            // 3. Extract text/attributes to determine if element is meaningful
            const hasTextOrLabel = (
                (node.getAttribute("label") && node.getAttribute("label").trim() !== "") ||
//                (node.getAttribute("name") && node.getAttribute("name").trim() !== "") ||
                (node.getAttribute("value") && node.getAttribute("value").trim() !== "") ||
                (node.getAttribute("content-desc") && node.getAttribute("content-desc").trim() !== "") ||
                (node.getAttribute("text") && node.getAttribute("text").trim() !== "")
            );

            // 4. Skip generic containers (XCUIElementTypeOther/Cell) ONLY IF they have no text/label content
            const isGenericContainer = (
                node.nodeName === "XCUIElementTypeOther" ||
                node.nodeName === "XCUIElementTypeCell" ||
                node.nodeName === "android.view.View"
            );

            if (isGenericContainer && !hasTextOrLabel) {
                continue;
            }

            // 5. Generate clean, professional variable name (e.g., btn_Login)
            let controlName = generateProfessionalControlName(node);

            // 6. Fetch XPaths using updated getAllPossibleXPaths
            let allXPaths = getAllPossibleXPaths(node);

            // Extract input value if it's a text entry field
            let controlValue = "";
            if (["XCUIElementTypeTextField", "XCUIElementTypeSecureTextField", "XCUIElementTypeSearchField", "XCUIElementTypeTextView"].includes(node.nodeName)) {
                controlValue = node.getAttribute("value") || "";
                let label = node.getAttribute("label") || "";
                let name = node.getAttribute("name") || "";
                let placeholder = node.getAttribute("placeholderValue") || "";

                if (controlValue === placeholder || controlValue === label || controlValue === name) {
                    controlValue = "";
                }
            }

            dtControls.push({
                ControlName: controlName,
                ControlType: node.nodeName.replace("XCUIElementType", "").replace("android.widget.", ""),
                ControlId: allXPaths,
                ControlValue: controlValue,
                Fingerprint: new XMLSerializer().serializeToString(node)
            });
        }

        createAndAppendTable(dtControls);
        dtControls = [];
    });

    document.getElementById("closePreview").addEventListener("click", () => {
        document.getElementById("split-div3").style.display = "none";

        const ss = document.getElementById("ss");
        if (ss) {
            ss.remove();
        }

        document.getElementById("image-container_ss").innerHTML = "";
    });

    const tokenInput = document.getElementById("tokenInput");

    tokenInput.addEventListener("keydown", function (e) {

        if (e.key !== "Enter") return;

        e.preventDefault();

        const encryptedToken = tokenInput.value.trim();
        const tokenStatus = document.getElementById("tokenStatus");

        tokenInput.readOnly = true;

        // Decrypt the pasted token
        const decryptedToken = decryptData(encryptedToken);

        let isValidJson = false;
        let parsedData = null;

        // Strict Evaluation: Prevent passed states on partial block corruption
        if (decryptedToken) {
            try {
                parsedData = JSON.parse(decryptedToken);
                // Verify structural object properties to guarantee total validity
                if (parsedData && (parsedData.userID || parsedData.baseUrl)) {
                    isValidJson = true;
                }
            } catch (e) {
                isValidJson = false;
            }
        }

        console.log("Validation Result:", isValidJson);

        // Inside your tokenInput keydown listener:
                if (isValidJson && parsedData) {
                    // Hide token input, Show connected status & Change button
                    tokenInput.style.setProperty("display", "none", "important");
                    tokenStatus.style.setProperty("display", "block", "important");

                    const changeTokenBtn = document.getElementById("changeTokenBtn");
                    if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "inline-block", "important");

                    tokenStatus.innerHTML = "✅ Connected";
                    tokenStatus.style.backgroundColor = "#d4edda";
                    tokenStatus.style.border = "1px solid #c3e6cb";
                    tokenStatus.style.color = "#155724";

                    localStorage.setItem("algoQAUser", JSON.stringify(parsedData));
                    console.log("Saved Data:", localStorage.getItem("algoQAUser"));

                    const runBtn = document.getElementById("Run");

                    // Session Check: If app is already active, lock Launch but restore scraper controls
                    if (driver) {
                        runBtn.disabled = true;
                        runBtn.style.backgroundColor = "#B6B6B4";

                        const featureButtons = ["Scrape", "scrapeUI", "reset", "algoQA"];
                        featureButtons.forEach(btnId => {
                            const btn = document.getElementById(btnId);
                            if (btn) {
                                btn.disabled = false;
                                btn.style.backgroundColor = "#4285F4";
                            }
                        });
                    } else {
                        runBtn.disabled = false;
                        runBtn.style.backgroundColor = "#4285F4";
                    }

                } else {
                    // Clear and fail immediately if token is invalid or tampered with
                    tokenInput.style.setProperty("display", "none", "important");
                    tokenStatus.style.setProperty("display", "block", "important");
                    tokenStatus.innerHTML = "❌ Invalid Token";
                    tokenStatus.style.backgroundColor = "#f8d7da";
                    tokenStatus.style.border = "1px solid #f5c6cb";
                    tokenStatus.style.color = "#721c24";

                    // Hide change button on error
                    const changeTokenBtn = document.getElementById("changeTokenBtn");
                    if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "none", "important");

                    setTimeout(() => {
                        tokenStatus.style.setProperty("display", "none", "important");
                        tokenInput.style.setProperty("display", "inline-block", "important");
                        tokenInput.value = "";
                        tokenInput.readOnly = false;
                        tokenInput.focus();
                    }, 2000);
                }
    });

    document.getElementById("algoQA").addEventListener("click", async () => {
                const userData = JSON.parse(localStorage.getItem("algoQAUser"));
                if (!userData) {
                    showCustomAlert("Authentication Error", "Token data not found. Please paste your token.");
                    return;
                }

                if (!tableCreated || !hasValidTableData('myTable')) {
                    showCustomAlert("Export Failed", "No scraped data found to send.");
                    return;
                }

                if ((hiddenColumns && hiddenColumns.length > 0) || (hiddenRows && hiddenRows.length > 0)) {
                    pendingExportAction = "algoQA";
                    showHiddenColumnsWarning();
                } else {
                    await sendTableDataToAPI("myTable");
                }
            });

    async function sendTableDataToAPI(tableId) {
            const userData = JSON.parse(localStorage.getItem("algoQAUser"));
            if (!userData) {
                showCustomAlert("Authentication Error", "Token data not found.");
                return;
            }

            var allHeaders = Array.from(document.querySelectorAll('#mainTable thead tr th'));

            // Map visible headers and their original indices to safely extract cells from hidden rows
            var visibleHeaderIndices = [];
            var visibleHeaders = allHeaders.filter((th, index) => {
                if (window.getComputedStyle(th).display !== 'none') {
                    visibleHeaderIndices.push(index);
                    return true;
                }
                return false;
            });

            var rows = document.querySelectorAll(`#${tableId} tr`);
            var tableData = [];

            rows.forEach((row) => {
                // Always skip empty placeholders and error rows
                if (row.classList.contains('empty-excel-row') || row.classList.contains('no-results-row')) return;

                // Only skip if the row is explicitly hidden by the user's Context Menu feature
                if (typeof hiddenRows !== 'undefined' && hiddenRows.some(h => h.rowElement === row)) return;

                var allCells = Array.from(row.querySelectorAll('td'));
                if (allCells.length === 0) return;

                var rowObj = {
                    "CONTROL NAME": "",
                    "CONTROL TYPE": "",
                    "XPATH": "",
                    "PAGE NAME": "",
                    "IDENTIFICATION TYPE": "",
                    "CONTROL VALUE": "",
                    "FEATURE NAME": "",
                    "NODE NAME": "",
                    "FINGERPRINT": "",
                    "APP URL": ""
                };

                visibleHeaders.forEach((th, idx) => {
                    var cellIndex = visibleHeaderIndices[idx];
                    var cell = allCells[cellIndex];
                    if (!cell) return;

                    var thText = th.innerText.replace('Delete Column', '').replace('Add Column', '').trim().toUpperCase();
                    var selectEl = cell.querySelector('select');
                    var val = selectEl ? selectEl.value.trim() : cell.innerText.trim();

                    if (thText.includes('CONTROL NAME')) rowObj["CONTROL NAME"] = val;
                    else if (thText.includes('CONTROL TYPE')) rowObj["CONTROL TYPE"] = val;
                    else if (thText.includes('CONTROL ID')) rowObj["XPATH"] = val;
                    else if (thText.includes('PAGE NAME')) rowObj["PAGE NAME"] = val;
                    else if (thText.includes('IDENTIFICATION TYPE')) rowObj["IDENTIFICATION TYPE"] = val;
                    else if (thText.includes('CONTROL VALUE')) rowObj["CONTROL VALUE"] = val;
                    else if (thText.includes('FEATURE NAME')) rowObj["FEATURE NAME"] = val;
                    else if (thText.includes('NODE NAME')) rowObj["NODE NAME"] = val;
                    else if (th.classList.contains('custom-editable-header')) {
                        var colName = th.querySelector('span')?.innerText.trim() || thText;
                        rowObj[colName] = val;
                    }
                });

                tableData.push(rowObj);
            });

            if (tableData.length === 0) {
                showCustomAlert("Export Failed", "No scraped data found.");
                return;
            }

            const payload = {
                data: tableData,
                userID: Number(userData.userID),
                baseUrl: userData.baseUrl,
                projectId: userData.project_id,
                launchUrl: userData.launchUrl,
                projectName: userData.project_name,
                applicationTypeId: Number(userData.application_type_id),
                applicationType: "Mobile"
            };

            console.log("Payload:", payload);

            try {
                const endpoint = userData.project_id ? "saveReScraperData" : "MobileAutomationScraperData";
                const response = await fetch(`${userData.baseUrl}/project/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (!response.ok) throw new Error("API request failed");

                showCustomAlert("Success!", "Scraped data shared successfully to AlgoQA.", "info");

                if (driver) { try { await driver.quit(); } catch (err) {} }
                const { exec } = require("child_process");
                exec("xcrun simctl shutdown all", () => { ipcRenderer.send("close-app"); });

            } catch (error) {
                console.error("Error sending table data:", error);
                showErrorPopup("Failed to share data to AlgoQA", error);
            }
        }



    //document.getElementById("rotateBtn").addEventListener("click", () => {
    //
    //    const screenshot = document.getElementById("screenshot");
    //
    //    if (!screenshot) return;
    //
    //    rotation += 90;
    //
    //    screenshot.style.transition = "transform 0.3s ease";
    //    screenshot.style.transformOrigin = "center center";
    //    screenshot.style.transform =
    //        `rotate(${rotation}deg)`;
    //
    //});


    document.getElementById("refreshBtn").addEventListener("click", async () => {

            const container = document.getElementById("image-container");
            const globalOverlay = document.getElementById("overlay");
            const appRunningPopup = document.getElementById("AppRunningPopup");

            // 1. Keep the global blocker windows turned off
            if (globalOverlay) globalOverlay.style.display = "none";
            if (appRunningPopup) appRunningPopup.style.display = "none";

            // 2. Mount the localized overlay loader context over the screenshot area
            let localLoader = document.getElementById("localTouchLoader");
            if (!localLoader && container) {
                localLoader = document.createElement("div");
                localLoader.id = "localTouchLoader";
                localLoader.innerHTML = `
                    <div class="local-blur-overlay">
                        <img src="icon/load-8510_256.gif" style="height: 60px; width: 60px; max-width:none; max-height:none;"/>
                    </div>
                `;
                container.appendChild(localLoader);
            }

            if (localLoader) localLoader.style.display = "block";

            try {
                // ---> NEW CHECK: Verifies app is actually in foreground <---
                await checkAppForegroundState();

                // Take latest screenshot via Appium driver
                const image = await driver.takeScreenshot();

                require("fs").writeFileSync(
                    `${folderPath}/image0.png`,
                    image,
                    "base64"
                );

                // Hide the dummy device text since we are loading an active image screen
                const dummy = document.getElementById("dummyDevice");
                if (dummy) {
                    dummy.style.display = "none";
                }

                let screenshot = document.getElementById("screenshot");

                // If the element was deleted by the Reset button, recreate it entirely
                if (!screenshot) {
                    screenshot = document.createElement("img");
                    screenshot.id = "screenshot";

                    // Pre-apply layout constraints so background shifts don't bleed through on initialization
                    screenshot.style.width = BASE_WIDTH + "px";
                    screenshot.style.height = BASE_HEIGHT + "px";
                    screenshot.style.display = "block";
                    screenshot.style.margin = "0 auto";

                    // Re-attach all required drawing, mouse, and click interactions
                    enableImageDragging(screenshot);

                    screenshot.onmousemove = function (e) {
                        previewElement(e);
                    };

                    screenshot.onmouseleave = function () {
                        showElementHover = false;
                        lastXPath = "";
                        clearTimeout(hoverTimer);
                        clearOverlay();
                    };

                    let deviceSwipeStartX = 0;
                    let deviceSwipeStartY = 0;
                    let isDeviceSwiping = false;

                    screenshot.onmousedown = function (e) {
                        if (tapMode || zoomLevel > 1) return;
                        deviceSwipeStartX = e.clientX;
                        deviceSwipeStartY = e.clientY;
                        isDeviceSwiping = false;
                    };

                    screenshot.onmouseup = async function (e) {
                        if (tapMode || zoomLevel > 1) return;

                        const diffX = e.clientX - deviceSwipeStartX;
                        const diffY = e.clientY - deviceSwipeStartY;
                        const distance = Math.sqrt(diffX * diffX + diffY * diffY);

                        if (distance > 15) {
                            isDeviceSwiping = true;

                            const rect = screenshot.getBoundingClientRect();
                            const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                            const appWidth = parseFloat(appNode.getAttribute("width"));
                            const appHeight = parseFloat(appNode.getAttribute("height"));
                            const scaleX = appWidth / rect.width;
                            const scaleY = appHeight / rect.height;

                            const startX = Math.round((deviceSwipeStartX - rect.left) * scaleX);
                            const startY = Math.round((deviceSwipeStartY - rect.top) * scaleY);
                            const endX = Math.round((e.clientX - rect.left) * scaleX);
                            const endY = Math.round((e.clientY - rect.top) * scaleY);

                            await performSwipe(startX, startY, endX, endY);
                        }
                    };

                    screenshot.onclick = async function (e) {
                        if (hasDragged) return;

                        if (!tapMode) {
                            if (isDeviceSwiping) return;

                            const rect = screenshot.getBoundingClientRect();
                            const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                            const appWidth = parseFloat(appNode.getAttribute("width"));
                            const appHeight = parseFloat(appNode.getAttribute("height"));
                            const scaleX = appWidth / rect.width;
                            const scaleY = appHeight / rect.height;
                            const x = Math.round((e.clientX - rect.left) * scaleX);
                            const y = Math.round((e.clientY - rect.top) * scaleY);

                            await performTouch(x, y);
                            return;
                        }

                        const rect = screenshot.getBoundingClientRect();
                        const appNode = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
                        const appWidth = parseFloat(appNode.getAttribute("width"));
                        const appHeight = parseFloat(appNode.getAttribute("height"));
                        const scaleX = appWidth / rect.width;
                        const scaleY = appHeight / rect.height;
                        const clickX = (e.clientX - rect.left) * scaleX;
                        const clickY = (e.clientY - rect.top) * scaleY;

                        findIOSLocator(clickX, clickY);
                    };

                    // Put it back inside the placeholder container area
                    container.appendChild(screenshot);
                    imgTagFlag = true;
                }

                // Force cache eviction and set the updated image file path source
                screenshot.src = "";
                screenshot.src = `${folderPath}/image0.png?t=${Date.now()}`;

                await new Promise(resolve => {
                    screenshot.onload = resolve;
                    screenshot.onerror = resolve;
                });

                // Sync and pull down fresh element coordinates matching the image update
                await driver.sleep(800);
                const pageSource = await driver.getPageSource();
                const parser = new DOMParser();
                window.xmlDoc = parser.parseFromString(pageSource, "text/xml");

                // Explicitly force buttons to re-enable when page loads successfully
                document.getElementById('scrapeUI').disabled = false;
                document.getElementById('scrapeUI').style.backgroundColor = '#4285F4';

                document.getElementById('reset').disabled = false;
                document.getElementById('reset').style.backgroundColor = '#4285F4';

                document.getElementById('algoQA').disabled = false;
                document.getElementById('algoQA').style.backgroundColor = '#4285F4';

                document.getElementById('download').disabled = false;
                document.getElementById('download').style.backgroundColor = '#4285F4';

                document.getElementById('recordScenarioBtn').disabled = false;
                document.getElementById('recordScenarioBtn').style.backgroundColor = '#4285F4';

                // Also ensure table control state remains true so downloads work seamlessly
                tableCreated = true;

                clearOverlay();

                // SUCCESSFUL UI LAYOUT FIXES ONLY (Moved out of finally block)
                zoomLevel = 1;
                screenshot.style.transition = "all 0.3s ease";
                screenshot.style.width = BASE_WIDTH + "px";
                screenshot.style.height = BASE_HEIGHT + "px";
                screenshot.style.maxWidth = "none";
                screenshot.style.maxHeight = "none";
                screenshot.style.objectFit = "unset";
                screenshot.style.display = "block";
                screenshot.style.margin = "0 auto";
                screenshot.style.transform = `scale(1) rotate(${rotation}deg)`;

                document.querySelector("#zoomInBtn + .toolTip").textContent = "Zoom In (100%)";
                document.querySelector("#zoomOutBtn + .toolTip").textContent = "Zoom Out (100%)";

            } catch (err) {
                console.error("Refresh Error:", err);

                let readableError = err && err.message ? err.message.split('\n')[0].substring(0, 80) : String(err).substring(0, 80);

                const screenshotImg = document.getElementById("screenshot");
                if (screenshotImg) screenshotImg.style.display = "none";

                const dummy = document.getElementById("dummyDevice");
                if (dummy) {
                    dummy.style.display = "block";
                    dummy.innerHTML = `
                        <div class="phone-welcome-overlay">
                            <svg id="dummyIcon" class="info-svg" viewBox="0 0 24 24" fill="#d9534f" xmlns="http://www.w3.org/2000/svg" style="width: 40px; height: 40px; margin-bottom: 12px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                            <p id="dummyMainText" style="color: #d9534f; padding: 0 10px; font-weight: 600; font-size: 13px; margin-bottom: 5px; line-height: 1.4;">App session interrupted.<br>Please ensure the app is active, then click 'Launch Application' to reconnect.</p>
                            <p id="dummyErrorText" style="display: block; color: #d9534f; font-size: 10px; margin-top: 8px; line-height: 1.2; padding: 0 10px; word-break: break-word; opacity: 0.8;">*${readableError}</p>
                        </div>
                    `;
                }

                const runBtn = document.getElementById('Run');
                if (runBtn) {
                    runBtn.disabled = false;
                    runBtn.style.backgroundColor = '#4285F4';
                }

                const actionButtons = ['Scrape', 'scrapeUI', 'reset', 'download', 'algoQA', 'recordScenarioBtn'];
                            actionButtons.forEach(id => {
                                const btn = document.getElementById(id);
                                if (btn) {
                                    btn.disabled = true;
                                    btn.style.backgroundColor = '#B6B6B4';
                                }
                            });

                driver = null;

            } finally {
                // ONLY hide the loading spinner in the finally block
                const targetLoader = document.getElementById("localTouchLoader");
                if (targetLoader) {
                    targetLoader.style.display = "none";
                }
            }
        });

    document.getElementById("zoomInBtn").addEventListener("click", () => {

        const screenshot = document.getElementById("screenshot");

        if (!screenshot) return;

        zoomLevel += 0.1;
        const img =
            document.getElementById("screenshot");

        img.style.cursor =
            zoomLevel > 1
                ? "grab"
                : "default";

        screenshot.style.transition = "all 0.3s ease";

        screenshot.style.width =
            (BASE_WIDTH * zoomLevel) + "px";

        screenshot.style.height =
            (BASE_HEIGHT * zoomLevel) + "px";

        screenshot.style.transform =
            `rotate(${rotation}deg)`;

        document.querySelector("#zoomInBtn + .toolTip").textContent =
            `Zoom In (${Math.round(zoomLevel * 100)}%)`;

        document.querySelector("#zoomOutBtn + .toolTip").textContent =
            `Zoom Out (${Math.round(zoomLevel * 100)}%)`;

    });

    document.getElementById("zoomOutBtn").addEventListener("click", () => {

        const screenshot = document.getElementById("screenshot");

        if (!screenshot) return;

        if (zoomLevel > 0.2)
            zoomLevel -= 0.1;
            const img =
                document.getElementById("screenshot");

            img.style.cursor =
                zoomLevel > 1
                    ? "grab"
                    : "default";

        screenshot.style.transition = "all 0.3s ease";

        screenshot.style.width =
            (BASE_WIDTH * zoomLevel) + "px";

        screenshot.style.height =
            (BASE_HEIGHT * zoomLevel) + "px";

        screenshot.style.transform =
            `rotate(${rotation}deg)`;

        document.querySelector("#zoomInBtn + .toolTip").textContent =
            `Zoom In (${Math.round(zoomLevel * 100)}%)`;

        document.querySelector("#zoomOutBtn + .toolTip").textContent =
            `Zoom Out (${Math.round(zoomLevel * 100)}%)`;

    });

    document.getElementById("resetZoomBtn").addEventListener("click", () => {

        const screenshot = document.getElementById("screenshot");

        if (!screenshot) return;

        zoomLevel = 1;
        const img =
            document.getElementById("screenshot");

        img.style.cursor = "default";

        screenshot.style.transition = "all 0.3s ease";

        screenshot.style.width =
            BASE_WIDTH + "px";

        screenshot.style.height =
            BASE_HEIGHT + "px";

        screenshot.style.transform =
            `rotate(${rotation}deg)`;

        document.querySelector("#zoomInBtn + .toolTip").textContent =
            "Zoom In (100%)";

        document.querySelector("#zoomOutBtn + .toolTip").textContent =
            "Zoom Out (100%)";

    });

    document.getElementById("tapBtn").addEventListener("click", () => {

        tapMode = true;

        document.getElementById("tapBtn").style.background = "#4285F4";
        document.getElementById("tapBtn").style.color = "#fff";

        document.getElementById("touchBtn").style.background = "#fff";
        document.getElementById("touchBtn").style.color = "#333";

    });

    document.getElementById("touchBtn").addEventListener("click", () => {

        tapMode = false;

        document.getElementById("touchBtn").style.background = "#4285F4";
        document.getElementById("touchBtn").style.color = "#fff";

        document.getElementById("tapBtn").style.background = "#fff";
        document.getElementById("tapBtn").style.color = "#333";

    });

    function enableImageDragging(img) {

        const container =
            document.getElementById("image-container");

        img.addEventListener("mousedown", (e) => {

            if (zoomLevel <= 1) {
                return;
            }

            isDragging = true;
            hasDragged = false;

            dragStartX = e.clientX;
            dragStartY = e.clientY;

            scrollStartLeft = container.scrollLeft;
            scrollStartTop = container.scrollTop;

            img.style.cursor = "grabbing";

            e.preventDefault();

        });

        document.addEventListener("mousemove", (e) => {

            if (!isDragging)
                return;

            hasDragged = true;

            container.scrollLeft =
                scrollStartLeft -
                (e.clientX - dragStartX);

            container.scrollTop =
                scrollStartTop -
                (e.clientY - dragStartY);

        });

        document.addEventListener("mouseup", () => {

            isDragging = false;

            img.style.cursor =
                zoomLevel > 1 ? "grab" : "default";

            setTimeout(() => {
                hasDragged = false;
            }, 50);

        });

    }


    const changeTokenBtn = document.getElementById("changeTokenBtn");

        changeTokenBtn.addEventListener("click", () => {
            const tokenInput = document.getElementById("tokenInput");

            // Remove saved token payload
            localStorage.removeItem("algoQAUser");

            // Restore token input field
            tokenInput.value = "";
            tokenInput.style.setProperty("display", "inline-block", "important");
            tokenInput.disabled = false;
            tokenInput.readOnly = false;
            tokenInput.removeAttribute("disabled");
            tokenInput.removeAttribute("readonly");

            // Strictly hide the change button and connected status
            changeTokenBtn.style.setProperty("display", "none", "important");
            document.getElementById("tokenStatus").style.setProperty("display", "none", "important");

            // Lock down dependent feature buttons until re-authenticated
            const lockButtons = ["Run", "Scrape", "scrapeUI", "reset", "algoQA"];
            lockButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    btn.style.backgroundColor = "#B6B6B4";
                }
            });

            // Explicitly guarantee that download actions bypass this freeze block completely
            const downloadBtn = document.getElementById("download");
            if (downloadBtn && tableCreated) {
                downloadBtn.disabled = false;
                downloadBtn.style.backgroundColor = "#4285F4";
            }

            tokenInput.focus();
        });





   //Xpath Generation
   function generateUniqueXPath(node) {
           if (!node || node.nodeType !== 1) return "";

           const stopNodes = ["AppiumAUT", "XCUIElementTypeApplication", "hierarchy", "XCUIElementTypeWindow"];
           if (stopNodes.includes(node.nodeName)) {
               return `//${node.nodeName}`;
           }

           // --- STRATEGY 1: Global Unique Attribute Match ---
           // CHANGED: Removed "name" from this array to match the logic above
           const attributes = ["label", "resource-id", "content-desc", "text", "value"];

           for (let attr of attributes) {
               let val = node.getAttribute(attr);
               if (val && val.trim() !== "") {
                   val = val.trim().replace(/"/g, '\\"'); // Escape quotes safely
                   let baseXpath = `//${node.nodeName}[@${attr}="${val}"]`;

                   if (isXPathUnique(baseXpath)) {
                       return baseXpath;
                   }
               }
           }

           // --- STRATEGY 2: Find the Closest Unique Ancestor ---
           // Instead of using global indices like (//Tag)[35], find a unique parent and build a relative path
           let ancestor = node.parentNode;
           let ancestorPath = "";

           while (ancestor && ancestor.nodeType === 1 && !stopNodes.includes(ancestor.nodeName)) {
               for (let attr of attributes) {
                   let val = ancestor.getAttribute(attr);
                   if (val && val.trim() !== "") {
                       val = val.trim().replace(/"/g, '\\"');
                       let testAncestorXpath = `//${ancestor.nodeName}[@${attr}="${val}"]`;

                       if (isXPathUnique(testAncestorXpath)) {
                           ancestorPath = testAncestorXpath;
                           break;
                       }
                   }
               }
               if (ancestorPath) break;
               ancestor = ancestor.parentNode;
           }

           // If we found a unique container parent, pinpoint our element inside it
           if (ancestorPath) {
               let relativeXpath = `${ancestorPath}//${node.nodeName}`;

               // Check if it's unique inside that container
               if (isXPathUnique(relativeXpath)) {
                   return relativeXpath;
               }

               // If duplicates exist inside the unique container, index just within this scope
               let results = window.xmlDoc.evaluate(relativeXpath, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
               for (let i = 0; i < results.snapshotLength; i++) {
                   if (results.snapshotItem(i) === node) {
                       return `(${relativeXpath})[${i + 1}]`;
                   }
               }
           }

           // --- STRATEGY 3: Local Index Relative to Immediate Parent ---
           // If no unique text or container is found, fall back to structural tag placement: Parent/Child[Index]
           let parent = node.parentNode;
           if (parent && parent.nodeType === 1 && !stopNodes.includes(parent.nodeName)) {
               let siblings = parent.childNodes;
               let sameTagIndex = 0;
               let matchIndex = 1;

               for (let i = 0; i < siblings.length; i++) {
                   if (siblings[i].nodeType === 1 && siblings[i].nodeName === node.nodeName) {
                       sameTagIndex++;
                       if (siblings[i] === node) {
                           matchIndex = sameTagIndex;
                       }
                   }
               }

               // Recursively build path for the parent structure
               let parentXpath = generateUniqueXPath(parent);
               return `${parentXpath}/${node.nodeName}[${matchIndex}]`;
           }

           // --- STRATEGY 4: Absolute Global Fallback ---
           let fallbackXpath = `//${node.nodeName}`;
           let globalResults = window.xmlDoc.evaluate(fallbackXpath, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
           for (let i = 0; i < globalResults.snapshotLength; i++) {
               if (globalResults.snapshotItem(i) === node) {
                   return `(${fallbackXpath})[${i + 1}]`;
               }
           }

           return fallbackXpath;
       }

    // Helper utility to check absolute uniqueness of a generated path string
    function isXPathUnique(xpath) {
        try {
            let results = window.xmlDoc.evaluate(xpath, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            return results.snapshotLength === 1;
        } catch (e) {
            return false;
        }
    }



// Get All Possible XPaths
function getAllPossibleXPaths(node) {
    if (!node || node.nodeType !== 1) return [];

    let candidates = [];
    const tagName = node.nodeName;

    if (tagName === "AppiumAUT" || tagName === "XCUIElementTypeApplication" || tagName === "XCUIElementTypeWindow" || tagName === "hierarchy") {
        return [`//${tagName}`];
    }

    // 1. Calculate Coordinate (COMMENTED OUT)
    /*
    let x = parseFloat(node.getAttribute("x"));
    let y = parseFloat(node.getAttribute("y"));
    let width = parseFloat(node.getAttribute("width"));
    let height = parseFloat(node.getAttribute("height"));

    let coordXPath = null;
    if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        let centerX = Math.round(x + (width / 2));
        let centerY = Math.round(y + (height / 2));
        coordXPath = `COORDINATE(${centerX},${centerY})`;
    }
    */

    const isGeneric = (tagName === "XCUIElementTypeOther" || tagName === "Other" || tagName === "android.view.View" || tagName === "XCUIElementTypeCell");

    // 2. ALWAYS extract useful attributes (like [@label="HZ"]) "name",
    const attributes = ["label", "resource-id", "content-desc", "text", "value"];
    for (let attr of attributes) {
        let val = node.getAttribute(attr);
        if (val && val.trim() !== "") {
            let cleanVal = val.trim().replace(/"/g, '');
            let xpath = `//${tagName}[@${attr}="${cleanVal}"]`;
            if (!candidates.includes(xpath)) {
                candidates.push(xpath);
            }
        }
    }

    // 2b. If generic tag has NO direct attributes, resolve via nearest labeled Parent Context
    if (candidates.length === 0 && isGeneric) {
        let ancestor = node.parentNode;
        let ancestorXpath = "";

        while (ancestor && ancestor.nodeType === 1 && !["XCUIElementTypeApplication", "hierarchy", "AppiumAUT"].includes(ancestor.nodeName)) {
            for (let attr of attributes) {
                let parentVal = ancestor.getAttribute(attr);
                if (parentVal && parentVal.trim() !== "") {
                    let cleanParentVal = parentVal.trim().replace(/"/g, '');
                    ancestorXpath = `//${ancestor.nodeName}[@${attr}="${cleanParentVal}"]`;
                    break;
                }
            }
            if (ancestorXpath) break;
            ancestor = ancestor.parentNode;
        }

        if (ancestorXpath) {
            let relativePath = `${ancestorXpath}//${tagName}`;
            let scopedResults = window.xmlDoc.evaluate(relativePath, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < scopedResults.snapshotLength; i++) {
                if (scopedResults.snapshotItem(i) === node) {
                    candidates.push(`(${relativePath})[${i + 1}]`);
                    break;
                }
            }
        }
    }

    // 3. Process index fallback if not generic, OR if generic has no parent attributes found
    if (!isGeneric || candidates.length === 0) {
        let fallbackXpath = `//${tagName}`;
        let globalResults = window.xmlDoc.evaluate(fallbackXpath, window.xmlDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < globalResults.snapshotLength; i++) {
            if (globalResults.snapshotItem(i) === node) {
                let indexedXpath = `(${fallbackXpath})[${i + 1}]`;
                if (!candidates.includes(indexedXpath)) {
                    candidates.push(indexedXpath);
                }
                break;
            }
        }
    }

    // 4. Ensure coordinates are always in the list (COMMENTED OUT)
    /*
    if (coordXPath && !candidates.includes(coordXPath)) {
        if (isGeneric) {
            // For "Other" elements, prioritize the Coordinate at the top of the dropdown
            candidates.unshift(coordXPath);
        } else {
            // For standard buttons/text, put Coordinate at the bottom
            candidates.push(coordXPath);
        }
    }
    */

    return candidates.length > 0 ? candidates : [`(${tagName})[1]`];
}




// --- GLOBAL PAGE NAME VALIDATOR ---
function isGlobalPageNameValid(name) {
    if (!name || name.trim() === '') return false; // Empty is invalid

    // NEW: Reserve "All" so it cannot be used as a real scraped page name
    if (name.trim().toLowerCase() === 'all') return false;

    const format = /[!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?]+/;
    const onlySpecialCharsRegex = /^[!@#$%^&*(),.?":{}|<>]*$/;

    if (format.test(name) || /^\d+$/.test(name) || name.includes("  ") || name.startsWith(" ") || name.endsWith(" ") || onlySpecialCharsRegex.test(name)) {
        return false;
    }
    return true;
}

function handleInvalidPageNameAttempt() {
    const pageNameInput = document.getElementById('pagename_searchbox');
    if (pageNameInput) {
        pageNameInput.style.borderColor = "#dc3545"; // Red
        pageNameInput.focus();
    }
    if (typeof flashPageNameError === "function") flashPageNameError(); // Flashes the badge red

    // NEW: Updated alert text to mention "All" is reserved
    showCustomAlert("Invalid Page Name", "Please enter a valid Page Name.It can accept alphanumeric characters, a single space between words, and must start with an alphabet.", "warning");
}


    //finding xpath
    async function findIOSLocator(clickX, clickY) {

            const pageNameInput = document.getElementById("pagename_searchbox");
                        const pageName = pageNameInput ? pageNameInput.value : "";

                        // NEW: Strict Global Validation Check
                        if (!isGlobalPageNameValid(pageName)) {
                            handleInvalidPageNameAttempt();
                            return;
                        }

            const nodes = window.xmlDoc.getElementsByTagName("*");
            let matchedNode = null;
            let smallestArea = Number.MAX_VALUE;
            let bestScore = -1;

            const rootTypes = [
                "AppiumAUT",
                "XCUIElementTypeApplication",
                "XCUIElementTypeWindow",
                "hierarchy"
            ];

            function getElementScore(node) {
                const tag = node.nodeName;
                if (tag.includes("Button") || tag.includes("TextField") || tag.includes("SearchField") || tag.includes("StaticText") || tag.includes("TextView")) {
                    return 10;
                }
                if (tag.includes("Image") || tag.includes("Icon")) {
                    return 8;
                }
                if (tag.includes("Cell")) {
                    return 5;
                }
                if (tag.includes("Other") || tag.includes("View")) {
                    const hasText = node.getAttribute("label") || node.getAttribute("name") || node.getAttribute("value") || node.getAttribute("content-desc");
                    return hasText ? 4 : 2;
                }
                return 1;
            }

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                if (rootTypes.includes(node.nodeName)) {
                    continue;
                }

                const x = parseFloat(node.getAttribute("x"));
                const y = parseFloat(node.getAttribute("y"));
                const width = parseFloat(node.getAttribute("width"));
                const height = parseFloat(node.getAttribute("height"));

                if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
                    continue;
                }

                if (width <= 0 || height <= 0) continue;

                if (clickX >= x && clickX <= (x + width) && clickY >= y && clickY <= (y + height)) {

                    const area = width * height;
                    const score = getElementScore(node);

                    if (area < smallestArea) {
                        smallestArea = area;
                        bestScore = score;
                        matchedNode = node;
                    } else if (area === smallestArea) {
                        if (score > bestScore) {
                            bestScore = score;
                            matchedNode = node;
                        }
                    }
                }
            }

            if (!matchedNode) {
                createAndAppendTable([
                    {
                        ControlName: `coord_${Math.round(clickX)}_${Math.round(clickY)}`,
                        ControlType: "Coordinate",
                        ControlId: [`COORDINATE(${Math.round(clickX)},${Math.round(clickY)})`]
                    }
                ]);
                return;
            }

            // 1. Generate Clean Variable Name & Type normally
                        let controlName = generateProfessionalControlName(matchedNode);
                        let controlType = matchedNode.nodeName.replace("XCUIElementType", "").replace("android.widget.", "");

                        // 2. Fetch XPaths
                        let allXPaths = getAllPossibleXPaths(matchedNode);

                        // NEW: Extract the input value if the element is a text/search field
                        let controlValue = "";
                        if (["XCUIElementTypeTextField", "XCUIElementTypeSecureTextField", "XCUIElementTypeSearchField", "XCUIElementTypeTextView"].includes(matchedNode.nodeName)) {
                            controlValue = matchedNode.getAttribute("value") || "";
                            let label = matchedNode.getAttribute("label") || "";
                            let name = matchedNode.getAttribute("name") || "";
                            let placeholder = matchedNode.getAttribute("placeholderValue") || "";

                            if (controlValue === placeholder || controlValue === label || controlValue === name) {
                                controlValue = "";
                            }
                        }

                        createAndAppendTable([
                            {
                                ControlName: controlName,
                                ControlType: controlType,
                                ControlId: allXPaths,
                                ControlValue: controlValue, // Added this to pass the value
                                Fingerprint: new XMLSerializer().serializeToString(matchedNode)
                            }
                        ]);
                    }

    //Add Rows number
        function updateRowNumbers() {
            const rows = document.querySelectorAll("#myTable tr");
            let visibleIndex = 1; // Start counting from 1 for the filtered view

            rows.forEach((row) => {
                // Only skip the "No Results" search error row
                if (row.classList.contains("no-results-row")) {
                    return;
                }

                // Assign a sequence number to ALL visible rows (Data + Empty Placeholders)
                if (!row.classList.contains("page-hidden") && !row.classList.contains("search-hidden")) {
                    const indexCell = row.querySelector(".row-index");
                    if (indexCell) {
                        indexCell.textContent = visibleIndex++;
                    }
                }
            });
        }

    // Helper to count custom columns added by user
    function getCustomColsCount() {
        var headerRow = document.querySelector('#mainTable thead tr');
        return headerRow ? headerRow.querySelectorAll('.custom-editable-header').length : 0;
    }



    function createEmptyRowHtml() {
            var allHeaders = Array.from(document.querySelectorAll('#mainTable thead tr > *'));
            var rowHtml = "";

            allHeaders.forEach((th) => {
                var thText = (th.textContent || th.innerText || '').replace('Delete Column', '').replace('Add Column', '').trim().toUpperCase();
                var isHidden = window.getComputedStyle(th).display === 'none';
                var displayStyle = isHidden ? 'display: none !important;' : '';

                if (th.classList.contains('excel-header-corner')) {
                    rowHtml += `<td class="row-index" style="${displayStyle}"></td>`;
                } else if (th.id === 'add_empty_column') {
                    rowHtml += `<td class="add-col-cell" style="${displayStyle}">&nbsp;</td>`;
                } else if (th.classList.contains('custom-editable-header')) {
                    rowHtml += `<td contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
                } else if (thText.includes('CONTROL TYPE')) {
                    rowHtml += `<td class="ct pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}">&nbsp;</td>`;
                } else if (thText.includes('CONTROL ID')) {
                    rowHtml += `<td class="xpath pt-3-half" style="border-color: black; text-align: center; ${displayStyle}"></td>`;
                } else if (thText.includes('APP URL') || th.id === 'appUrl') {
                    rowHtml += `<td class="appUrl" style="display:none;"></td>`;
                } else if (th.classList.contains('fingerprint')) {
                    rowHtml += `<td class="fingerprint" style="display:none;"></td>`;
                } else if (thText.includes('DELETE') || th.innerText.includes('Delete') || th.id === 'delete_header') {
                    // Completely empty cell for placeholder rows so no icons or checkboxes ever appear
                    rowHtml += `<td class="delete-cell" style="border-color:black; ${displayStyle}"></td>`;
                } else {
                    rowHtml += `<td class="cn pt-3-half" contenteditable="true" style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px; font-weight: 600; border-color: black; text-align: center; ${displayStyle}"></td>`;
                }
            });
            return rowHtml;
        }

        function adjustEmptyRows() {
            const container = document.getElementById('table-container');
            const tbody = document.getElementById('myTable');

            // Prevent execution if the container is hidden or layout hasn't rendered yet
            if (!container || !tbody || container.style.display === "none" || container.clientHeight === 0) return;

            const headerRow = document.querySelector('#mainTable thead tr');
            const headerHeight = headerRow ? headerRow.clientHeight : 32;
            const rowHeight = 28; // Ensure this exactly matches your CSS tr height

            // Calculate exactly how many rows fit inside the window right now
            const availableHeight = container.clientHeight - headerHeight;
            const targetRowCount = Math.max(5, Math.floor(availableHeight / rowHeight));

            let currentRows = Array.from(tbody.querySelectorAll('tr'));
                let emptyRows = Array.from(tbody.querySelectorAll('tr.empty-excel-row'));

                // Count ONLY the data rows that are currently VISIBLE on the active page
                let dataRowCount = 0;
                currentRows.forEach(row => {
                    if (!row.classList.contains('empty-excel-row') &&
                        !row.classList.contains('no-results-row') &&
                        row.style.display !== 'none') {
                        dataRowCount++;
                    }
                });

                let desiredEmptyRows = targetRowCount - dataRowCount;
                if (desiredEmptyRows < 0) desiredEmptyRows = 0;

            if (emptyRows.length < desiredEmptyRows) {
                // Fill missing space with blank rows
                const rowsToAdd = desiredEmptyRows - emptyRows.length;
                for (let i = 0; i < rowsToAdd; i++) {
                    const row = document.createElement('tr');
                    row.className = "empty-excel-row";
                    row.innerHTML = createEmptyRowHtml();
                    tbody.appendChild(row);
                }
                updateRowNumbers();
                initResizableTable();
            } else if (emptyRows.length > desiredEmptyRows) {
                // Trim excess blank rows if window shrinks
                const rowsToRemove = emptyRows.length - desiredEmptyRows;
                for(let i = 0; i < rowsToRemove; i++) {
                    if(emptyRows[emptyRows.length - 1 - i]) {
                        emptyRows[emptyRows.length - 1 - i].remove();
                    }
                }
                updateRowNumbers();
            }
        }

        function renderDefaultExcelGrid() {
            const tbody = document.getElementById('myTable');
            if (tbody) tbody.innerHTML = ''; // Wipe existing rows

            // Automatically inject the precise number of rows needed
            adjustEmptyRows();
        }

        // Initialize and track window resizing automatically
        window.addEventListener("DOMContentLoaded", () => {
            document.getElementById('table-container').style.display = "block";
            renderDefaultExcelGrid();
            initResizableTable();
            applyPagination();
        });

        window.addEventListener('resize', () => {
            requestAnimationFrame(adjustEmptyRows);
        });

    // Function to delete a custom column by index across headers and body rows
    function deleteCustomColumn(colIndex) {
        var table = document.getElementById('mainTable');
        if (!table) return;

        // Remove the TH header at colIndex
        var headerRow = table.querySelector('thead tr');
        if (headerRow && headerRow.cells[colIndex]) {
            headerRow.cells[colIndex].remove();
        }

        // Remove matching TD in all body rows
        var bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
            if (row.cells[colIndex]) {
                row.cells[colIndex].remove();
            }
        });
    }









// --- COLUMN HIDING / UNHIDING STATE MANAGEMENT ---
let hiddenColumns = [];

function updateEyeButtonState() {
    const eyeBtn = document.getElementById("unhide_col_btn");
    const unhideMenu = document.getElementById("unhide_col_menu");

    if (!eyeBtn || !unhideMenu) return;

    if (hiddenColumns.length > 0) {
        eyeBtn.disabled = false;
        eyeBtn.classList.add("active");

        unhideMenu.innerHTML = "";
        hiddenColumns.forEach((col, arrIdx) => {
            const item = document.createElement("div");
            item.className = "unhide-item";
            item.innerText = `Unhide: ${col.name}`;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                unhideColumn(arrIdx);
            });
            unhideMenu.appendChild(item);
        });
    } else {
        eyeBtn.disabled = true;
        eyeBtn.classList.remove("active");
        unhideMenu.classList.remove("show");
        unhideMenu.innerHTML = "";
    }
}

//function hideColumn(colIndex) {
//    const table = document.getElementById("mainTable");
//    if (!table) return;
//
//    const headerRow = table.querySelector("thead tr");
//    if (!headerRow || !headerRow.cells[colIndex]) return;
//
//    const th = headerRow.cells[colIndex];
//    let colName = th.querySelector("span")?.innerText.trim() || th.innerText.trim();
//    colName = colName.replace("Delete Column", "").replace("Add Column", "").trim();
//
//    if (!colName || colName === "") {
//        if (th.classList.contains("excel-header-corner")) {
//            colName = "# (Index)";
//        } else if (th.id === "add_empty_column") {
//            colName = "+ (Add Column)";
//        } else {
//            colName = "Column " + (colIndex + 1);
//        }
//    }
//
//    th.style.setProperty("display", "none", "important");
//    const bodyRows = table.querySelectorAll("tbody tr");
//    bodyRows.forEach(row => {
//        if (row.cells[colIndex]) {
//            row.cells[colIndex].style.setProperty("display", "none", "important");
//        }
//    });
//
//    hiddenColumns.push({ index: colIndex, name: colName });
//    updateEyeButtonState();
//}
//
//function unhideColumn(arrayIndex) {
//    const colInfo = hiddenColumns[arrayIndex];
//    if (!colInfo) return;
//
//    const table = document.getElementById("mainTable");
//    if (!table) return;
//
//    const headerRow = table.querySelector("thead tr");
//    if (headerRow && headerRow.cells[colInfo.index]) {
//        headerRow.cells[colInfo.index].style.display = "";
//    }
//
//    const bodyRows = table.querySelectorAll("tbody tr");
//    bodyRows.forEach(row => {
//        if (row.cells[colInfo.index]) {
//            row.cells[colInfo.index].style.display = "";
//        }
//    });
//
//    hiddenColumns.splice(arrayIndex, 1);
//    updateEyeButtonState();
//}

// --- ROW HIDING / UNHIDING STATE MANAGEMENT ---
let hiddenRows = []; // Stores the physical row elements

function updateRowEyeButtonState() {
    const eyeBtn = document.getElementById("unhide_row_btn");
    const unhideMenu = document.getElementById("unhide_row_menu");

    if (!eyeBtn || !unhideMenu) return;

    if (hiddenRows.length > 0) {
        eyeBtn.disabled = false;
        eyeBtn.classList.add("active");

        unhideMenu.innerHTML = "";
        hiddenRows.forEach((rowObj, arrIdx) => {
            const item = document.createElement("div");
            item.className = "unhide-item";
            item.innerText = `Unhide: ${rowObj.label}`;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                unhideRow(arrIdx);
            });
            unhideMenu.appendChild(item);
        });
    } else {
        eyeBtn.disabled = true;
        eyeBtn.classList.remove("active");
        unhideMenu.classList.remove("show");
        unhideMenu.innerHTML = "";
    }
}

//function hideRow(rowIndexElem, trElement) {
//    let rowNum = rowIndexElem.innerText.trim();
//    let controlNameInput = trElement.querySelector('.cn');
//    let label = (controlNameInput && controlNameInput.innerText.trim() !== "")
//        ? `Row ${rowNum} (${controlNameInput.innerText.trim()})`
//        : `Row ${rowNum}`;
//
//    trElement.style.setProperty("display", "none", "important");
//    hiddenRows.push({ rowElement: trElement, label: label });
//    updateRowEyeButtonState();
//}
//
//function unhideRow(arrayIndex) {
//    const rowObj = hiddenRows[arrayIndex];
//    if (!rowObj || !rowObj.rowElement) return;
//
//    rowObj.rowElement.style.display = "";
//    hiddenRows.splice(arrayIndex, 1);
//    updateRowEyeButtonState();
//}

// --- RIGHT-CLICK CONTEXT MENU EVENT LISTENERS ---
//let selectedColIndexToHide = null;
//let selectedRowToHide = null;
//
//document.addEventListener("DOMContentLoaded", () => {
//    const mainTable = document.getElementById("mainTable");
//
//    // Column Menu Variables
//    const colContextMenu = document.getElementById("colContextMenu");
//    const hideColOption = document.getElementById("hideColOption");
//    const colEyeBtn = document.getElementById("unhide_col_btn");
//    const unhideColMenu = document.getElementById("unhide_col_menu");
//
//    // Row Menu Variables
//    const rowContextMenu = document.getElementById("rowContextMenu");
//    const hideRowOption = document.getElementById("hideRowOption");
//    const rowEyeBtn = document.getElementById("unhide_row_btn");
//    const unhideRowMenu = document.getElementById("unhide_row_menu");
//
//    if (mainTable) {
//        // Right-Click Context Menu on HEADERS (Columns)
//        mainTable.querySelector("thead").addEventListener("contextmenu", (e) => {
//            const th = e.target.closest("th");
//            if (!th) return;
//
//            e.preventDefault();
//            selectedColIndexToHide = th.cellIndex;
//
//            if (colContextMenu) {
//                const menuWidth = 140;
//                const posX = (e.clientX + menuWidth > window.innerWidth) ? e.clientX - menuWidth : e.clientX;
//                colContextMenu.style.left = `${posX}px`;
//                colContextMenu.style.top = `${e.clientY}px`;
//                colContextMenu.style.display = "block";
//                if (rowContextMenu) rowContextMenu.style.display = "none";
//            }
//        });
//
//        // Right-Click Context Menu on ROW INDEX (Rows)
//        mainTable.querySelector("tbody").addEventListener("contextmenu", (e) => {
//            const td = e.target.closest("td.row-index");
//            if (!td) return; // Only trigger if right-clicking the grey '#' index column
//
//            e.preventDefault();
//            const tr = td.closest("tr");
//            selectedRowToHide = { td: td, tr: tr };
//
//            if (rowContextMenu) {
//                const menuWidth = 140;
//                const posX = (e.clientX + menuWidth > window.innerWidth) ? e.clientX - menuWidth : e.clientX;
//                rowContextMenu.style.left = `${posX}px`;
//                rowContextMenu.style.top = `${e.clientY}px`;
//                rowContextMenu.style.display = "block";
//                if (colContextMenu) colContextMenu.style.display = "none";
//            }
//        });
//    }
//
//    // Hide Column Action
//    if (hideColOption) {
//        hideColOption.addEventListener("click", () => {
//            if (selectedColIndexToHide !== null) {
//                hideColumn(selectedColIndexToHide);
//                selectedColIndexToHide = null;
//            }
//            if (colContextMenu) colContextMenu.style.display = "none";
//        });
//    }
//
//    // Hide Row Action
//    if (hideRowOption) {
//        hideRowOption.addEventListener("click", () => {
//            if (selectedRowToHide !== null) {
//                hideRow(selectedRowToHide.td, selectedRowToHide.tr);
//                selectedRowToHide = null;
//            }
//            if (rowContextMenu) rowContextMenu.style.display = "none";
//        });
//    }
//
//    // Toggle Column Eye Dropdown
//    if (colEyeBtn && unhideColMenu) {
//        colEyeBtn.addEventListener("click", (e) => {
//            e.stopPropagation();
//            if (unhideRowMenu) unhideRowMenu.classList.remove("show"); // Close row menu
//            if (hiddenColumns.length > 0) {
//                unhideColMenu.classList.toggle("show");
//            }
//        });
//    }
//
//    // Toggle Row Eye Dropdown
//    if (rowEyeBtn && unhideRowMenu) {
//        rowEyeBtn.addEventListener("click", (e) => {
//            e.stopPropagation();
//            if (unhideColMenu) unhideColMenu.classList.remove("show"); // Close col menu
//            if (hiddenRows.length > 0) {
//                unhideRowMenu.classList.toggle("show");
//            }
//        });
//    }
//
//    // Dismiss Menus on Outside Click
//    document.addEventListener("click", (e) => {
//        if (colContextMenu) colContextMenu.style.display = "none";
//        if (rowContextMenu) rowContextMenu.style.display = "none";
//
//        if (unhideColMenu && !unhideColMenu.contains(e.target) && e.target !== colEyeBtn) {
//            unhideColMenu.classList.remove("show");
//        }
//        if (unhideRowMenu && !unhideRowMenu.contains(e.target) && e.target !== rowEyeBtn) {
//            unhideRowMenu.classList.remove("show");
//        }
//    });
//});

// 3. Warning Prompt Helper
    function showHiddenColumnsWarning() {
            const popup = document.getElementById('confirmationPopup');
            if (!popup) return;

            // ADD THESE TWO LINES:
            document.getElementById('back_btn').style.display = 'inline-block';
            document.getElementById('okay_btn').innerText = 'Confirm';

            document.getElementById('popup_title').innerText = "Export Warning";
            document.getElementById('popup_main_text').innerText = "Warning: Rows or Columns are hidden!";
            document.getElementById('popup_sub_text').innerText = "Hidden data will not be included in your export.";

            document.getElementById('overlay').style.display = 'block';
            popup.style.display = 'block';
        }

    // 4. Clean Unified "Okay" Button Handler
    const okayBtn = document.getElementById("okay_btn");
    const newOkayBtn = okayBtn.cloneNode(true);
    okayBtn.parentNode.replaceChild(newOkayBtn, okayBtn);




   //popup okay button
   newOkayBtn.addEventListener('click', async () => {
           document.getElementById('confirmationPopup').style.display = 'none';
           document.getElementById('overlay').style.display = 'none';

           // Reset popup text and buttons back to default generic state
           setTimeout(() => {
               const popup = document.getElementById('confirmationPopup');
               if (popup) {
                   document.getElementById('popup_title').innerText = "Confirm Action";
                   document.getElementById('popup_main_text').innerText = "";
                   document.getElementById('popup_sub_text').innerText = "";

                   // Restore buttons for next time
                   document.getElementById('back_btn').style.display = 'inline-block';
                   document.getElementById('okay_btn').innerText = 'Confirm';
               }
           }, 200);

           if (pendingExportAction === "alertOnly") {
               pendingExportAction = null;

               // YAHAN HATEGA LOADER USER KE OKAY CLICK PAR
               const targetLoader = document.getElementById("localTouchLoader");
               if (targetLoader) targetLoader.style.display = "none";
               touchInProgress = false;

               return;
           } else if (pendingExportAction === "download") {
               pendingExportAction = null;
               downloadTableAsJSON('myTable');

           } else if (pendingExportAction === "algoQA") {
               pendingExportAction = null;
               await sendTableDataToAPI("myTable");

           } else if (pendingExportAction === "deleteRow") {
               pendingExportAction = null;

               // Row deletion no longer automatically deletes the page name or switches views
               if (rowToDelete) {
                   rowToDelete.remove();
                   rowToDelete = null;

                   updateRowNumbers();
                   applyPagination();

                   const tbody = document.getElementById('myTable');
                   if (tbody && tbody.querySelectorAll('tr').length < 5) adjustEmptyRows();
               }

           // --- MULTI-DELETE LOGIC ---
           } else if (pendingExportAction === "bulkDelete") {
               pendingExportAction = null;

               // Bulk deletion no longer automatically deletes the page name or switches views
               if (window.pendingBulkDeleteRows && window.pendingBulkDeleteRows.length > 0) {
                   window.pendingBulkDeleteRows.forEach(row => row.remove());
                   window.pendingBulkDeleteRows = null;

                   const headerCheckbox = document.getElementById('selectAllCheckbox');
                   if (headerCheckbox) headerCheckbox.checked = false;

                   updateRowNumbers();
                   applyPagination();

                   const tbody = document.getElementById('myTable');
                   if (tbody && tbody.querySelectorAll('tr').length < 5) adjustEmptyRows();

                   const toggleMultiDeleteOpt = document.getElementById('toggleMultiDeleteOpt');
                   if (toggleMultiDeleteOpt && isMultiDeleteMode) {
                       toggleMultiDeleteOpt.click();
                   }
               }

           // --- EXPLICIT PAGE DELETE LOGIC ---
                      } else if (pendingExportAction === "deletePage") {
                          pendingExportAction = null;
                          const page = window.pageToDelete;

                          if (page) {
                              // 1. Remove the page from the global memory bank
                              if (window.registeredPageNames) {
                                  window.registeredPageNames.delete(page);
                              }

                              // NEW: Ensure Scenario Outline & Name are wiped from memory completely
                              if (window.pageScenarioData) {
                                  delete window.pageScenarioData[page];
                              }

                              // 2. Remove all rows associated with this specific page
                              const tableBody = document.getElementById('myTable');
                              if (tableBody) {
                                  const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));
                                  allDataRows.forEach(row => {
                                      const pageCell = row.querySelector('.page');
                                      if (pageCell && pageCell.innerText.trim() === page) {
                                          row.remove();
                                      }
                                  });

                                  updateRowNumbers();
                                  applyPagination();
                                  if (typeof adjustEmptyRows === 'function') requestAnimationFrame(adjustEmptyRows);
                              }

                              // 3. If the user just deleted the active page they were currently viewing, switch back to 'All'
                              const pageNameInput = document.getElementById('pagename_searchbox');
                              if (pageNameInput && pageNameInput.value.trim() === page) {
                                  if (window.setGlobalPageName) window.setGlobalPageName("All");

                                  pageNameInput.readOnly = true;
                                  pageNameInput.style.cursor = 'default';

                                  const editPenIcon = document.querySelector('.edit-icon');
                                  if (editPenIcon) editPenIcon.style.display = 'none'; // Cannot rename 'All'
                              }
                              window.pageToDelete = null;
                          }

           // --- GENERAL RESET LOGIC ---
           } else {
               await executeResetAction();
           }
       });




    const backBtn = document.getElementById("back_btn");
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);

    newBackBtn.addEventListener('click', () => {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('confirmationPopup').style.display = 'none';
        pendingExportAction = null;

        const popup = document.getElementById('confirmationPopup');
        if (popup) {
            popup.querySelector('p:nth-of-type(1)').textContent = "Do you really want to reset?";
            popup.querySelector('p:nth-of-type(2)').textContent = "You will not be able to recover the data!";
        }
    });

    // Encapsulated Reset Function
    function executeResetAction() {
            try {


                // 1. Safely hide status bars and errors
                const statusBar = document.getElementById('sttus_bar_div');
                if (statusBar) statusBar.style.display = 'none';

                const brokenText = document.getElementById('brokenText');
                if (brokenText) brokenText.style.display = 'none';

                // 2. Clear application state variables
                counter = 0;
                initialData = [];
                xpath_id = 0;
                screenNameList = [];
                showElement = false;

                // 3. Clear existing screenshots
                const imgElement = document.getElementById('screenshot');
                if (imgElement) imgElement.remove();

                // 4. Restore the original SVG icon layout for the dummy device
                const dummy = document.getElementById("dummyDevice");
                if (dummy) {
                    dummy.style.display = "block";
                    dummy.innerHTML = `
                        <div class="phone-welcome-overlay">
                            <svg id="dummyIcon" class="info-svg" viewBox="0 0 24 24" fill="#4285F4" xmlns="http://www.w3.org/2000/svg" style="width: 45px; height: 45px; margin-bottom: 15px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                            <p id="dummyMainText" style="color: #333; padding: 0 10px;">Data cleared. Click the Refresh button (↻) in the toolbar to fetch the current device screen.</p>
                            <p id="dummyErrorText" style="display: none; color: #d9534f; font-size: 11px; margin-top: 12px; line-height: 1.4; padding: 0 10px; font-weight: 600; word-break: break-word;"></p>
                        </div>
                    `;
                }

                imgTagFlag = false;
                const ssElement = document.getElementById('ss');
                if (ssElement) ssElement.remove();
                ssflag = false;

                const splitDiv3 = document.getElementById("split-div3");
                if (splitDiv3) splitDiv3.style.display = "none";

                const previewContainer = document.getElementById("image-container_ss");
                if (previewContainer) previewContainer.innerHTML = "";

               // 5. Wipe out the table rows
                               var table = document.getElementById('myTable');
                               if (table) {
                                   var rowCount = table.rows.length;
                                   for (var i = rowCount - 1; i >= 0; i--) {
                                       table.deleteRow(i);
                                   }
                               }

                               renderDefaultExcelGrid(5);

                               const tableContainer = document.getElementById('table-container');
                               if (tableContainer) tableContainer.style.display = "block"; // <--- FIXED: Keeps auto-rows running
                               tableCreated = false;

                               // Hide Scenario Outline
                               const scenarioOutlineBar = document.getElementById("scenarioOutlineBar");
                               const scenarioOutlineText = document.getElementById("scenarioOutlineText");

                               if (scenarioOutlineBar) {
                                   scenarioOutlineBar.style.display = "none";
                               }

                               if (scenarioOutlineText) {
                                   scenarioOutlineText.value = "";
                               }

                // 6. HELPER: Safely delete old screenshots without crashing the app
                function safelyDeletePngs(dirPath) {
                    if (!dirPath || !fs.existsSync(dirPath)) return;
                    fs.readdir(dirPath, (err, files) => {
                        if (err) return;
                        files.forEach(file => {
                            const filePath = path.join(dirPath, file);
                            if (path.extname(filePath) === '.png') {
                                fs.unlink(filePath, e => {});
                            }
                        });
                    });
                }

                var plateformName = document.getElementById('platformname');
                if (plateformName && plateformName.options.length > 0) {
                    var plateformOption = plateformName.options[plateformName.selectedIndex].text;
                        safelyDeletePngs(folderPath);
                }

                // 7. Reset Input Fields
                const pageNameSearch = document.getElementById('pagename_searchbox');
                if (pageNameSearch) pageNameSearch.value = '';

                const searchBox = document.getElementById('searchbox');
                if (searchBox) searchBox.value = '';

                // 8. Restore Button States Perfectly

                // STAY DISABLED: "Launch Application" stays locked because session is already active
                const runBtn = document.getElementById('Run');
                if (runBtn) {
                    runBtn.disabled = true;
                    runBtn.style.backgroundColor = '#B6B6B4';
                }

                // --- RESET SCENARIO BUTTONS STATE ON RESET ---
                                const recordScenarioBtn = document.getElementById('recordScenarioBtn');
                                const addScenarioBtn = document.getElementById('addScenarioBtn');
                                if (recordScenarioBtn && addScenarioBtn) {
                                    // Force Record Scenario to show, Add Scenario to hide
                                    recordScenarioBtn.style.setProperty("display", "inline-flex", "important");
                                    addScenarioBtn.style.setProperty("display", "none", "important");




                                    // Disable and grey out Record Scenario until "Launch Application" is clicked again
                                    recordScenarioBtn.disabled = true;
                                    recordScenarioBtn.style.backgroundColor = '#B6B6B4';
                                }
                                // ---------------------------------------------

                // DISABLE bottom export/utility tools
                const actionButtons = ['Scrape', 'scrapeUI', 'reset', 'download', 'algoQA', 'recordScenarioBtn'];
                actionButtons.forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) {
                        btn.disabled = true;
                        btn.style.backgroundColor = '#B6B6B4';
                    }
                });

                // ENABLE main "Scrape" button so the user can immediately resume capturing
                const scrapeBtn = document.getElementById('Scrape');
                if (scrapeBtn) {
                    scrapeBtn.disabled = false;
                    scrapeBtn.style.backgroundColor = '#4285F4';
                }

                // Make sure token session and Change button remain visually intact
                const tokenInput = document.getElementById("tokenInput");
                if (tokenInput && localStorage.getItem("algoQAUser")) {
                    const changeTokenBtn = document.getElementById("changeTokenBtn");
                    if (changeTokenBtn) changeTokenBtn.style.setProperty("display", "inline-block", "important");
                }

                // 9. Reset Pagination State
                            currentPage = 1;
                            const rppSelect = document.getElementById('rows_per_page');
                            if (rppSelect) {
                                rppSelect.value = '25'; // Resets the dropdown back to default 25
                            }
                            if (typeof applyPagination === 'function') {

                                currentPage = 1; // Reset to page 1 on resize
                                            applyPagination();

                            }

            } catch (err) {
                // Log any unexpected errors instead of completely freezing the UI
                console.error("Reset encountered an error, but was caught safely:", err);
            }
        }




// Get Professional control name
function generateProfessionalControlName(node) {
    if (!node) return "unknown_control";

    // 1. Get exact text or ID
    let rawName = node.getAttribute("label") ||
                  node.getAttribute("text") ||
                  node.getAttribute("value") ||
                  node.getAttribute("content-desc") ||
                  "";

    if (!rawName.trim()) {
        let resId = node.getAttribute("resource-id");
        if (resId && resId.includes('/')) {
            rawName = resId.split('/')[1];
        }
    }

    rawName = rawName.trim();

    // 2. Identify UI Type for Prefix (COMMENTED OUT)
    /*
    let prefix = "elm_";
    const tag = node.nodeName.toLowerCase();

    if (tag.includes("button")) prefix = "btn_";
    else if (tag.includes("textfield") || tag.includes("edittext") || tag.includes("searchfield") || tag.includes("input")) prefix = "txt_";
    else if (tag.includes("image") || tag.includes("icon")) prefix = "img_";
    else if (tag.includes("statictext") || tag.includes("textview") || tag.includes("label")) prefix = "lbl_";
    else if (tag.includes("checkbox") || tag.includes("toggle") || tag.includes("switch") || tag.includes("radio")) prefix = "chk_";
    else if (tag.includes("cell")) prefix = "cell_";
    */

    // 3. Fallback if no readable text
    if (!rawName) {
        let cleanTag = node.nodeName.replace("XCUIElementType", "").replace("android.widget.", "").replace("android.view.", "");

        // return `${prefix}${cleanTag}`; // COMMENTED OUT
        return cleanTag;
    }

    // 4. Smart Sanitize and Format
    // Remove special characters but keep spaces to detect word boundaries
    let cleanText = rawName.replace(/[^a-zA-Z0-9 ]/g, "").trim();

    // Split the text into an array of words
    let words = cleanText.split(/\s+/).filter(w => w.length > 0);

    // Keep only the first 3 meaningful words so the name doesn't get infinitely long
    let selectedWords = words.slice(0, 3);

    // Join the words with underscores
    let cleanName = selectedWords.join("_");

    // Failsafe: If someone has an incredibly long single word without spaces, cap it safely
    if (cleanName.length > 40) {
        cleanName = cleanName.substring(0, 40).replace(/_+$/, ""); // Cap and remove trailing underscores if any
    }

    // Prevent starting with a number
    if (/^\d/.test(cleanName)) {
        cleanName = "num_" + cleanName;
    }

    // return `${prefix}${cleanName}`; // COMMENTED OUT
    return cleanName;
}


function displayScreenshotError(err) {
    // Safely extract just the first line of the error message
    let readableError = "An unknown error occurred while communicating with the device.";
    if (err && err.message) {
        readableError = err.message.split('\n')[0].substring(0, 150);
    } else if (typeof err === 'string') {
        readableError = err.substring(0, 150);
    }

    // Target the UI elements
    const dummy = document.getElementById("dummyDevice");
    const dummyIcon = document.getElementById("dummyIcon");
    const dummyMainText = document.getElementById("dummyMainText");
    const dummyErrorText = document.getElementById("dummyErrorText");
    const screenshotImg = document.getElementById("screenshot");

    // Hide the main screenshot if it exists, show the placeholder
    if (screenshotImg) screenshotImg.style.display = "none";

    if (dummy && dummyIcon && dummyMainText && dummyErrorText) {
        dummy.style.display = "block";

        // Change to Error State (Red)
        dummyIcon.setAttribute("fill", "#d9534f");

        // Professional restart message with clean styling
        dummyMainText.style.color = "#d9534f";
        dummyMainText.style.fontWeight = "600";
        dummyMainText.style.fontSize = "13px";
        dummyMainText.style.lineHeight = "1.4";
        dummyMainText.innerHTML = "App session interrupted.<br>Please ensure the app is active, then click 'Launch Application' to reconnect.";

        // Show the actual parsed error below it (subtle and smaller)
        dummyErrorText.style.display = "block";
        dummyErrorText.style.fontSize = "10px";
        dummyErrorText.style.opacity = "0.8";
        dummyErrorText.textContent = `*Error: ${readableError}`;
    }

    // --- BUTTON LOGIC ---
    // 1. Enable Launch Application
    const runBtn = document.getElementById('Run');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.style.backgroundColor = '#4285F4';
    }

    // 2. Disable ScrapeUI, Reset, and other tools
    const actionButtons = ['Scrape', 'scrapeUI', 'reset', 'download', 'algoQA', 'recordScenarioBtn'];
    actionButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.style.backgroundColor = '#B6B6B4';
        }
    });

    // Clear driver instance
    driver = null;

    // Force hide any stuck loading spinners globally
    document.getElementById('overlay').style.display = 'none';
    const targetLoader = document.getElementById("localTouchLoader");
    if (targetLoader) targetLoader.style.display = "none";
    const divStatusBar = document.getElementById("div_status_bar");
    if (divStatusBar) divStatusBar.style.display = "none";
}

//Draw line after hover
function drawCoordinateHoverMarker(x, y) {
        clearOverlay();
        const overlay = document.getElementById("overlayContainer");
        const img = document.getElementById("screenshot");
        if (!overlay || !img || !window.xmlDoc) return;

        const app = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
        if (!app) return;

        const appWidth = parseFloat(app.getAttribute("width"));
        const appHeight = parseFloat(app.getAttribute("height"));

        const imgRect = img.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();

        const scaleX = imgRect.width / appWidth;
        const scaleY = imgRect.height / appHeight;

        // Calculate absolute position scaled to screen
        const left = imgRect.left - overlayRect.left + (x * scaleX);
        const top = imgRect.top - overlayRect.top + (y * scaleY);

        const box = document.createElement("div");
        box.style.position = "absolute";

        // Create a 20x20 dashed box centered perfectly on the coordinate point
        box.style.left = (left - 10) + "px";
        box.style.top = (top - 10) + "px";
        box.style.width = "20px";
        box.style.height = "20px";
        box.style.border = "2px dashed blue";
        box.style.boxSizing = "border-box";
        box.style.pointerEvents = "none";
        box.style.zIndex = "9999";

        overlay.appendChild(box);
    }


// Draw Arrow after hover for SWIPE actions
function drawSwipeHoverMarker(startX, startY, endX, endY) {
    clearOverlay();
    const overlay = document.getElementById("overlayContainer");
    const img = document.getElementById("screenshot");
    if (!overlay || !img || !window.xmlDoc) return;

    const app = window.xmlDoc.getElementsByTagName("XCUIElementTypeApplication")[0];
    if (!app) return;

    const appWidth = parseFloat(app.getAttribute("width"));
    const appHeight = parseFloat(app.getAttribute("height"));

    const imgRect = img.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const scaleX = imgRect.width / appWidth;
    const scaleY = imgRect.height / appHeight;

    // Calculate absolute positions scaled to screen
    const leftOffset = imgRect.left - overlayRect.left;
    const topOffset = imgRect.top - overlayRect.top;

    const sx = leftOffset + (startX * scaleX);
    const sy = topOffset + (startY * scaleY);
    const ex = leftOffset + (endX * scaleX);
    const ey = topOffset + (endY * scaleY);

    // Create SVG Canvas
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.position = "absolute";
    svg.style.left = "0px";
    svg.style.top = "0px";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "9999";

    // Create arrowhead marker (Updated to Blue)
    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");

    const polygon = document.createElementNS(svgNS, "polygon");
    polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
    polygon.setAttribute("fill", "blue"); // Changed from red to blue

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Create connecting line (dashed arrow)
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", sx);
    line.setAttribute("y1", sy);
    line.setAttribute("x2", ex);
    line.setAttribute("y2", ey);
    line.setAttribute("stroke", "blue"); // Changed from red to blue
    line.setAttribute("stroke-width", "2"); // Made the line thinner
    line.setAttribute("stroke-dasharray", "5,5"); // Dashed look
    line.setAttribute("marker-end", "url(#arrowhead)");

    // Create start dot
    const startDot = document.createElementNS(svgNS, "circle");
    startDot.setAttribute("cx", sx);
    startDot.setAttribute("cy", sy);
    startDot.setAttribute("r", "4"); // Reduced dot size slightly to match thinner line
    startDot.setAttribute("fill", "blue");

    svg.appendChild(line);
    svg.appendChild(startDot);

    overlay.appendChild(svg);
}


// --- PAGINATION LOGIC ---
let currentPage = 1;
let rowsPerPage = 25;

function applyPagination() {
    const tableBody = document.getElementById('myTable');
    if (!tableBody) return;

    // Get all real data rows (exclude empty placeholder rows & error rows)
    const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));

    // Filter out rows hidden by the search feature AND the new page name filter
    const activeRows = allDataRows.filter(row => !row.classList.contains('search-hidden') && !row.classList.contains('page-hidden'));
    const totalRows = activeRows.length;

    const rppSelect = document.getElementById('rows_per_page');
    const rppValue = rppSelect ? rppSelect.value : '25';

    rowsPerPage = rppValue === 'all' ? totalRows : parseInt(rppValue, 10);
    if (isNaN(rowsPerPage) || rowsPerPage <= 0) rowsPerPage = totalRows || 1;

    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    // Apply the display hiding/showing
    allDataRows.forEach(row => {
        if (row.classList.contains('search-hidden') || row.classList.contains('page-hidden')) {
            row.style.display = 'none'; // Keep hidden by search or page filter
        } else {
            const activeIndex = activeRows.indexOf(row);
            // Show if it falls within current page chunk, otherwise hide
            if (activeIndex >= startIndex && activeIndex < endIndex) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });

    renderPaginationControls(totalPages);

    // Crucial: Fire your existing empty row recalculator to fill screen gaps
    if (typeof adjustEmptyRows === 'function') requestAnimationFrame(adjustEmptyRows);
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('pagination_pages');
    if (!container) return;
    container.innerHTML = '';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '❮';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; applyPagination(); } };
    container.appendChild(prevBtn);

    // Page Numbers Layout
    let pages = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            const dot = document.createElement('span');
            dot.className = 'page-dots';
            dot.innerText = '...';
            container.appendChild(dot);
        } else {
            const btn = document.createElement('button');
            btn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
            btn.innerText = p;
            btn.onclick = () => { currentPage = p; applyPagination(); };
            container.appendChild(btn);
        }
    });

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '❯';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; applyPagination(); } };
    container.appendChild(nextBtn);
}


// HELPER: Flashes the Page Name badge red for 2 seconds
function flashPageNameError() {
    const badgeWrapper = document.querySelector('.screen-name-badge');
    const badgeLabel = document.querySelector('.badge-label');
    const pageNameInput = document.getElementById('pagename_searchbox');

    if (badgeWrapper && badgeLabel) {
        // 1. Change border and label to Error Red
        badgeWrapper.style.transition = 'all 0.3s ease';
        badgeLabel.style.transition = 'all 0.3s ease';

        badgeWrapper.style.borderColor = '#d9534f';
        badgeLabel.style.backgroundColor = '#d9534f';

        if (pageNameInput) pageNameInput.focus(); // Bring cursor back

        // 2. Revert back to original Blue after 2 seconds
        setTimeout(() => {
            badgeWrapper.style.borderColor = '#4285F4';
            badgeLabel.style.backgroundColor = '#4285F4';
        }, 2000);
    }
}

//Page Name lock/unlock logic drop down of page
function initPageNameLogic() {
    const pageNameInput = document.getElementById('pagename_searchbox');
    const addPageIcon = document.querySelector('.add-page-icon');
    const editPenIcon = document.querySelector('.edit-icon');
    const confirmIcon = document.querySelector('.confirm-edit-icon');
    const cancelIcon = document.querySelector('.cancel-edit-icon');
    const errorIconWrapper = document.querySelector('.error-icon-wrapper');
    const dropdownIcon = document.querySelector('.dropdown-icon');
    const dropdownMenu = document.getElementById('pageNameDropdown');
    const badgeWrapper = document.querySelector('.screen-name-badge');
    const badgeLabel = document.querySelector('.badge-label');
    const resetButton = document.getElementById('reset');

    let previousPageName = "";
    let isEditMode = false;
    let isRenameMode = false;
    let renameTarget = "";
    let lastConfirmedPageName = pageNameInput ? pageNameInput.value.trim() : "";

    if (!pageNameInput) return;

    function isValidPageName(name) {
        return isGlobalPageNameValid(name);
    }

    function restoreValidBlueState() {
        badgeWrapper.style.borderColor = '#4285F4';
        badgeLabel.style.backgroundColor = '#4285F4';
        if (errorIconWrapper) errorIconWrapper.style.display = 'none';

        if (!isEditMode && dropdownIcon) {
            dropdownIcon.style.display = 'inline-block';
        }
    }

    function applyPageNameFilter(pageName) {
        const tableBody = document.getElementById('myTable');
        if (!tableBody) return;
        const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));

        allDataRows.forEach(row => {
            const pageCell = row.querySelector('.page');
            if (pageCell) {
                const cellText = pageCell.innerText.trim();
                if (pageName === "" || pageName === "All" || cellText === pageName) {
                    row.classList.remove('page-hidden');
                } else {
                    row.classList.add('page-hidden');
                }
            }
        });

        currentPage = 1;
        applyPagination();
        updateRowNumbers();
    }

    window.setGlobalPageName = function(name) {
        if (!window.registeredPageNames) window.registeredPageNames = new Set();
        if (name && name !== "All" && isValidPageName(name)) {
            window.registeredPageNames.add(name);
        }
        pageNameInput.value = name;
        lastConfirmedPageName = name;
        applyPageNameFilter(name);

        const scenarioOutlineBar = document.getElementById("scenarioOutlineBar");
        const scenarioOutlineText = document.getElementById("scenarioOutlineText");
        const addScenarioBtn = document.getElementById("addScenarioBtn");
        const recordScenarioBtn = document.getElementById("recordScenarioBtn");
        const soEditIcon = document.getElementById("so_edit_icon");
        const pageEditIcon = document.querySelector(".edit-icon");

        if (name === "All") {
            if (pageEditIcon) pageEditIcon.style.display = 'none';
            if (pageNameInput) {
                pageNameInput.readOnly = true;
                pageNameInput.style.cursor = 'default';
            }

            if (scenarioOutlineBar && scenarioOutlineText) {
                scenarioOutlineBar.style.display = "inline-flex";
                scenarioOutlineText.value = "All";
                scenarioOutlineText.readOnly = true;
                scenarioOutlineText.style.cursor = 'default';

                if (recordScenarioBtn) recordScenarioBtn.style.setProperty("display", "inline-flex", "important");
                if (addScenarioBtn) addScenarioBtn.style.setProperty("display", "none", "important");
                if (soEditIcon) soEditIcon.style.display = 'none';
            }
        } else {
            if (pageEditIcon) pageEditIcon.style.display = 'inline-block';

            if (scenarioOutlineBar && scenarioOutlineText) {
                if (window.pageScenarioData && window.pageScenarioData[name] && window.pageScenarioData[name].scenarioOutline) {
                    scenarioOutlineText.value = window.pageScenarioData[name].scenarioOutline;
                    scenarioOutlineBar.style.display = "inline-flex";

                    if (recordScenarioBtn) recordScenarioBtn.style.setProperty("display", "none", "important");
                    if (addScenarioBtn) addScenarioBtn.style.setProperty("display", "inline-flex", "important");
                    if (soEditIcon) soEditIcon.style.display = 'inline-block';
                } else {
                    scenarioOutlineBar.style.display = "inline-flex";
                    scenarioOutlineText.value = "";

                    if (recordScenarioBtn) recordScenarioBtn.style.setProperty("display", "inline-flex", "important");
                    if (addScenarioBtn) addScenarioBtn.style.setProperty("display", "none", "important");
                    if (soEditIcon) soEditIcon.style.display = 'inline-block';
                }
            }
        }
    };

    // --- MODERN DROPDOWN HOVER LOGIC ---
        if (dropdownIcon && dropdownMenu) {
            let pageDropdownTimer; // Timer to hold the delay

            // 1. Show on Hover (Icon)
            dropdownIcon.addEventListener('mouseenter', function(e) {
                clearTimeout(pageDropdownTimer); // Stop it from closing if returning
                if (isEditMode) return;

                if (!window.registeredPageNames) window.registeredPageNames = new Set();
                const currentActivePage = pageNameInput.value.trim();
                if (currentActivePage && isValidPageName(currentActivePage) && currentActivePage !== "All") {
                    window.registeredPageNames.add(currentActivePage);
                }

                const uniquePages = new Set(window.registeredPageNames);
                const tableBody = document.getElementById('myTable');
                if (tableBody) {
                    const pageCells = tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row) .page');
                    pageCells.forEach(cell => {
                        const val = cell.innerText.trim();
                        if(val) uniquePages.add(val);
                    });
                }

                if (uniquePages.size === 0) {
                    dropdownMenu.style.display = 'none';
                    return;
                }

                dropdownMenu.innerHTML = '';

                // Render "All"
                if (uniquePages.size > 1) {
                    const allItem = document.createElement('div');
                    allItem.innerText = "All";
                    allItem.style.padding = '8px 12px';
                    allItem.style.margin = '2px 4px';
                    allItem.style.borderRadius = '6px';
                    allItem.style.cursor = 'pointer';
                    allItem.style.fontSize = '12px';
                    allItem.style.textAlign = 'left';
                    allItem.style.transition = 'background-color 0.2s ease';

                    if (currentActivePage === "All" || currentActivePage === "") {
                        allItem.style.color = '#4285F4';
                        allItem.style.fontWeight = '700';
                        allItem.style.backgroundColor = '#eef6fd';
                    } else {
                        allItem.style.color = '#333';
                        allItem.style.fontWeight = '600';
                        allItem.style.backgroundColor = 'transparent';
                    }

                    allItem.addEventListener('mouseover', () => allItem.style.backgroundColor = '#f4f7fc');
                    allItem.addEventListener('mouseout', () => {
                        allItem.style.backgroundColor = (currentActivePage === "All" || currentActivePage === "") ? '#eef6fd' : 'transparent';
                    });

                    allItem.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        window.setGlobalPageName("All");
                        dropdownMenu.style.display = 'none';

                        pageNameInput.readOnly = true;
                        pageNameInput.style.cursor = 'default';
                        isEditMode = false;
                        restoreValidBlueState();

                        if (confirmIcon) confirmIcon.style.display = 'none';
                        if (cancelIcon) cancelIcon.style.display = 'none';
                        if (addPageIcon) addPageIcon.style.display = 'inline-block';
                        if (dropdownIcon) dropdownIcon.style.display = 'inline-block';
                        if (editPenIcon) editPenIcon.style.display = 'none';
                    });
                    dropdownMenu.appendChild(allItem);
                }

                // Render Page Options
                uniquePages.forEach(page => {
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.padding = '8px 12px';
                    item.style.margin = '2px 4px';
                    item.style.borderRadius = '6px';
                    item.style.cursor = 'pointer';
                    item.style.fontSize = '12px';
                    item.style.textAlign = 'left';
                    item.style.transition = 'background-color 0.2s ease';

                    const textSpan = document.createElement('span');
                    textSpan.innerText = page;

                    if (currentActivePage === page) {
                        item.style.color = '#4285F4';
                        item.style.fontWeight = '700';
                        item.style.backgroundColor = '#eef6fd';
                    } else {
                        item.style.color = '#333';
                        item.style.fontWeight = '500';
                        item.style.backgroundColor = 'transparent';
                    }

                    item.addEventListener('mouseover', () => item.style.backgroundColor = '#f4f7fc');
                    item.addEventListener('mouseout', () => {
                        item.style.backgroundColor = (currentActivePage === page) ? '#eef6fd' : 'transparent';
                    });

                    item.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        window.setGlobalPageName(page);
                        dropdownMenu.style.display = 'none';

                        pageNameInput.readOnly = true;
                        pageNameInput.style.cursor = 'default';
                        isEditMode = false;
                        restoreValidBlueState();

                        if (confirmIcon) confirmIcon.style.display = 'none';
                        if (cancelIcon) cancelIcon.style.display = 'none';
                        if (addPageIcon) addPageIcon.style.display = 'inline-block';
                        if (dropdownIcon) dropdownIcon.style.display = 'inline-block';
                        if (editPenIcon) editPenIcon.style.display = 'inline-block';
                    });

                    // Trash Icon
                    const delIcon = document.createElement('div');
                    delIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; color: #dc3545; transition: transform 0.1s;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
                    delIcon.style.padding = '4px';
                    delIcon.style.marginRight = '-4px';
                    delIcon.style.borderRadius = '4px';
                    delIcon.title = "Delete Page";

                    delIcon.addEventListener('mouseover', () => {
                        delIcon.style.backgroundColor = '#f8d7da';
                        delIcon.querySelector('svg').style.transform = 'scale(1.1)';
                    });
                    delIcon.addEventListener('mouseout', () => {
                        delIcon.style.backgroundColor = 'transparent';
                        delIcon.querySelector('svg').style.transform = 'scale(1)';
                    });

                    delIcon.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        pendingExportAction = "deletePage";
                        window.pageToDelete = page;

                        document.getElementById('back_btn').style.display = 'inline-block';
                        document.getElementById('okay_btn').innerText = 'Confirm';
                        document.getElementById('popup_title').innerText = "Confirm Page Deletion";
                        document.getElementById('popup_main_text').innerHTML = `Are you sure you want to delete the page <b>"${page}"</b>?`;
                        document.getElementById('popup_sub_text').innerHTML = `All scraped elements mapped to this page will also be removed.`;

                        document.getElementById('confirmationPopup').style.display = 'block';
                        document.getElementById('overlay').style.display = 'block';

                        dropdownMenu.style.display = 'none';
                    });

                    item.appendChild(textSpan);
                    item.appendChild(delIcon);
                    dropdownMenu.appendChild(item);
                });

                dropdownMenu.style.display = 'block';
            });

            // 2. Start timer when leaving the icon
            dropdownIcon.addEventListener('mouseleave', function() {
                pageDropdownTimer = setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 200); // 500ms gap allowance
            });

            // 3. Keep menu open if mouse enters the dropdown itself
            dropdownMenu.addEventListener('mouseenter', function() {
                clearTimeout(pageDropdownTimer);
            });

            // 4. Hide menu when mouse finally leaves the dropdown
            dropdownMenu.addEventListener('mouseleave', function() {
                pageDropdownTimer = setTimeout(() => {
                    dropdownMenu.style.display = 'none';
                }, 300);
            });
        }

    pageNameInput.addEventListener('input', function() {
        if (!pageNameInput.readOnly) {
            if (!isValidPageName(this.value) && this.value !== "") {
                if (confirmIcon) confirmIcon.style.display = 'none';
                if (cancelIcon) cancelIcon.style.display = 'none';
                if (addPageIcon) addPageIcon.style.display = 'none';
                if (editPenIcon) editPenIcon.style.display = 'none';
                if (dropdownIcon) dropdownIcon.style.display = 'none';

                if (errorIconWrapper) errorIconWrapper.style.display = 'inline-flex';
                badgeWrapper.style.borderColor = '#dc3545';
                badgeLabel.style.backgroundColor = '#dc3545';
            } else {
                restoreValidBlueState();

                if (isEditMode) {
                    if (this.value.trim() !== '') {
                        if (confirmIcon) confirmIcon.style.display = 'inline-block';
                        if (cancelIcon) cancelIcon.style.display = 'inline-block';
                    }
                    if (addPageIcon) addPageIcon.style.display = 'none';
                    if (editPenIcon) editPenIcon.style.display = 'none';
                    if (dropdownIcon) dropdownIcon.style.display = 'none';
                } else {
                    if (confirmIcon) confirmIcon.style.display = 'none';
                    if (cancelIcon) cancelIcon.style.display = 'none';
                    if (addPageIcon) addPageIcon.style.display = 'inline-block';
                    if (editPenIcon) editPenIcon.style.display = 'inline-block';
                }
            }
        }
    });

    pageNameInput.addEventListener('blur', function() {
        setTimeout(() => {
            if (isEditMode) return;
            if (this.value.trim() !== '' && isValidPageName(this.value)) {
                this.readOnly = true;
                this.style.cursor = 'default';
                if (addPageIcon) addPageIcon.style.display = 'inline-block';
                if (dropdownIcon) dropdownIcon.style.display = 'inline-block';
                if (confirmIcon) confirmIcon.style.display = 'none';
                if (cancelIcon) cancelIcon.style.display = 'none';

                if (pageNameInput.value === "All") {
                    if (editPenIcon) editPenIcon.style.display = 'none';
                } else {
                    if (editPenIcon) editPenIcon.style.display = 'inline-block';
                }
            }
        }, 150);
    });

    if (addPageIcon) {
        addPageIcon.addEventListener('click', function() {
            isEditMode = true;
            isRenameMode = false;
            previousPageName = pageNameInput.value;

            pageNameInput.value = "";
            pageNameInput.readOnly = false;
            pageNameInput.style.cursor = 'text';
            pageNameInput.focus();

            addPageIcon.style.display = 'none';
            editPenIcon.style.display = 'none';
            if (dropdownIcon) dropdownIcon.style.display = 'none';
            if (confirmIcon) confirmIcon.style.display = 'inline-block';
            if (cancelIcon) cancelIcon.style.display = 'inline-block';
        });
    }

    if (editPenIcon) {
        editPenIcon.addEventListener('click', function() {
            if (pageNameInput.value.trim() === '') {
                pageNameInput.focus();
                flashPageNameError();
                return;
            }

            isEditMode = true;
            isRenameMode = true;
            previousPageName = pageNameInput.value;
            renameTarget = pageNameInput.value.trim();

            pageNameInput.readOnly = false;
            pageNameInput.style.cursor = 'text';
            pageNameInput.focus();

            addPageIcon.style.display = 'none';
            editPenIcon.style.display = 'none';
            if (dropdownIcon) dropdownIcon.style.display = 'none';
            if (confirmIcon) confirmIcon.style.display = 'inline-block';
            if (cancelIcon) cancelIcon.style.display = 'inline-block';
        });
    }

    if (confirmIcon) {
        confirmIcon.addEventListener('click', function() {
            if (pageNameInput.value.trim() === '') {
                pageNameInput.value = lastConfirmedPageName;
            } else if (!isValidPageName(pageNameInput.value)) {
                pageNameInput.focus();
                flashPageNameError();
                showCustomAlert("Invalid Format", "Please provide a valid Page Name without special characters.");
                return;
            }

            const newName = pageNameInput.value.trim();
            if (!window.registeredPageNames) window.registeredPageNames = new Set();

            if (isRenameMode && renameTarget !== "" && renameTarget !== newName) {
                window.registeredPageNames.delete(renameTarget);
                window.registeredPageNames.add(newName);

                const tableBody = document.getElementById('myTable');
                if (tableBody) {
                    const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));
                    allDataRows.forEach(row => {
                        const pageCell = row.querySelector('.page');
                        if (pageCell && pageCell.innerText.trim() === renameTarget) {
                            pageCell.innerText = newName;
                        }
                    });
                }
            } else {
                window.registeredPageNames.add(newName);
            }

            window.setGlobalPageName(newName);

            pageNameInput.readOnly = true;
            pageNameInput.style.cursor = 'default';
            isEditMode = false;

            confirmIcon.style.display = 'none';
            cancelIcon.style.display = 'none';
            if (addPageIcon) addPageIcon.style.display = 'inline-block';
            if (editPenIcon) editPenIcon.style.display = 'inline-block';
            if (dropdownIcon) dropdownIcon.style.display = 'inline-block';
        });
    }

    function triggerCancel() {
        if (pageNameInput.value.trim() === '') {
             pageNameInput.value = lastConfirmedPageName;
        } else {
             pageNameInput.value = previousPageName;
        }

        applyPageNameFilter(pageNameInput.value);

        pageNameInput.readOnly = true;
        pageNameInput.style.cursor = 'default';
        isEditMode = false;
        restoreValidBlueState();

        if (confirmIcon) confirmIcon.style.display = 'none';
        if (cancelIcon) cancelIcon.style.display = 'none';
        if (addPageIcon) addPageIcon.style.display = 'inline-block';
        if (dropdownIcon) dropdownIcon.style.display = 'inline-block';

        if (pageNameInput.value === "All") {
            if (editPenIcon) editPenIcon.style.display = 'none';
        } else {
            if (editPenIcon) editPenIcon.style.display = 'inline-block';
        }
    }

    if (cancelIcon) {
        cancelIcon.addEventListener('click', triggerCancel);
    }

    pageNameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (this.value.trim() === '') {
                if (confirmIcon && confirmIcon.style.display !== 'none') confirmIcon.click();
            } else if (!isValidPageName(this.value) && this.value !== "") {
                flashPageNameError();
            } else if (confirmIcon && confirmIcon.style.display !== 'none') {
                confirmIcon.click();
            } else if (this.value.trim() !== '' && isValidPageName(this.value)) {
                this.blur();
            }
        } else if (e.key === 'Escape' && isEditMode) {
            triggerCancel();
        }
    });

    if (resetButton) {
        resetButton.addEventListener('click', function() {
            pageNameInput.value = '';
            lastConfirmedPageName = '';
            pageNameInput.readOnly = false;
            pageNameInput.style.cursor = 'text';
            isEditMode = false;

            restoreValidBlueState();

            if (addPageIcon) addPageIcon.style.display = 'inline-block';
            if (editPenIcon) editPenIcon.style.display = 'inline-block';
            if (dropdownIcon) dropdownIcon.style.display = 'inline-block';
            if (confirmIcon) confirmIcon.style.display = 'none';
            if (cancelIcon) cancelIcon.style.display = 'none';
        });
    }
}



// --- Scenario Outline Logic (Final Clean Version) ---
function flashScenarioOutlineError() {
    const soBar = document.getElementById('scenarioOutlineBar');
    const soLabel = document.getElementById('so_badge_label');
    const soInput = document.getElementById('scenarioOutlineText');
    const soErrorIconWrapper = document.getElementById('so_error_icon_wrapper');
    const soConfirmIcon = document.getElementById('so_confirm_icon');
    const soCancelIcon = document.getElementById('so_cancel_icon');

    if (soBar && soLabel) {
        soBar.style.borderColor = '#d9534f';
        soLabel.style.backgroundColor = '#d9534f';

        if (soInput) soInput.focus();

        if (soConfirmIcon) soConfirmIcon.style.display = 'none';
        if (soCancelIcon) soCancelIcon.style.display = 'none';
        if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'inline-flex';

        setTimeout(() => {
            if (soInput && (isGlobalPageNameValid(soInput.value) || soInput.value.trim() === '')) {
                soBar.style.borderColor = '#4285F4';
                soLabel.style.backgroundColor = '#4285F4';
                if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'none';

                if (!soInput.readOnly) {
                    if (soConfirmIcon && soInput.value.trim() !== '') soConfirmIcon.style.display = 'inline-block';
                    if (soCancelIcon) soCancelIcon.style.display = 'inline-block';
                }
            }
        }, 2000);
    }
}


function initScenarioOutlineLogic() {
    const soInput = document.getElementById('scenarioOutlineText');
    const soEditIcon = document.getElementById('so_edit_icon');
    const soDropdownIcon = document.getElementById('so_dropdown_icon');
    const soDropdownMenu = document.getElementById('scenarioOutlineDropdown');
    const soConfirmIcon = document.getElementById('so_confirm_icon');
    const soCancelIcon = document.getElementById('so_cancel_icon');
    const soErrorIconWrapper = document.getElementById('so_error_icon_wrapper');

    const soBar = document.getElementById('scenarioOutlineBar');
    const soLabel = document.getElementById('so_badge_label');

    let previousScenarioOutline = "";
    let isSOEditMode = false;

    if (!soInput) return;

    function restoreValidSOBlueState() {
        if (soBar) soBar.style.borderColor = '#4285F4';
        if (soLabel) soLabel.style.backgroundColor = '#4285F4';
        if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'none';

        if (!isSOEditMode && soDropdownIcon) {
            soDropdownIcon.style.display = 'inline-block';
        }
    }

   // --- MODERN DROPDOWN HOVER LOGIC ---
      if (soDropdownIcon && soDropdownMenu) {
          let soDropdownTimer; // Timer to hold the delay

          // 1. Show on Hover (Icon)
          soDropdownIcon.addEventListener('mouseenter', function(e) {
              clearTimeout(soDropdownTimer); // Stop it from closing if returning
              if (isSOEditMode) return;

              if (!window.pageScenarioData || Object.keys(window.pageScenarioData).length === 0) {
                  soDropdownMenu.style.display = 'none';
                  return;
              }

              const currentActivePage = document.getElementById('pagename_searchbox').value.trim();
              soDropdownMenu.innerHTML = '';
              let hasItems = false;

              const validPages = Object.keys(window.pageScenarioData).filter(p => window.pageScenarioData[p] && window.pageScenarioData[p].scenarioOutline);

              if (validPages.length === 0) {
                  soDropdownMenu.style.display = 'none';
                  return;
              }

              // Render "All" option
              if (validPages.length > 1) {
                  const allItem = document.createElement('div');
                  allItem.innerText = "All";
                  allItem.style.padding = '8px 12px';
                  allItem.style.margin = '2px 4px';
                  allItem.style.borderRadius = '6px';
                  allItem.style.cursor = 'pointer';
                  allItem.style.fontSize = '12px';
                  allItem.style.textAlign = 'left';
                  allItem.style.transition = 'background-color 0.2s ease';

                  if (currentActivePage === "All" || currentActivePage === "") {
                      allItem.style.color = '#4285F4';
                      allItem.style.fontWeight = '700';
                      allItem.style.backgroundColor = '#eef6fd';
                  } else {
                      allItem.style.color = '#333';
                      allItem.style.fontWeight = '600';
                      allItem.style.backgroundColor = 'transparent';
                  }

                  allItem.addEventListener('mouseover', () => allItem.style.backgroundColor = '#f4f7fc');
                  allItem.addEventListener('mouseout', () => {
                      allItem.style.backgroundColor = (currentActivePage === "All" || currentActivePage === "") ? '#eef6fd' : 'transparent';
                  });

                  allItem.addEventListener('click', (ev) => {
                      ev.stopPropagation();
                      window.setGlobalPageName("All");
                      soDropdownMenu.style.display = 'none';

                      const soInput = document.getElementById('scenarioOutlineText');
                      if (soInput) {
                          soInput.readOnly = true;
                          soInput.style.cursor = 'default';
                      }
                      isSOEditMode = false;
                      restoreValidSOBlueState();

                      const soConfirmIcon = document.getElementById('so_confirm_icon');
                      const soCancelIcon = document.getElementById('so_cancel_icon');
                      const soEditIcon = document.getElementById('so_edit_icon');

                      if (soConfirmIcon) soConfirmIcon.style.display = 'none';
                      if (soCancelIcon) soCancelIcon.style.display = 'none';
                      if (soDropdownIcon) soDropdownIcon.style.display = 'inline-block';
                      if (soEditIcon) soEditIcon.style.display = 'none';
                  });

                  soDropdownMenu.appendChild(allItem);
                  hasItems = true;
              }

              // Render Scenario Options
              validPages.forEach(page => {
                  hasItems = true;
                  const scenarioData = window.pageScenarioData[page];
                  const outlineText = scenarioData.scenarioOutline;

                  const item = document.createElement('div');
                  item.style.display = 'flex';
                  item.style.justifyContent = 'space-between';
                  item.style.alignItems = 'center';
                  item.style.padding = '8px 12px';
                  item.style.margin = '2px 4px';
                  item.style.borderRadius = '6px';
                  item.style.cursor = 'pointer';
                  item.style.fontSize = '12px';
                  item.style.textAlign = 'left';
                  item.style.transition = 'background-color 0.2s ease';

                  const textSpan = document.createElement('span');
                  textSpan.innerText = outlineText.length > 30 ? outlineText.substring(0, 30) + '...' : outlineText;
                  textSpan.title = `Page: ${page}\nOutline: ${outlineText}`;

                  if (currentActivePage === page) {
                      item.style.color = '#4285F4';
                      item.style.fontWeight = '700';
                      item.style.backgroundColor = '#eef6fd';
                  } else {
                      item.style.color = '#333';
                      item.style.fontWeight = '500';
                      item.style.backgroundColor = 'transparent';
                  }

                  item.addEventListener('mouseover', () => item.style.backgroundColor = '#f4f7fc');
                  item.addEventListener('mouseout', () => {
                      item.style.backgroundColor = (currentActivePage === page) ? '#eef6fd' : 'transparent';
                  });

                  item.addEventListener('click', (ev) => {
                      ev.stopPropagation();
                      window.setGlobalPageName(page);
                      soDropdownMenu.style.display = 'none';
                  });

                  // Trash Icon
                  const delIcon = document.createElement('div');
                  delIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; color: #dc3545; transition: transform 0.1s;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
                  delIcon.style.padding = '4px';
                  delIcon.style.marginRight = '-4px';
                  delIcon.style.borderRadius = '4px';
                  delIcon.title = "Delete Scenario & Page";

                  delIcon.addEventListener('mouseover', () => {
                      delIcon.style.backgroundColor = '#f8d7da';
                      delIcon.querySelector('svg').style.transform = 'scale(1.1)';
                  });
                  delIcon.addEventListener('mouseout', () => {
                      delIcon.style.backgroundColor = 'transparent';
                      delIcon.querySelector('svg').style.transform = 'scale(1)';
                  });

                  delIcon.addEventListener('click', (ev) => {
                      ev.stopPropagation();
                      pendingExportAction = "deletePage";
                      window.pageToDelete = page;

                      document.getElementById('back_btn').style.display = 'inline-block';
                      document.getElementById('okay_btn').innerText = 'Confirm';
                      document.getElementById('popup_title').innerText = "Confirm Deletion";
                      document.getElementById('popup_main_text').innerHTML = `Are you sure you want to delete this Scenario Outline?`;
                      document.getElementById('popup_sub_text').innerHTML = `The associated page <b>"${page}"</b> and all its scraped elements will also be permanently deleted.`;

                      document.getElementById('confirmationPopup').style.display = 'block';
                      document.getElementById('overlay').style.display = 'block';

                      soDropdownMenu.style.display = 'none';
                  });

                  item.appendChild(textSpan);
                  item.appendChild(delIcon);
                  soDropdownMenu.appendChild(item);
              });

              if (!hasItems) {
                  soDropdownMenu.style.display = 'none';
                  return;
              }

              soDropdownMenu.style.display = 'block';
          });

          // 2. Start timer when leaving the icon
          soDropdownIcon.addEventListener('mouseleave', function() {
              soDropdownTimer = setTimeout(() => {
                  soDropdownMenu.style.display = 'none';
              }, 500); // 500ms gap allowance
          });

          // 3. Keep menu open if mouse enters the dropdown itself
          soDropdownMenu.addEventListener('mouseenter', function() {
              clearTimeout(soDropdownTimer);
          });

          // 4. Hide menu when mouse finally leaves the dropdown
          soDropdownMenu.addEventListener('mouseleave', function() {
              soDropdownTimer = setTimeout(() => {
                  soDropdownMenu.style.display = 'none';
              }, 200);
          });
      }

    soInput.addEventListener('input', function() {
        if (!soInput.readOnly) {
            if (!isGlobalPageNameValid(this.value) && this.value !== "") {
                if (soConfirmIcon) soConfirmIcon.style.display = 'none';
                if (soCancelIcon) soCancelIcon.style.display = 'none';
                if (soDropdownIcon) soDropdownIcon.style.display = 'none';

                if (soBar) soBar.style.borderColor = '#dc3545';
                if (soLabel) soLabel.style.backgroundColor = '#dc3545';
                if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'inline-flex';
            } else {
                restoreValidSOBlueState();
                if (isSOEditMode) {
                    if (this.value.trim() !== '') {
                        if (soConfirmIcon) soConfirmIcon.style.display = 'inline-block';
                    } else {
                        if (soConfirmIcon) soConfirmIcon.style.display = 'none';
                    }
                    if (soCancelIcon) soCancelIcon.style.display = 'inline-block';
                    if (soDropdownIcon) soDropdownIcon.style.display = 'none';
                }
            }
        }
    });

    if (soEditIcon) {
        soEditIcon.addEventListener('click', function() {
            isSOEditMode = true;
            previousScenarioOutline = soInput.value;

            soInput.readOnly = false;
            soInput.style.cursor = 'text';
            soInput.focus();

            soEditIcon.style.display = 'none';
            if (soDropdownIcon) soDropdownIcon.style.display = 'none';
            if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'none';

            if (soConfirmIcon) soConfirmIcon.style.display = 'inline-block';
            if (soCancelIcon) soCancelIcon.style.display = 'inline-block';
        });
    }

    if (soConfirmIcon) {
        soConfirmIcon.addEventListener('click', function() {
            if (soInput.value.trim() === '') {
                soInput.focus();
                flashScenarioOutlineError();
                showCustomAlert("Missing Information", "Scenario Outline cannot be empty.");
                return;
            }

            if (!isGlobalPageNameValid(soInput.value)) {
                soInput.focus();
                flashScenarioOutlineError();
                showCustomAlert("Invalid Format", "Please provide a valid Scenario Outline without special characters.");
                return;
            }

            soInput.readOnly = true;
            soInput.style.cursor = 'default';
            isSOEditMode = false;

            const currentActivePage = document.getElementById('pagename_searchbox').value.trim();
            if (currentActivePage && currentActivePage !== "All" && window.pageScenarioData) {
                if (!window.pageScenarioData[currentActivePage]) {
                    window.pageScenarioData[currentActivePage] = { scenarioName: "", scenarioOutline: "" };
                }
                window.pageScenarioData[currentActivePage].scenarioOutline = soInput.value.trim();
            }

            if (soConfirmIcon) soConfirmIcon.style.display = 'none';
            if (soCancelIcon) soCancelIcon.style.display = 'none';
            if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'none';

            if (soEditIcon) soEditIcon.style.display = 'inline-block';
            if (soDropdownIcon) soDropdownIcon.style.display = 'inline-block';
        });
    }

    function triggerSOCancel() {
        soInput.value = previousScenarioOutline;
        soInput.readOnly = true;
        soInput.style.cursor = 'default';
        isSOEditMode = false;

        restoreValidSOBlueState();

        if (soConfirmIcon) soConfirmIcon.style.display = 'none';
        if (soCancelIcon) soCancelIcon.style.display = 'none';
        if (soErrorIconWrapper) soErrorIconWrapper.style.display = 'none';

        if (soEditIcon) soEditIcon.style.display = 'inline-block';
        if (soDropdownIcon) soDropdownIcon.style.display = 'inline-block';
    }

    if (soCancelIcon) {
        soCancelIcon.addEventListener('click', triggerSOCancel);
    }

    soInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (this.value.trim() === '') {
                flashScenarioOutlineError();
                showCustomAlert("Missing Information", "Scenario Outline cannot be empty.");
            } else if (!isGlobalPageNameValid(this.value) && this.value !== "") {
                flashScenarioOutlineError();
            } else if (soConfirmIcon && soConfirmIcon.style.display !== 'none') {
                soConfirmIcon.click();
            }
        } else if (e.key === 'Escape' && isSOEditMode) {
            triggerSOCancel();
        }
    });
}


// Bind dropdown change event and initialize our methods
document.addEventListener('DOMContentLoaded', () => {
    const rppSelect = document.getElementById('rows_per_page');
    if (rppSelect) {
        rppSelect.addEventListener('change', () => {
            currentPage = 1; // Reset to page 1 on resize
            applyPagination();
        });
    }

    // --- Initialize the new Page Name logic ---
    initPageNameLogic();


    // --- Initialize Scenario Outline logic ---
        initScenarioOutlineLogic();
});




/// HELPER: Swaps the colors and icon of the modal header
 function setModalTheme(type) {
     const header = document.getElementById('modal_header');
     const iconContainer = document.getElementById('modal_icon_container');

     if (header) header.className = `modal-header header-${type}`;

     if (iconContainer) {
         if (type === "success") {
             iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
         } else if (type === "info") {
             iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
         } else {
             // Default warning (Red triangle)
             iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="warning-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
         }
     }
 }

 // HELPER: Replaces default browser alerts with the custom modal
 function showCustomAlert(title, message, type = "warning") {
     setModalTheme(type); // Instantly apply the right color and icon

     document.getElementById('popup_title').innerText = title;
     document.getElementById('popup_main_text').innerHTML = message;
     document.getElementById('popup_sub_text').innerText = "";

     // Hide Cancel button, change Confirm to Okay
     document.getElementById('back_btn').style.display = 'none';
     document.getElementById('okay_btn').innerText = 'Okay';

     // Tell the button this is just an alert
     pendingExportAction = "alertOnly";

     document.getElementById('confirmationPopup').style.display = 'block';
     document.getElementById('overlay').style.display = 'block';
 }


// --- RECORD SCENARIO & TOGGLE LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    const recordScenarioBtn = document.getElementById("recordScenarioBtn");
    const addScenarioBtn = document.getElementById("addScenarioBtn");
    const recordModal = document.getElementById("recordScenarioModal");
    const overlay = document.getElementById("overlay");
    const pageNameInput = document.getElementById("pagename_searchbox");

    const recPageNameInput = document.getElementById("rec_pagename");
    const recScenarioNameInput = document.getElementById("rec_scenarioname");
    const recScenarioOutlineInput = document.getElementById("rec_scenariooutline");

    const recCloseBtn = document.getElementById("rec_close_btn");
    const recStartBtn = document.getElementById("rec_start_btn");

    const scenarioOutlineBar = document.getElementById("scenarioOutlineBar");
    const scenarioOutlineText = document.getElementById("scenarioOutlineText");

    // Tracks if we are "Renaming" (Record) or "Creating New" (Add)
    let currentScenarioMode = "";
    let initialModalPageName = "";
    let liveTrackingName = ""; // Used to safely track real-time keystroke changes

    function validatePageName(val) {
        if (!val || val.trim() === '') return "Page Name is required";
        if (typeof isGlobalPageNameValid === 'function' && !isGlobalPageNameValid(val)) {
            return "Page Name must start with a letter and can contain only letters, numbers, _, and single spaces.";
        }
        return "";
    }

    function validateScenarioName(val) {
        if (!val || val.trim() === '') return "Scenario Name is required";
        if (val.trim().length < 3) return "Scenario Name must be at least 3 characters";
        const regex = /^[A-Za-z][A-Za-z0-9_]*(\s[A-Za-z0-9_]+)*$/;
        if (!regex.test(val)) return "Scenario Name must start with a letter and can contain only letters, numbers, _, and single spaces.";
        return "";
    }

    function validateScenarioOutline(val) {
        if (!val || val.trim() === '') return "Scenario Outline is required";
        if (val.trim().length < 3) return "Scenario Outline must be at least 3 characters";
        return "";
    }

    function showError(inputEl, iconId, textId, message) {
        inputEl.classList.add("input-error-border");
        const icon = document.getElementById(iconId);
        const text = document.getElementById(textId);
        if (icon) icon.style.display = "flex";
        if (text) text.innerText = message;
    }

    function clearError(inputEl, iconId) {
        inputEl.classList.remove("input-error-border");
        const icon = document.getElementById(iconId);
        if (icon) icon.style.display = "none";
    }

    if (recordScenarioBtn && addScenarioBtn) {
        // Initial State
        recordScenarioBtn.style.setProperty("display", "inline-flex", "important");
        addScenarioBtn.style.setProperty("display", "none", "important");

        if (recPageNameInput) {
            recPageNameInput.removeAttribute("readonly");
        }

        // Live validation and REAL-TIME updating logic
        if(recPageNameInput) {
            recPageNameInput.addEventListener("input", function() {
                const errorMsg = validatePageName(this.value);
                if (errorMsg) showError(this, "rec_page_error_icon", "rec_page_error_text", errorMsg);
                else clearError(this, "rec_page_error_icon");

                // --- REAL-TIME RENAME: Only happens if user clicked Record Scenario ---
                if (currentScenarioMode === "RECORD") {
                    const newPageName = this.value;

                    // Update main input instantly
                    if (pageNameInput) pageNameInput.value = newPageName;

                    // Update matching table cells instantly
                    const tableBody = document.getElementById('myTable');
                    if (tableBody && liveTrackingName !== "") {
                        const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));
                        allDataRows.forEach(row => {
                            const pageCell = row.querySelector('.page');
                            // Only update cells that match our current active track
                            if (pageCell && pageCell.innerText.trim() === liveTrackingName) {
                                pageCell.innerText = newPageName;
                            }
                        });
                    }
                    // Sync the tracker so the next keystroke finds the right cells
                    liveTrackingName = newPageName;
                }
            });
        }

        if(recScenarioNameInput) {
            recScenarioNameInput.addEventListener("input", function() {
                const errorMsg = validateScenarioName(this.value);
                if (errorMsg) showError(this, "rec_scenario_error_icon", "rec_scenario_error_text", errorMsg);
                else clearError(this, "rec_scenario_error_icon");
            });
        }

        if(recScenarioOutlineInput) {
            recScenarioOutlineInput.addEventListener("input", function() {
                const errorMsg = validateScenarioOutline(this.value);
                if (errorMsg) showError(this, "rec_outline_error_icon", "rec_outline_error_text", errorMsg);
                else clearError(this, "rec_outline_error_icon");
            });
        }

        function openScenarioModal(mode) {
            currentScenarioMode = mode;
            const pageNameValue = pageNameInput ? pageNameInput.value.trim() : "";

            if (!isGlobalPageNameValid(pageNameValue)) {
                handleInvalidPageNameAttempt();
                return;
            }

            // Capture the initial name exactly as it was when the modal opened
            initialModalPageName = pageNameValue;
            liveTrackingName = pageNameValue;

            if (recPageNameInput) {
                recPageNameInput.value = pageNameValue;
                clearError(recPageNameInput, "rec_page_error_icon");
            }

            // --- NEW: Retrieve BOTH Scenario Name and Outline from memory ---
            let savedScenarioName = "";
            let savedScenarioOutline = "";

            if (window.pageScenarioData && window.pageScenarioData[pageNameValue]) {
                savedScenarioName = window.pageScenarioData[pageNameValue].scenarioName || "";
                savedScenarioOutline = window.pageScenarioData[pageNameValue].scenarioOutline || "";
            }

            if (recScenarioNameInput) {
                // Only pre-fill if we are in RECORD (edit) mode. If ADD (new), leave blank.
                recScenarioNameInput.value = (mode === "RECORD") ? savedScenarioName : "";
                clearError(recScenarioNameInput, "rec_scenario_error_icon");
            }

            if (recScenarioOutlineInput) {
                recScenarioOutlineInput.value = (mode === "RECORD") ? savedScenarioOutline : "";
                clearError(recScenarioOutlineInput, "rec_outline_error_icon");
            }

            if (recordModal) recordModal.style.display = "block";
            if (overlay) overlay.style.display = "block";
        }

        // Pass 'RECORD' or 'ADD' so the system knows what to do
        recordScenarioBtn.addEventListener("click", () => openScenarioModal("RECORD"));
        addScenarioBtn.addEventListener("click", () => openScenarioModal("ADD"));

        // Helper to undo real-time changes if the user clicks "Cancel" or "Close"
        function revertRealTimeChanges() {
            if (currentScenarioMode === "RECORD" && liveTrackingName !== initialModalPageName) {
                if (pageNameInput) pageNameInput.value = initialModalPageName;
                const tableBody = document.getElementById('myTable');
                if (tableBody) {
                    const allDataRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-excel-row):not(.no-results-row)'));
                    allDataRows.forEach(row => {
                        const pageCell = row.querySelector('.page');
                        if (pageCell && pageCell.innerText.trim() === liveTrackingName) {
                            pageCell.innerText = initialModalPageName;
                        }
                    });
                }
                liveTrackingName = initialModalPageName;
            }
        }

        if (recCloseBtn) {
            recCloseBtn.addEventListener("click", () => {
                revertRealTimeChanges(); // Undo any typing if canceled

                if (recordModal) recordModal.style.display = "none";
                if (overlay) overlay.style.display = "none";

                if (addScenarioBtn.style.display === "none" && scenarioOutlineBar) {
                    scenarioOutlineBar.style.display = "none";
                }
            });
        }

        if (recStartBtn) {
           recStartBtn.addEventListener("click", () => {
               let isValid = true;

               if (recPageNameInput) {
                   const pageError = validatePageName(recPageNameInput.value);
                   if (pageError) {
                       showError(recPageNameInput, "rec_page_error_icon", "rec_page_error_text", pageError);
                       isValid = false;
                   }
               }

               const nameError = validateScenarioName(recScenarioNameInput.value);
               if (nameError) {
                   showError(recScenarioNameInput, "rec_scenario_error_icon", "rec_scenario_error_text", nameError);
                   isValid = false;
               }

               const outlineError = validateScenarioOutline(recScenarioOutlineInput.value);
               if (outlineError) {
                   showError(recScenarioOutlineInput, "rec_outline_error_icon", "rec_outline_error_text", outlineError);
                   isValid = false;
               }

               if (!isValid) return;

               const newPageName = recPageNameInput.value.trim();
               const newScenarioName = recScenarioNameInput.value.trim(); // NEW: Grab Scenario Name
               const newScenarioOutline = recScenarioOutlineInput.value.trim(); // NEW: Grab Scenario Outline

               // Make sure global memory objects exist
               if (!window.registeredPageNames) window.registeredPageNames = new Set();
               if (!window.pageScenarioData) window.pageScenarioData = {}; // NEW: Ensure object exists

               // --- RECORD vs ADD MEMORY LOGIC ---
               if (currentScenarioMode === "RECORD") {

                   // RECORD: Delete old name from memory, save new name.
                   if (initialModalPageName !== "" && initialModalPageName !== newPageName) {
                       window.registeredPageNames.delete(initialModalPageName);
                       window.registeredPageNames.add(newPageName);

                       // NEW: Transfer scenario data to the new page name
                       window.pageScenarioData[newPageName] = {
                           scenarioName: newScenarioName,
                           scenarioOutline: newScenarioOutline
                       };
                       delete window.pageScenarioData[initialModalPageName]; // Clean up old memory

                   } else if (initialModalPageName === newPageName && newPageName !== "") {
                       window.registeredPageNames.add(newPageName);

                       // NEW: Update existing page data
                       window.pageScenarioData[newPageName] = {
                           scenarioName: newScenarioName,
                           scenarioOutline: newScenarioOutline
                       };
                   }

               } else if (currentScenarioMode === "ADD") {

                   // ADD: Keep old name, save new name. DO NOT touch old table cells.
                   if (initialModalPageName !== "") {
                       window.registeredPageNames.add(initialModalPageName);
                   }
                   if (newPageName !== "") {
                       window.registeredPageNames.add(newPageName);

                       // NEW: Save data for newly added page
                       window.pageScenarioData[newPageName] = {
                           scenarioName: newScenarioName,
                           scenarioOutline: newScenarioOutline
                       };
                   }
               }

               // Update the main top searchbox and filter so the user sees the new page context
               // Note: Calling window.setGlobalPageName here automatically renders the outline we just saved!
               if (pageNameInput) {
                   pageNameInput.value = newPageName;
                   if (window.setGlobalPageName) {
                       window.setGlobalPageName(newPageName);
                   }
               }

               // Close Popup
               if (recordModal) recordModal.style.display = "none";
               if (overlay) overlay.style.display = "none";

               // Update main UI components
               if (scenarioOutlineBar && scenarioOutlineText) {
                   scenarioOutlineText.value = newScenarioOutline;
                   scenarioOutlineBar.style.display = "inline-flex";
               }

               // Swap buttons
               recordScenarioBtn.style.setProperty("display", "none", "important");
               addScenarioBtn.style.setProperty("display", "inline-flex", "important");
           });
        }
    }
});

// ==========================================
// MULTI-DELETE (BULK DELETE) LOGIC ENGINE
// ==========================================
let isMultiDeleteMode = false;

// 1. Right-Click Context Menu Logic for the Delete Header
const deleteHeader = document.getElementById('delete_header');
const deleteContextMenu = document.getElementById('deleteContextMenu');
const toggleMultiDeleteOpt = document.getElementById('toggleMultiDeleteOpt');

if (deleteHeader) {
    deleteHeader.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (deleteContextMenu) {
            const menuWidth = 140;
            const posX = (e.clientX + menuWidth > window.innerWidth) ? e.clientX - menuWidth : e.clientX;
            deleteContextMenu.style.left = `${posX}px`;
            deleteContextMenu.style.top = `${e.clientY}px`;
            deleteContextMenu.style.display = "block";
        }
    });
}

// Hide context menu on outside click
document.addEventListener('click', (e) => {
    if (deleteContextMenu && !deleteContextMenu.contains(e.target)) {
        deleteContextMenu.style.display = "none";
    }
});

// 2. Toggle Multi-Delete Mode
if (toggleMultiDeleteOpt) {
    toggleMultiDeleteOpt.addEventListener('click', () => {
        // If we are about to ENABLE multi-delete, check if the table actually contains data first
        if (!isMultiDeleteMode) {
            if (typeof hasValidTableData === 'function' && !hasValidTableData('myTable')) {
                showCustomAlert("No Data Found", "There is no data available in the table to perform multi-delete.", "info");
                if (deleteContextMenu) deleteContextMenu.style.display = "none";
                return; // Halt execution, do not enable mode
            }
        }

        isMultiDeleteMode = !isMultiDeleteMode;

        const bulkDeleteBtn = document.getElementById('bulk_delete_btn');
        const headerCheckbox = document.getElementById('selectAllCheckbox');
        const headerTrashIcon = document.getElementById('headerDeleteIcon');
        const dataDeleteCells = document.querySelectorAll('#myTable tr:not(.empty-excel-row):not(.no-results-row) .delete-cell');

        if (isMultiDeleteMode) {
            // Enable Mode
            toggleMultiDeleteOpt.innerText = "Disable Multi-Delete";
            if(bulkDeleteBtn) bulkDeleteBtn.style.setProperty("display", "inline-flex", "important");
            if(headerCheckbox) headerCheckbox.style.display = "inline-block";
            if(headerTrashIcon) headerTrashIcon.style.display = "none";

            // Swap icons in rows
            dataDeleteCells.forEach(cell => {
                const cb = cell.querySelector('.bulk-delete-cb');
                const trash = cell.querySelector('.deleteBtn');
                if (cb) { cb.style.display = "inline-block"; cb.checked = false; }
                if (trash) trash.style.display = "none";
            });
            if (headerCheckbox) headerCheckbox.checked = false;

        } else {
            // Disable Mode
            toggleMultiDeleteOpt.innerText = "Enable Multi-Delete";
            if(bulkDeleteBtn) bulkDeleteBtn.style.setProperty("display", "none", "important");
            if(headerCheckbox) headerCheckbox.style.display = "none";
            if(headerTrashIcon) headerTrashIcon.style.display = "inline-block";

            // Swap icons in rows back to normal
            dataDeleteCells.forEach(cell => {
                const cb = cell.querySelector('.bulk-delete-cb');
                const trash = cell.querySelector('.deleteBtn');
                if (cb) cb.style.display = "none";
                if (trash) trash.style.display = "inline-block";
            });
        }

        if (deleteContextMenu) deleteContextMenu.style.display = "none";
    });
}

// 3. Header "Select All" Logic
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleRows = document.querySelectorAll('#myTable tr:not(.empty-excel-row):not(.no-results-row):not(.page-hidden):not(.search-hidden)');

        visibleRows.forEach(row => {
            const cb = row.querySelector('.bulk-delete-cb');
            if (cb) cb.checked = isChecked;
        });
    });
}

// 4. Execute "Delete Selected" Button
const bulkDeleteBtn = document.getElementById('bulk_delete_btn');
if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.bulk-delete-cb:checked');

            if (checkedBoxes.length === 0) {
                showCustomAlert("No Rows Selected", "Please select at least one row to delete.", "info");
                return;
            }

            // Build Confirmation Text without page-wiping warnings
            let mainText = `Are you sure you want to delete the ${checkedBoxes.length} selected row(s)?`;
            let subText = `This action cannot be undone.`;

            document.getElementById('back_btn').style.display = 'inline-block';
            document.getElementById('okay_btn').innerText = 'Confirm';
            document.getElementById('popup_title').innerText = "Confirm Bulk Deletion";
            document.getElementById('popup_main_text').innerHTML = mainText;
            document.getElementById('popup_sub_text').innerHTML = subText;

            pendingExportAction = "bulkDelete";

            // Pass payload of checked boxes to the global scope so the Confirm handler can access it
            window.pendingBulkDeleteRows = Array.from(checkedBoxes).map(cb => cb.closest('tr'));

            document.getElementById('confirmationPopup').style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
        });
}