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

window.addEventListener("DOMContentLoaded", () => {

    document.getElementById("split-div3").style.display = "none";

    document.getElementById("tapBtn").style.background = "#4285F4";
    document.getElementById("tapBtn").style.color = "#fff";

    document.getElementById("touchBtn").style.background = "#fff";
    document.getElementById("touchBtn").style.color = "#333";

    document.getElementById("changeTokenBtn").style.display = "none";
});

ipcRenderer.on("launch-mode", (event, launchedFromProtocol) => {

    launchedViaProtocol = launchedFromProtocol;

    const tokenInput = document.getElementById("tokenInput");

    if (launchedViaProtocol) {

        tokenInput.style.visibility = "hidden";

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

        tokenInput.style.visibility = "visible";

        document.getElementById("Run").disabled = true;
        document.getElementById("Run").style.backgroundColor = "#B6B6B4";
    }
});

const CryptoJS = require("crypto-js");

const secretKey = "algoshackv5-123";

function decryptData(cipherText) {
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        console.log("Encrypted:", cipherText);
        console.log("Decrypted:", decrypted);

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

  if (plateformOption === 'Android') {
    if (appName.trim() === '') {
      document.getElementById('appname').style.borderColor = 'red';
    } if (deviceName.trim() === '') {
      document.getElementById('devicename').style.borderColor = 'red';
    } if (udidName.trim() === '') {
      document.getElementById('udid').style.borderColor = 'red';
    } if (appPackage.trim() === '') {
      document.getElementById('apppackage').style.borderColor = 'red';
    } if (appActivity.trim() === '') {
      document.getElementById('appactivity').style.borderColor = 'red';
    } if (appiumURL.trim() === '') {
      document.getElementById('appiumurl').style.borderColor = 'red';
    } if (automationName.trim() === '') {
      document.getElementById('automationName').style.borderColor = 'red';
    }

    if (appName.trim() != '' && deviceName.trim() != '' && udidName.trim() != '' && appPackage.trim() != '' && appActivity.trim() != '' && appiumURL.trim() != '' && automationName.trim() != '') {
      document.getElementById('platformname').disabled = true;
  document.getElementById('AppRunningPopup').style.display = 'block'
  document.getElementById('overlay').style.display = 'block';
      var appName = document.getElementById('appname').value;
      var deviceName = document.getElementById('devicename').value;
      var udidName = document.getElementById('udid').value;
      var appPackage = document.getElementById('apppackage').value;
      var appActivity = document.getElementById('appactivity').value;
      var appiumURL = document.getElementById('appiumurl').value;
      var automationName = document.getElementById('automationName').value;
      ipcRenderer.send('appPackage', appPackage);
  initialData = [];
      initialData.push(plateformOption, deviceName, appPackage, appActivity, appiumURL, udidName, automationName);
      if (process.platform !== 'darwin') {
        startApp(initialData);
      }
      else {
        launchApp(initialData)

      }
    }
  } else if (plateformOption === 'IOS') {
    if (appName.trim() === '') {
      document.getElementById('appname').style.borderColor = 'red';
    } if (deviceName.trim() === '') {
      document.getElementById('devicename').style.borderColor = 'red';
    } if (udidName.trim() === '') {
      document.getElementById('udid').style.borderColor = 'red';
    } if (appiumURL.trim() === '') {
      document.getElementById('appiumurl').style.borderColor = 'red';
    } if (platformVersion.trim() === '') {
      document.getElementById('platformversion').style.borderColor = 'red';
    } if (automationName.trim() === '') {
      document.getElementById('automationName').style.borderColor = 'red';
    } if (bundleID.trim() === '') {
      document.getElementById('bundleID').style.borderColor = 'red';
    }

    if (appName.trim() != '' && deviceName.trim() != '' && udidName.trim() != '' && platformVersion.trim() != '' && automationName.trim() != '' && appiumURL.trim() != '' && bundleID.trim() != '') {
      document.getElementById('platformname').disabled = true;
      document.getElementById('AppRunningPopup').style.display = 'block';
      document.getElementById('overlay').style.display = 'block';
      var appName = document.getElementById('appname').value;
      var deviceName = document.getElementById('devicename').value;
      var udidName = document.getElementById('udid').value;
      var platformVersion = document.getElementById('platformversion').value;
      var automationName = document.getElementById('automationName').value;
      var appiumURL = document.getElementById('appiumurl').value;
      var bundleID = document.getElementById('bundleID').value;
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
  }
});


async function startApp(initialData) {

  // setting capabilities
  var Androide_desiredCaps = {
    platformName: initialData[0],
    "appium:options": {
      deviceName: initialData[1],
      udid: initialData[5],
      appPackage: initialData[2],
      appActivity: initialData[3],
      automationName: initialData[6],
      newCommandTimeout: 3000,
      autoGrantPermissions: true,
      noReset: true
    }
  };

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
  //Initiating the Driver
  try {

  // changed


    if (initialData[0] === 'Android') {

        console.log("STEP 1");

        driver = await new wd.Builder()
            .usingServer(initialData[4])
            .withCapabilities(darwin_Androide_desiredCaps)
            .forBrowser("")
            .build();

        console.log("STEP 2 - SESSION CREATED");
    }

    //changed

  document.getElementById('Scrape').disabled = false;
  document.getElementById('Scrape').style.backgroundColor = '#4285F4'
  document.getElementById('Run').disabled = true;
  document.getElementById('Run').style.backgroundColor = '#B6B6B4'
    document.getElementById('AppRunningPopup').style.display = 'none'
    document.getElementById('overlay').style.display = 'none';


    //changed


  } catch (error) {
    document.getElementById('AppRunningPopup').style.display = 'none'
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('launchErrorPopup').style.display = 'block'
    document.getElementById('overlay').style.display = 'block';
    document.getElementById("okay_button").addEventListener('click', async () => {
      document.getElementById('launchErrorPopup').style.display = 'none'
      document.getElementById('overlay').style.display = 'none';
      document.getElementById('platformname').disabled = false;
    });
  }
}


async function launchApp(initialData) {
  var darwin_Androide_desiredCaps = {
    platformName: initialData[0],
    "appium:options": {
      deviceName: initialData[1],
      appPackage: initialData[2],
      appActivity: initialData[3],
      newCommandTimeout: 3000,
      automationName: initialData[6],
      noReset: true
    }
  };
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

  // Initiating the Driver
  try {
    if (initialData[0] === 'Android') {
      driver = await new wd.Builder().usingServer(initialData[4]).withCapabilities(darwin_Androide_desiredCaps).forBrowser("").build();

      console.log("Android Driver Session Established. Activating application package...");
      // Explicitly pull the targeted app to the foreground
      await driver.executeScript("mobile: activateApp", { appId: initialData[2] });
    }
    else if (initialData[0] === 'IOS') {
      driver = await new wd.Builder().usingServer(initialData[4]).withCapabilities(darwin_IOS_desiredCaps).forBrowser("").build();

      console.log("iOS Driver Session Established. Activating application bundle...");
      // Explicitly pull the targeted app to the foreground
      await driver.executeScript("mobile: activateApp", { bundleId: initialData[6] });
    }
  } catch (error) {
     console.error("Failed to initialize driver session:", error);
     // Re-enable run buttons if initialization crashes out completely
     document.getElementById('AppRunningPopup').style.display = 'none';
     document.getElementById('overlay').style.display = 'none';
     alert("Launch error: " + error.message);
     return;
  }

  // Update UI State safely since driver session is validated
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

  // Proceed to screen extraction steps
  await loadFirstScreen();
}


async function loadFirstScreen() {

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

        img.onclick = async function (e) {

            if (hasDragged) {
                    return;
                }

            if (!tapMode) {

                const rect =
                    img.getBoundingClientRect();

                const appNode =
                    window.xmlDoc.getElementsByTagName(
                        "XCUIElementTypeApplication"
                    )[0];

                const appWidth =
                    parseFloat(appNode.getAttribute("width"));

                const appHeight =
                    parseFloat(appNode.getAttribute("height"));

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

                await performTouch(x, y);

                return;
            }

            const rect =
                img.getBoundingClientRect();

            const appNode =
                window.xmlDoc.getElementsByTagName(
                    "XCUIElementTypeApplication"
                )[0];

            const appWidth =
                parseFloat(appNode.getAttribute("width"));

            const appHeight =
                parseFloat(appNode.getAttribute("height"));

            const scaleX =
                appWidth / rect.width;

            const scaleY =
                appHeight / rect.height;

            const clickX =
                (e.clientX - rect.left) * scaleX;

            const clickY =
                (e.clientY - rect.top) * scaleY;

            findIOSLocator(
                clickX,
                clickY
            );

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

}

// action to perfom on clicking scrape button
document.getElementById("Scrape").addEventListener('click', async () => {
  document.getElementById('searchbox').value = '';
  document.getElementById('brokenText').style.display = 'none'
  const ssElement = document.getElementById('ss');
  if (ssElement) {
    ssElement.remove();
  }
  noResultsMessage.style.display = 'none';
try{

  var correct_pageName = true;
  var controlIdList = [];
  controlNameLists = [];
  const onlySpecialCharsRegex = /^[!@#$%^&*(),.?":{}|<>]*$/;
  var plateformName = document.getElementById('platformname');
  var pagename_searchbox_Field = document.getElementById('pagename_searchbox').value;
  if (pagename_searchbox_Field.trim() === '') {

      document.getElementById('pagename_searchbox').style.borderColor = 'red';

      alert("Please enter Page Name before scraping.");

      return;
  }
  if (pagename_searchbox_Field.trim() != '') {

    if (pagename_searchbox_Field.length > 0) {
      var format = /[!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?]+/;
      if (format.test(pagename_searchbox_Field) || /^\d+$/.test(pagename_searchbox_Field) || pagename_searchbox_Field.includes("  ")|| pagename_searchbox_Field.startsWith(" ") || pagename_searchbox_Field.endsWith(" ") || onlySpecialCharsRegex.test(pagename_searchbox_Field)) {

        document.getElementById('ScreenNameError').style.display = 'block'
        document.getElementById('overlay').style.display = 'block';
        document.getElementById("ok_button").addEventListener('click', async () => {
          document.getElementById('ScreenNameError').style.display = 'none'
          document.getElementById('SamePageNameError').style.display = 'none'
          document.getElementById('overlay').style.display = 'none';
        });
        correct_pageName = false;
      }
    // }
    else{

    if (correct_pageName) {
      if(!screenNameList.includes(pagename_searchbox_Field)){
      var plateformOption = plateformName.options[plateformName.selectedIndex].text;
      document.getElementById('sttus_bar_div').style.display = 'none'
      document.getElementById('div_status_bar').style.display = 'block';
      document.getElementById('Scrape').style.backgroundColor = '#B6B6B4';
      document.getElementById('Scrape').disabled = true;
      document.getElementById('reset').style.backgroundColor = '#B6B6B4';
      document.getElementById('reset').disabled = true;
      document.getElementById('download').style.backgroundColor = '#B6B6B4';
      document.getElementById('download').disabled = true;
      if (plateformOption === 'Android') {
        await driver.takeScreenshot().then(
          function (image) {
            if (!fs.existsSync(systemAppData)) {
              fs.mkdirSync(systemAppData, { recursive: true });
            }
            require('fs').writeFileSync(path.join(systemAppData, `image${counter}.png`), image, 'base64');
          },

        );
        await addImage()
      }

      else if (plateformOption === 'IOS') {
        const homeDirectory = require('os').homedir();
        folderPath = path.join(homeDirectory, 'algoScraperScreenShot');
        try {
          if (!fs.existsSync('algoScraperScreenShot')) {
            fs.mkdirSync(folderPath);
          }
        } catch (err) {
        }

        const image = await driver.takeScreenshot();
        require('fs').writeFileSync(`${folderPath}/image${counter}.png`, image, 'base64');

        await addImage();
      }


      var firstlist = [];

      async function addImage() {
        var plateformName = document.getElementById('platformname');
        var plateformOption = plateformName.options[plateformName.selectedIndex].text;
        if (imgTagFlag === false) {
          let img = document.createElement('img');
          if (plateformOption === 'Android') {
            img.src = path.join(systemAppData, `image${counter}.png?${new Date().getTime()}`);
          }
          else if (plateformOption === 'IOS') {
            img.src = `${folderPath}/image${counter}.png?${new Date().getTime()}`;
          }
        img.id = 'screenshot'
        enableImageDragging(img);
        rotation = 0;
        zoomLevel = 1;

        img.style.transform =
            "scale(1) rotate(0deg)";
       img.style.height = BASE_HEIGHT + "px";
       img.style.width = BASE_WIDTH + "px";
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";
        img.style.objectFit = "unset";
        img.style.display = "block";
        img.style.margin = "0 auto";

        img.onmousemove = function(e){

            previewElement(e);

        };


        img.onmouseleave = function () {

            showElementHover = false;
            clearOverlay();

        };

        img.onclick = async function(e){

             if (hasDragged) {
                     return;
                 }

             if (!tapMode) {

                 const rect = img.getBoundingClientRect();

                 const appNode =
                     window.xmlDoc.getElementsByTagName(
                         "XCUIElementTypeApplication"
                     )[0];

                 const appWidth =
                     parseFloat(appNode.getAttribute("width"));

                 const appHeight =
                     parseFloat(appNode.getAttribute("height"));

                 const scaleX = appWidth / rect.width;
                 const scaleY = appHeight / rect.height;

                 const x =
                     Math.round((e.clientX - rect.left) * scaleX);

                 const y =
                     Math.round((e.clientY - rect.top) * scaleY);



                 await performTouch(x, y);

                 return;
             }

            const rect = img.getBoundingClientRect();

            const appNode =
                window.xmlDoc.getElementsByTagName(
                    "XCUIElementTypeApplication"
                )[0];

            const appWidth =
                parseFloat(appNode.getAttribute("width"));

            const appHeight =
                parseFloat(appNode.getAttribute("height"));

            const scaleX = appWidth / rect.width;
            const scaleY = appHeight / rect.height;

            const clickX =
                (e.clientX - rect.left) * scaleX;

            const clickY =
                (e.clientY - rect.top) * scaleY;

            console.log("CLICK:", clickX, clickY);

            findIOSLocator(clickX, clickY);
        };

        const dummy = document.getElementById("dummyDevice");

        if (dummy) {
            dummy.style.display = "none";
        }
        document.getElementById('image-container').appendChild(img);
          counter = counter + 1;
          imgTagFlag = true
        }
        else {
          let ss = document.getElementById('screenshot')
          const dummy = document.getElementById("dummyDevice");

          if (dummy) {
              dummy.style.display = "none";
          }
          rotation = 0;
          zoomLevel = 1;

          ss.style.transform =
              "scale(1) rotate(0deg)";
          if (plateformOption === 'Android') {
            ss.src = path.join(systemAppData, `image${counter}.png`);
          }
          else if (plateformOption === 'IOS') {
            ss.src = `${folderPath}/image${counter}.png?${new Date().getTime()}`;
          }
         ss.style.width = BASE_WIDTH + "px";
         ss.style.height = BASE_HEIGHT + "px";
         ss.style.maxWidth = "none";
         ss.style.maxHeight = "none";
         ss.style.objectFit = "unset";
         ss.style.display = "block";
         ss.style.margin = "0 auto";
          imgTagFlag = true
          counter = counter + 1;
        }
      }

      var pageSource = await driver.getPageSource() // Get all the elements from the webpage

      parser = new DOMParser();
      xmlDoc = parser.parseFromString(pageSource, "text/xml");
      window.xmlDoc = xmlDoc;
      showElementHover = false;
      var selectedNodes = selectNodes('/');

      function selectNodes(path) {
        var xpathResult = xmlDoc.evaluate(path, xmlDoc, null, XPathResult.ANY_TYPE, null);
        var nodes = [];
        var node;
        while (node = xpathResult.iterateNext()) {
          nodes.push(node);
        }
        return nodes;
      }


      if (plateformOption === 'Android') {

        let listOfTags = [];

        function addTag(tag) {
          listOfTags.push(tag);
        }

        addTag("android.widget.TextView");
        addTag("android.view.View");
        addTag("android.widget.ImageButton");
        addTag("android.widget.Button");
        addTag("android.widget.EditText");
        addTag("android.widget.ImageView");
        addTag("android.widget.Button");
        addTag("android.widget.EditText");
        addTag("android.view.ViewGroup");
        addTag("android.widget.Image");
        addTag("android.widget.ToggleButton");
        addTag("android.widget.RadioButton");

        var xmlNodes = [];

        listOfTags.forEach(function (stringTag) {
          var getElements = xmlDoc.getElementsByTagName(stringTag);
          for (var i = 0; i < getElements.length; i++) {
            xmlNodes.push(getElements[i]);
          }
        });


        for (var i = 0; i < xmlNodes.length; i++) {
          var node = xmlNodes[i];


          if (node.nodeName !== "hierarchy" && node.nodeName !== "android.widget.FrameLayout"
            && !node.nodeName.includes("LinearLayout") && !node.nodeName.includes("DrawerLayout")
            && !node.nodeName.includes("RecyclerView") && !node.nodeName.includes("RelativeLayout")
            && node.nodeName !== "" && node.nodeName !== null) {
            var controlName = "";
            var CN_Value = "";
            var controlType = node.nodeName;
            var controlIdentificationType = "XPath";
            var controlId = "";
            var xpath = "";

            if (node.nodeName === "android.view.View") {
              controlType = "Label";
            } else if (node.nodeName === "android.view.ViewGroup" || node.nodeName === "android.widget.Image" || node.nodeName === "android.widget.TextView") {
              controlType = "Link";
            } else if (node.nodeName === "android.widget.ImageButton" || node.nodeName === "android.widget.Button" || node.nodeName === "android.widget.ToggleButton") {
              controlType = "Button";
            } else if (node.nodeName === "android.widget.EditText") {
              controlType = "TextBox";
            } else if (node.nodeName === "android.widget.ImageView") {
              controlType = "Image";
            } else if (node.nodeName === "android.widget.RadioButton") {
              controlType = "RadioButton";
            }
            try {
              if (node.getAttribute("text") !== null && node.getAttribute("text").trim() !== "") {
                controlName = node.getAttribute("text").trim();
                controlName = controlName.substring(0, Math.min(20, controlName.length));
                controlName = checkForSingleQuote(controlName);
                CN_Value = controlName.replace(/[^a-zA-Z0-9 ,]/g, "").trimStart();
                controlName = controlName.replace(/[^a-zA-Z0-9 ]/g, "").trimStart()
                controlId = "//" + node.nodeName + "[@text='" + CN_Value + "']";
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              } else if (node.getAttribute("content-desc") !== null) {
                controlName = node.getAttribute("content-desc").trim();
                controlId = "//" + node.nodeName + "[@content-desc='" + controlName + "']";
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              } else if (node.getAttribute("resource-id") !== null) {
                controlId = "//" + node.nodeName + "[@resource-id='" + node.getAttribute("resource-id").trim() + "']";
                controlIdentificationType = "ID";
                var controlNameList = node.getAttribute("resource-id").split(new RegExp("id/", "i"));
                if (controlNameList.length > 1 && controlName === "") {
                  controlName = controlNameList[1];
                }
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              } else if (node.getAttribute("class") !== null) {
                controlName = node.getAttribute("class").trim();
                controlId = "//" + node.nodeName + "[@class='" + controlName + "']";
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
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
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
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
              controlName = controlName.replace(/[^a-zA-Z0-9 ]/g, "").trimStart()
              if (/^\d/.test(controlName)) {
                controlName = `NUM_` + controlName;
              }
              if (controlName !== "") {
                var count = 0;

                // to remove dulpicates from page
                if (!controlNameLists.includes(controlName)) {
                  controlNameLists.push(controlName);
                }
                else {
                  controlNameLists.push(controlName)
                  if (controlNameLists.includes(controlName)) {
                    CNcount = 0;
                    var CN = controlName;
                    for (var m = 0; m < controlNameLists.length; m++) {
                      if (CN === controlNameLists[m])
                        CNcount++;
                    }
                    controlName = controlName + "_" + (CNcount);

                  }
                }
                CNcount = 0;
                dtControls.push({
                    ControlName: controlName,
                    ControlType: controlType,
                    ControlId: xpath,
                    Fingerprint: new XMLSerializer().serializeToString(node)
                });
              }
            }

          }
        }


        // Function to create and append the HTML table
        dtControls = [];
      }
      if (plateformOption === 'IOS') {
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
            } else if (node.nodeName === "XCUIElementTypeTextField" || node.nodeName === "XCUIElementTypeSecureTextField" || node.nodeName === "XCUIElementTypeSearchField" || node.nodeName === "XCUIElementTypeTextView" || node.nodeName === "XCUIElementTypeTextView" || node.nodeName === "XCUIElementTypeStaticText") {
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
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              }
              else if (node.getAttribute("value") !== null && node.getAttribute("value").trim() !== "") {
                controlName = node.getAttribute("value").trim();
                controlName = checkForSingleQuote(controlName);
                controlId = "//" + node.nodeName + "[@value=\"" + controlName + "\"]";
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              }
              else if (node.getAttribute("label") !== null && node.getAttribute("label").trim() !== "") {
                controlName = node.getAttribute("label").trim();
                controlId = "//" + node.nodeName + "[@label=\"" + controlName + "\"]";
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
                  controlIdList.push(controlId);
                  xpath = controlId;
                }
              }
              else {
                controlId = "//" + node.nodeName;
                if (controlIdList.includes(controlId)) {
                  controlIdList.push(controlId);
                  var CNcount = 0;
                  var CN_ID = controlId;
                  for (var k = 0; k < controlIdList.length; k++) {
                    if (CN_ID === controlIdList[k])
                      CNcount++;
                  }
                  xpath = "(" + controlId + ")[" + CNcount + "]";
                }
                else {
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
              controlName = controlName.replace(/[^a-zA-Z0-9 ]/g, "").trimStart()
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

              // to remove dulpicates from page
              if (!controlNameLists.includes(controlName)) {
                controlNameLists.push(controlName);
              }
              else {
                controlNameLists.push(controlName)
                if (controlNameLists.includes(controlName)) {
                  var CNcount = 0;
                  var CN = controlName;
                  for (var j = 0; j < controlNameLists.length; j++) {
                    if (CN === controlNameLists[j])
                      CNcount++;
                  }
                  controlName = controlName + "_" + (CNcount);

                }
              }

              dtControls.push({
                  ControlName: controlName,
                  ControlType: controlType,
                  ControlId: xpath,
                  Fingerprint: new XMLSerializer().serializeToString(node)
              });
            }

          }
        }
        dtControls = [];
      }
      function initResizableTable() {
          const resizers = document.querySelectorAll('.resizer');
          let startX, startWidth, currentResizer;

          resizers.forEach(resizer => {
              resizer.addEventListener('mousedown', (e) => {
                  currentResizer = resizer;
                  startX = e.clientX;
                  startWidth = currentResizer.parentElement.offsetWidth;

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
              });
          });

          function handleMouseMove(e) {
              const dx = e.clientX - startX;
              currentResizer.parentElement.style.width = `${startWidth + dx}px`;
          }

          function handleMouseUp() {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
          }
      }
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
    }
    else{
      document.getElementById('SamePageNameError').style.display = 'block'
      document.getElementById('overlay').style.display = 'block';
      document.getElementById("okay").addEventListener('click', async () => {
        document.getElementById('confirmationPopup').style.display = 'none'
        document.getElementById('SamePageNameError').style.display = 'none'
        document.getElementById('overlay').style.display = 'none';
      });
      correct_pageName = false;
    }
  }
  }
}
  }
}
catch(error){

  document.getElementById('div_status_bar').style.display = 'none'

  if (error.message.includes('unknown server-side error')) {
    document.getElementById('Error').style.display = 'block'
    document.getElementById('overlay').style.display = 'block';
    document.getElementById("ok_btn").addEventListener('click', async () => {
      document.getElementById('Error').style.display = 'none'
      document.getElementById('SamePageNameError').style.display = 'none'
      document.getElementById('overlay').style.display = 'none';
    });
            document.getElementById('download').disabled = false;
        document.getElementById('download').style.backgroundColor = '#4285F4'
  }
}

});


document.getElementById("download").addEventListener('click', async () => {
  if (tableCreated) {
    downloadTableAsJSON('myTable');
  }
});


function downloadTableAsJSON(tableId) {

      var correct_controlName = true;
      document.getElementById('sttus_bar_div').style.display = 'none';

      const now = new Date();
      const dateTime = now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0];

      var rows = document.querySelectorAll(`#${tableId} tr`);
      var uniqueRows = [];

      var dashboardControls = [];

      rows.forEach((row) => {

          var columns = row.querySelectorAll('td, th');

          if (columns.length < 10) return;

          var rowText =
              columns[0].innerText +
              columns[1].innerText +
              columns[2].innerText +
              columns[3].innerText;

          if (!uniqueRows.includes(rowText)) {

              uniqueRows.push(rowText);

              dashboardControls.push({

                  "CONTROL NAME": columns[0].innerText.trim(),
                  "CONTROL TYPE": columns[1].innerText.trim(),
                  "XPATH": columns[2].innerText.trim(),
                  "PAGE NAME": columns[3].innerText.trim(),
                  "IDENTIFICATION TYPE": columns[4].innerText.trim(),
                  "CONTROL VALUE": columns[5].innerText.trim(),
                  "FEATURE NAME": columns[6].innerText.trim(),
                  "NODE NAME": columns[7].innerText.trim(),

                  // Change this if your fingerprint is actual JSON
//                  "FINGERPRINT": columns[8].innerText
//                      ? columns[8].innerText
//                          .replace(/&lt;/g, "<")
//                          .replace(/&gt;/g, ">")
//                      : "",

                      "FINGERPRINT": "",

                  "APP URL": columns[9].innerText.trim()

              });

          }

      });

      var jsonContent = {
          "isRecordscenario": false,
          "dashboardControls": dashboardControls
      };

      var blob = new Blob(
          [JSON.stringify(jsonContent, null, 2)],
          {
              type: "application/json;charset=utf-8;"
          }
      );

      var url = URL.createObjectURL(blob);

      var a = document.createElement('a');
      a.href = url;

      var appName = document.getElementById('appname').value;

      a.download = appName + dateTime + ".json";

      if (correct_controlName) {
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }

      URL.revokeObjectURL(url);
  }


// actions to perform on clicking reset button
document.getElementById("reset").addEventListener('click', async () => {
  document.getElementById('confirmationPopup').style.display = 'block'
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
  if (plateformOption === 'Android') {
    deletePngFile(systemAppData)
  }
  else if (plateformOption === 'IOS') {
    deletePngFile(folderPath)
  }
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
var noResultsMessage = document.createElement('div'); // Create a div for the no results message
noResultsMessage.style.color = 'red'; // Style the message
noResultsMessage.style.display = 'none'; // Initially hide the message
noResultsMessage.innerText = 'No results found'; // Set the message text
table.parentNode.insertBefore(noResultsMessage, table.nextSibling); // Insert the message after the table

// Add event listener to the search box
searchBox.addEventListener('keyup', function () {
  var searchText = this.value.toLowerCase();
  var found = false; // Flag to check if any row is found

  // Iterate through each row in the table
  for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];

    // If the row contains the search text, make it visible
    if (row.innerText.toLowerCase().indexOf(searchText) > -1) {
      row.style.display = '';
      found = true; // Set the flag to true if a row is found
    } else {
      // Otherwise, hide the row
      row.style.display = 'none';
    }
  }

  // Check if any row was found
  if (!found) {
    noResultsMessage.style.display = ''; // Show the no results message
  } else {
    noResultsMessage.style.display = 'none'; // Hide the no results message
  }
});

const tableEl =
    document.getElementById(
        "myTable"
    );

tableEl.addEventListener(
    "click",
    onTableClick
);

tableEl.addEventListener("mouseover", onShowElementHover);
tableEl.addEventListener("mouseleave", onShowElementLeave);


//show element

async function onTableClick(e) {

    // DELETE ROW
    if (
        e.target.classList.contains(
            "deleteBtn"
        )
    ) {

        e.target
            .closest("tr")
            .remove();

        return;
    }

    // SHOW ELEMENT
    if (
        e.target.id &&
        e.target.id.startsWith(
            "info_"
        )
    ) {

        document.getElementById("split-div3").style.display = "block";
        const row =
            e.target.closest(
                "tr"
            );

        const xpath =
            row.querySelector(
                ".xpath"
            ).innerText.trim();

            if (
                xpath.startsWith(
                    "COORDINATE("
                )
            ) {

                const match =
                    xpath.match(
                        /COORDINATE\((\d+),(\d+)\)/
                    );

                if (match) {

                    const x =
                        parseInt(match[1]);

                    const y =
                        parseInt(match[2]);

                    showCoordinateMarker(
                        x,
                        y
                    );

                    return;
                }
            }

        console.log(
            "SHOW ELEMENT:",
            xpath
        );

        try {


            document.getElementById("split-div3").style.display = "block";
            document.getElementById("image-container_ss").style.display = "flex";
            document.getElementById("image-container_ss").style.justifyContent = "center";
            document.getElementById("image-container_ss").style.alignItems = "center";

            document.getElementById(
                    "image-container_ss"
                ).innerHTML = "";

            const el =
                await driver.findElement(
                    By.xpath(xpath)
                );

            const image =
                await el.takeScreenshot();

            let ss =
                document.getElementById(
                    "ss"
                );

            if (!ss) {

                ss =
                    document.createElement(
                        "img"
                    );

                ss.id = "ss";

                ss.style.width = "280px";      // increase width
                ss.style.height = "520px";     // increase height
                ss.style.objectFit = "contain";

                document
                    .getElementById(
                        "image-container_ss"
                    )
                    .appendChild(
                        ss
                    );
            }

            ss.src =
                "data:image/png;base64," +
                image;

                showElementHover = false;
                clearOverlay();

        }

        catch(err) {

            console.log(
                "Show Element Error:",
                err
            );

            alert(
                "Unable to locate element"
            );
        }
    }
}


async function onShowElementHover(e) {

    // Only work when mouse is over the XPath (Control ID) column
    const xpathCell = e.target.closest(".xpath");

    if (!xpathCell) {

        clearOverlay();
        return;
    }

    const xpath = xpathCell.innerText.trim();

    if (!xpath || xpath.startsWith("COORDINATE(")) {
        clearOverlay();
        return;
    }

    if (xpath === lastXPath) return;

    lastXPath = xpath;

    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(async () => {

        showElementHover = true;

        try {

            const element = await driver.findElement(By.xpath(xpath));

            const rect = await element.getRect();

            drawShowElementMarker(rect);

        } catch {

            clearOverlay();

        }

    }, 80);     // 50-100ms works well
}


function onShowElementLeave() {

    showElementHover = false;

    lastXPath = "";

    clearTimeout(hoverTimer);

    clearOverlay();

}



document.getElementById("platformname").addEventListener('change', async () => {
  prestart();
})

async function performTouch(x, y) {

    if (touchInProgress) {
        return;
    }

    touchInProgress = true;

    const container = document.getElementById("image-container");
    const globalOverlay = document.getElementById("overlay");
    const appRunningPopup = document.getElementById("AppRunningPopup");

    // 1. Force the global full-page layouts to stay hidden
    if (globalOverlay) globalOverlay.style.display = "none";
    if (appRunningPopup) appRunningPopup.style.display = "none";

    // 2. Safely build and attach the localized loader overlay element
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

        console.log("Touch:", x, y);

        await driver.executeScript(
            "mobile: tap",
            {
                x: x,
                y: y
            }
        );

        console.log("Touch Success");

        await driver.sleep(300);

        const image = await driver.takeScreenshot();

        require("fs").writeFileSync(
            `${folderPath}/image0.png`,
            image,
            "base64"
        );

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
        console.log("Touch Error:", err);
    } finally {
        // 3. Dismount the localized loader view cleanly
        const targetLoader = document.getElementById("localTouchLoader");
        if (targetLoader) {
            targetLoader.style.display = "none";
        }
        touchInProgress = false;
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
  if (plateformOption === 'IOS') {
    document.getElementById('pfVersion').style.display = "block"
    document.getElementById('automatione_name').style.display = "block"
    // document.getElementById('orgID').style.display = "block"
    // document.getElementById('signingID').style.display = "block"
    document.getElementById('bndlID').style.display = "block"
    document.getElementById('appPkg').style.display = "none"
    document.getElementById('appActvty').style.display = "none"
    document.getElementById('automatione_name').style.display = "block"

  }
  if (plateformOption === 'Android') {
    document.getElementById('pfVersion').style.display = "none"
    // document.getElementById('automatione_name').style.display = "none"
    // document.getElementById('orgID').style.display = "none"
    // document.getElementById('signingID').style.display = "none"
    document.getElementById('bndlID').style.display = "none"
    document.getElementById('appPkg').style.display = "block"
    document.getElementById('appActvty').style.display = "block"
    document.getElementById('automatione_name').style.display = "block"

  }
}

document.getElementById("add_empty_row").addEventListener('click', async () => {
  var pageName = document.getElementById('pagename_searchbox').value;
  addManualrow = {
    'ControlName': '',
    'ControlType': '',
    'ControlId': '',
    'pageName': pageName,
//    'showElement': 'show element'
  }
  var table = document.getElementById('myTable')
  var tableTopRow = table.insertRow(0);
  var row = `<tr>
          <td class="cn pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.ControlName}</td>
          <td class="ct pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.ControlType}</td>
          <td class="xpath pt-3-half" contenteditable="true" style ="max-width:160px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.ControlId}</td>
          <td class="page pt-3-half" contenteditable="true" style ="max-width:40px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.pageName}</td>
          <td class="identificationType pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;"></td>

          <td class="controlValue pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;"></td>

          <td class="featureName pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.pageName}</td>

          <td class="nodeName pt-3-half" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center;">${addManualrow.pageName}</td>

          <td class="fingerprint pt-3-half" contenteditable="true" style ="max-width:160px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center; display:none;"></td>
          <td class="appUrl pt-3-half"
              contenteditable="true"
              style="max-width:160px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black;text-align: center; display:none;">
          </td>
          <td style = "border-color:black"><img src="icon/icons8-delete_red.svg" alt="delete" class="deleteBtn" style = "margin-left: auto;margin-right: 1px;max-width:17px;overflow: hidden;cursor: pointer;-webkit-user-drag: none;"></td>
      </tr>`
  tableTopRow.innerHTML += row
  tableCreated = true;
  document.getElementById('table-container').style.display = "block"
});


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
document.getElementById("apppackage").addEventListener('click', async () => {
  document.getElementById("apppackage").style.borderColor = ''
})
document.getElementById("appactivity").addEventListener('click', async () => {
  document.getElementById("appactivity").style.borderColor = ''
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
          var pageName = document.getElementById('pagename_searchbox').value;
          var table = document.getElementById('myTable');
          for (var i = 0; i < dtControls.length; i++) {

              console.log("TABLE FP =", dtControls[i].Fingerprint);
              var tableTopRow = table.insertRow(0);
              td_id = i;
              var row = `<tr draggable="true">
                  <td class="cn pt-3-half" id="cn_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${dtControls[i].ControlName}</td>
                  <td class="ct pt-3-half" id="ct_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${dtControls[i].ControlType}</td>
                  <td class="xpath pt-3-half" id="xpath_${td_id}" contenteditable="true" style ="max-width:160px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${dtControls[i].ControlId}</td>
                  <td class="page pt-3-half" id="page_${td_id}" contenteditable="true" style ="max-width:40px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${pageName}</td>

                  <td class="identificationType pt-3-half" id="identificationType_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;"></td>

                  <td class="controlValue pt-3-half" id="controlValue_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;"></td>

                  <td class="featureName pt-3-half" id="featureName_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${pageName}</td>

                  <td class="nodeName pt-3-half" id="nodeName_${td_id}" contenteditable="true" style ="max-width:90px;overflow: hidden;white-space: nowrap;spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: center;">${pageName}</td>

                  <td class="fingerprint pt-3-half" id="fingerprint_${td_id}" contenteditable="true" style ="spellcheck:false;font-size: 11px;font-weight: 600;border-color: black; text-align: left; display:none;">${(dtControls[i].Fingerprint || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                  <td class="appUrl pt-3-half"
                      id="appUrl_${td_id}"
                      contenteditable="true"
                      style="display:none;">
                  </td>
                  <td class="delete-cell" style = "border-color:black"><img src="icon/icons8-delete_red.svg" id="del_${td_id}" alt="delete" class="deleteBtn" style = "margin-left: auto;margin-right: 1px;max-width:17px;overflow: hidden;cursor: pointer;-webkit-user-drag: none;"></td>
              </tr>`;
              tableTopRow.innerHTML += row;
          }
          tableCreated = true;
          document.getElementById('download').disabled = false;
          document.getElementById('download').style.backgroundColor = '#4285F4';
          document.getElementById('table-container').style.display = "block";
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


async function findIOSLocator(clickX, clickY){

        const pageName =
        document.getElementById("pagename_searchbox")
        .value
        .trim();

        if (pageName === "") {

            document.getElementById("pagename_searchbox").style.borderColor = "red";

            alert("Please enter Page Name.");

            return;

        }

        const nodes =
            window.xmlDoc.getElementsByTagName("*");

    let matchedNode = null;
    let smallestArea = Number.MAX_VALUE;

    for(let i = 0; i < nodes.length; i++){

        const node = nodes[i];

        const x = parseFloat(node.getAttribute("x"));
        const y = parseFloat(node.getAttribute("y"));
        const width = parseFloat(node.getAttribute("width"));
        const height = parseFloat(node.getAttribute("height"));

        if(
            isNaN(x) ||
            isNaN(y) ||
            isNaN(width) ||
            isNaN(height)
        ){
            continue;
        }

        if(
            clickX >= x &&
            clickX <= (x + width) &&
            clickY >= y &&
            clickY <= (y + height)
        ){
            console.log(
                node.nodeName,
                x,
                y,
                width,
                height
            );

            console.log(
                "CLICK INSIDE:",
                node.nodeName,
                node.getAttribute("name"),
                node.getAttribute("label")
            );

            if (
                node.nodeName === "XCUIElementTypeApplication" ||
                node.nodeName === "XCUIElementTypeWindow" ||
                (
                    node.nodeName === "XCUIElementTypeOther" &&
                    !node.getAttribute("name") &&
                    !node.getAttribute("label")
                )
            ){
                continue;
            }


            const hasName =
                node.getAttribute("name");

            const hasLabel =
                node.getAttribute("label");

            const hasValue =
                node.getAttribute("value");

        const allowedTypes = [
            "XCUIElementTypeButton",
            "XCUIElementTypeStaticText",
            "XCUIElementTypeTextField",
            "XCUIElementTypeSecureTextField",
            "XCUIElementTypeSearchField",
            "XCUIElementTypeImage",
            "XCUIElementTypeTextView",
            "XCUIElementTypeOther"
        ];

          if (
              allowedTypes.includes(node.nodeName) &&
              (
                  node.getAttribute("name") ||
                  node.getAttribute("label") ||
                  node.getAttribute("value")
              )
          ) {

              const area = width * height;



              if (area < smallestArea) {

                  smallestArea = area;
                  matchedNode = node;
              }
          }
        }
    }

    console.log(
        "FINAL MATCH:",
        matchedNode?.nodeName,
        matchedNode?.getAttribute("name"),
        matchedNode?.getAttribute("label")
    );
     if(!matchedNode){

            createAndAppendTable([
            {
                ControlName:
                    `Coordinate_${Math.round(clickX)}_${Math.round(clickY)}`,

                ControlType:
                    "Coordinate",

                ControlId:
                    `COORDINATE(${Math.round(clickX)},${Math.round(clickY)})`
            }
            ]);

            return;
        }

    console.log(
        "MATCHED:",
        matchedNode.nodeName,
        matchedNode.getAttribute("name"),
        matchedNode.getAttribute("label")
    );

   let controlName =
       matchedNode.getAttribute("name") ||
       matchedNode.getAttribute("value") ||
       matchedNode.getAttribute("label") ||
       matchedNode.nodeName;

let xpath = "";
let controlId = "";

if (
    matchedNode.getAttribute("name") &&
    matchedNode.getAttribute("name").trim() !== ""
) {

    const rawName =
        matchedNode.getAttribute("name").trim();

    controlId =
        "//" +
        matchedNode.nodeName +
        '[@name="' +
        rawName +
        '"]';

    xpath = controlId;
}
else if (
    matchedNode.getAttribute("value") &&
    matchedNode.getAttribute("value").trim() !== ""
) {

    controlId =
        "//" +
        matchedNode.nodeName +
        '[@value="' +
        matchedNode.getAttribute("value").trim() +
        '"]';

    xpath = controlId;
}
else if (
    matchedNode.getAttribute("label") &&
    matchedNode.getAttribute("label").trim() !== ""
) {

    controlId =
        "//" +
        matchedNode.nodeName +
        '[@label="' +
        matchedNode.getAttribute("label").trim() +
        '"]';

    xpath = controlId;
}
else {

    controlId =
        "//" + matchedNode.nodeName;

    xpath = controlId;
}

controlName = controlName.trim();

console.log(new XMLSerializer().serializeToString(matchedNode));

createAndAppendTable([
{
    ControlName: controlName,
    ControlType: matchedNode.nodeName.replace("XCUIElementType", ""),
    ControlId: xpath,
    Fingerprint: new XMLSerializer().serializeToString(matchedNode)
}
]);
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
      if (plateformOption === "Android") {
        fs.writeFileSync(
          path.join(systemAppData, `ss_${count}.png`),
          screenshot
        );
      } else if (plateformOption === "IOS") {
        fs.writeFileSync(`${folderPath}/ss_${count}.png`, screenshot);
      }

      let img = document.createElement("img");
      if (plateformOption === "Android") {
        img.src = path.join(systemAppData, `ss_${count}.png`);
      } else if (plateformOption === "IOS") {
        img.src = `${folderPath}/ss_${count}.png`;
      }
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

            console.error("IOS ELEMENT ERROR:");
            console.error(e);
            alert(e.message);
    } finally {
      loadingImage = false; // Reset loadingImage flag after image loading is complete or failed
      document.getElementById("div_status_bar_ss").style.display = "none";
    }
  }
});

document.getElementById("scrapeUI").addEventListener("click", async () => {

    dtControls = [];
    controlNameLists = [];

    const controlIdList = [];

    const xmlNodes = window.xmlDoc.getElementsByTagName("*");

    for (let i = 0; i < xmlNodes.length; i++) {

        const node = xmlNodes[i];

        const allowedTypes = [
            "XCUIElementTypeButton",
            "XCUIElementTypeStaticText",
            "XCUIElementTypeTextField",
            "XCUIElementTypeSecureTextField",
            "XCUIElementTypeSearchField",
            "XCUIElementTypeImage",
            "XCUIElementTypeTextView"
        ];

        if (!allowedTypes.includes(node.nodeName))
            continue;

        let controlName =
            node.getAttribute("name") ||
            node.getAttribute("label") ||
            node.getAttribute("value") ||
            node.nodeName;

        controlName = controlName.trim();

        let xpath = "";

        if (node.getAttribute("name")) {
            xpath = `//${node.nodeName}[@name="${node.getAttribute("name")}"]`;
        } else if (node.getAttribute("label")) {
            xpath = `//${node.nodeName}[@label="${node.getAttribute("label")}"]`;
        } else if (node.getAttribute("value")) {
            xpath = `//${node.nodeName}[@value="${node.getAttribute("value")}"]`;
        } else {
            xpath = `//${node.nodeName}`;
        }

        if (controlIdList.includes(xpath)) {
            let count = controlIdList.filter(x => x === xpath).length + 1;
            controlIdList.push(xpath);
            xpath = `(${xpath})[${count}]`;
        } else {
            controlIdList.push(xpath);
        }

        dtControls.push({
            ControlName: controlName,
            ControlType: node.nodeName,
            ControlId: xpath,
            Fingerprint: new XMLSerializer().serializeToString(node)
        });
    }

    const pageName =
    document.getElementById("pagename_searchbox")
    .value
    .trim();

    if(pageName === ""){

        document.getElementById("pagename_searchbox").style.borderColor = "red";

        alert("Please enter Page Name.");

        return;

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

    tokenInput.readOnly = true;

    // Decrypt the pasted token
    const decryptedToken = decryptData(encryptedToken);

    console.log("Result:", decryptedToken);

    // Save complete payload locally
    localStorage.setItem(
        "algoQAUser",
        JSON.stringify(decryptedToken)
    );

    localStorage.setItem(
        "algoQAUser",
        decryptedToken
    );

    console.log(
        "Saved Data:",
        localStorage.getItem("algoQAUser")
    );

    // Successful decryption
    if (decryptedToken && decryptedToken.length > 0) {

        tokenInput.style.display = "none";


        tokenStatus.style.display = "inline-block";
        tokenStatus.style.display = "block";
        document.getElementById("changeTokenBtn").style.display = "inline-block";
        tokenStatus.innerHTML = "✅ Connected";
        tokenStatus.style.backgroundColor = "#d4edda";
        tokenStatus.style.border = "1px solid #c3e6cb";
        tokenStatus.style.color = "#155724";

        document.getElementById("Run").disabled = false;
        document.getElementById("Run").style.backgroundColor = "#4285F4";

    } else {

        tokenInput.style.display = "none";
        document.getElementById("changeTokenBtn").style.display = "inline-block";

        tokenStatus.style.display = "inline-block";
        tokenStatus.style.display = "block";
        tokenStatus.innerHTML = "❌ Invalid Token";
        tokenStatus.style.backgroundColor = "#f8d7da";
        tokenStatus.style.border = "1px solid #f5c6cb";
        tokenStatus.style.color = "#721c24";

        setTimeout(() => {

            tokenStatus.style.display = "none";
            tokenStatus.style.display = "block";

            tokenInput.style.display = "inline-block";
            tokenInput.value = "";
            tokenInput.readOnly = false;
            tokenInput.focus();

        }, 2000);
    }
});

document.getElementById("algoQA")
.addEventListener("click", async () => {

    console.log(
        "LocalStorage Raw:",
        localStorage.getItem("algoQAUser")
    );

    const userData = JSON.parse(
        localStorage.getItem("algoQAUser")
    );

    if (!userData) {
        alert("Token data not found");
        return;
    }

    console.log("UserData:", userData);
    console.log("BaseUrl:", userData.baseUrl);
    console.log("UserID:", userData.userID);

    await sendTableDataToAPI("myTable");

});

async function sendTableDataToAPI(tableId) {

    const userData = JSON.parse(
        localStorage.getItem("algoQAUser")
    );

    if (!userData) {
        alert("Token data not found");
        return;
    }

    var rows = document.querySelectorAll(`#${tableId} tr`);
    var uniqueRows = [];
    var tableData = [];

    rows.forEach((row) => {

        const columns = row.querySelectorAll("td");

        if (columns.length < 9) return;

        var rowText =
            columns[0]?.innerText +
            columns[1]?.innerText +
            columns[2]?.innerText +
            columns[3]?.innerText +
            columns[6]?.innerText +
            columns[7]?.innerText +
            columns[8]?.innerText;

        if (!uniqueRows.includes(rowText)) {

            uniqueRows.push(rowText);

            tableData.push({

                "CONTROL NAME":
                    columns[0]?.innerText.trim(),

                "CONTROL TYPE":
                    columns[1]?.innerText.trim(),

                XPATH:
                    columns[2]?.innerText.trim(),

                "FEATURE NAME":
                    columns[6]?.innerText.trim(),

                "NODE NAME":
                    columns[7]?.innerText.trim(),

                "PAGE NAME":
                    columns[3]?.innerText.trim(),

                FINGERPRINT:
                      ""
//                    columns[8]?.innerHTML.trim()

            });
        }
    });

    if (tableData.length === 0) {
        alert("No scraped data found");
        return;
    }

    const payload = {

        data: tableData,

        userID: Number(userData.userID),

        baseUrl: userData.baseUrl,

        projectId: userData.project_id,

        launchUrl: userData.launchUrl,

        projectName: userData.project_name,

        applicationTypeId: Number(
            userData.application_type_id
        ),

        applicationType: "Mobile"

    };

    console.log("Payload:", payload);

    try {

        const endpoint =
            userData.project_id
                ? "saveReScraperData"
                : "MobileAutomationScraperData";

        const response = await fetch(
            `${userData.baseUrl}/project/${endpoint}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        const result = await response.json();

        console.log("API Response:", result);

        if (!response.ok) {
            throw new Error("API request failed");
        }

        alert("Scraped data shared successfully to AlgoQA");

        try {

            // Close Appium session
            if (driver) {

                await driver.quit();

                console.log(
                    "Appium session closed"
                );
            }

        } catch (err) {

            console.error(
                "Error closing session:",
                err
            );
        }

        // Close iOS simulator if running
        const { exec } = require("child_process");

        exec(
            "xcrun simctl shutdown all",
            (err) => {

                if (err) {

                    console.log(
                        "No simulator running"
                    );
                }

                console.log(
                    "Simulator shutdown completed"
                );

                // Close Electron app
                ipcRenderer.send("close-app");
            }
        );

    } catch (error) {

        console.error(
            "Error sending table data:",
            error
        );

        alert(
            "Failed to share data to AlgoQA"
        );
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

            screenshot.onclick = async function (e) {
                if (hasDragged) return;

                if (!tapMode) {
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

        // Also ensure table control state remains true so downloads work seamlessly
        tableCreated = true;

        clearOverlay();

    } catch (err) {
        console.log("Refresh Error:", err);
    } finally {
        // 3. Hide the screenshot wrapper loader layer safely
        const targetLoader = document.getElementById("localTouchLoader");
        if (targetLoader) {
            targetLoader.style.display = "none";
        }

        const finalScreenshot = document.getElementById("screenshot");
        if (!finalScreenshot) return;

        zoomLevel = 1;
        finalScreenshot.style.transition = "all 0.3s ease";
        finalScreenshot.style.width = BASE_WIDTH + "px";
        finalScreenshot.style.height = BASE_HEIGHT + "px";
        finalScreenshot.style.maxWidth = "none";
        finalScreenshot.style.maxHeight = "none";
        finalScreenshot.style.objectFit = "unset";
        finalScreenshot.style.display = "block";
        finalScreenshot.style.margin = "0 auto";
        finalScreenshot.style.transform = `scale(1) rotate(${rotation}deg)`;

        document.querySelector("#zoomInBtn + .toolTip").textContent = "Zoom In (100%)";
        document.querySelector("#zoomOutBtn + .toolTip").textContent = "Zoom Out (100%)";
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

    // Remove saved token
    localStorage.removeItem("algoQAToken"); // Replace with your actual key if different

    // Clear token
    tokenInput.value = "";

    // Show textbox again
    tokenInput.style.visibility = "visible";
    tokenInput.style.display = "inline-block";

    // Make sure it is editable
    tokenInput.disabled = false;
    tokenInput.readOnly = false;
    tokenInput.removeAttribute("disabled");
    tokenInput.removeAttribute("readonly");

    // Hide connected label
    document.getElementById("tokenStatus").style.display = "none";

    // Hide Change button
    changeTokenBtn.style.display = "none";

    // Disable Run button until token is validated again
    document.getElementById("Run").disabled = true;
    document.getElementById("Run").style.backgroundColor = "#B6B6B4";

    // Put cursor in textbox
    tokenInput.focus();
});

