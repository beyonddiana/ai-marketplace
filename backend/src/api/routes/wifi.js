const express = require("express");
const router = express.Router();
const sequelize = require("../../config/database");
const axios = require("axios");
const xml = require("xml");
const qs = require("qs");
const ChildProcess = require("child_process");
const jsdom = require("jsdom");
const Regions = require("../../models/Regions");
const Tokens = require("../../models/Tokens");
const { JSDOM } = jsdom;
const {
  regionConsoles,
  setConsole,
  uuidRegex,
  returnError,
  checkAuth,
} = require("../util");

fs = require("fs");
const lineReader = require("line-reader");

const { isUserLoggedIn } = require("../util.js");

const { bin_location } = require("../../config");

router.post("/login", async (req, res) => {
  try {
    const { firstname, lastname, password } = req.body;

    for (const property in req.body) {
      if (
        typeof req.body[property] === "object" &&
        req.body[property] !== null
      ) {
        throw new Error("Incorrect params");
      }
    }
    console.log(req.body);
    console.log(firstname, lastname, password);

    const consoleSession = regionConsoles[8002];

    const response = await axios({
      method: "post",
      url: `${consoleSession.getFullAddress()}/wifi/login`,
      data: qs.stringify({
        firstname,
        lastname,
        password,
        METHOD: "login",
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
    const dom = new JSDOM(response.data);
    const value = dom.window.document.querySelector("a").href.split("?sid=")[1];
    console.log(value);
    if (value === undefined) {
      throw new Error("Incorrect params");
    }
    let token = await Tokens.findOne({
      where: { token: value },
      attributes: ["validity"],
    });

    let validity = Date.parse(token.dataValues.validity.toString());

    let validityDate = new Date(validity);
    console.log("Date: " + validityDate.toUTCString());
    res.cookie("sid", value, { maxAge: 30 * 60 * 1000 }).sendStatus(201);
  } catch (e) {
    return returnError(e, res);
  }
});

router.get("/map", checkAuth, async (req, res) => {
  try {
    const { x, y, zoom } = req.query;
    console.log(x, y, zoom);
    if (x === undefined) {
      throw new Error("Incorrect params");
    }
    if (y === undefined) {
      throw new Error("Incorrect params");
    }
    if (zoom === undefined) {
      throw new Error("Incorrect params");
    }
    console.log(req.query);

    res.writeHead(200, { "Content-Type": "image/jpeg" });

    let response = await axios
      .get(`http://25.5.144.194:8002/map-${zoom}-${x}-${y}-objects.jpg`, {
        responseType: "arraybuffer",
      })
      .then(function (response) {
        return Buffer.from(response.data, "binary").toString("base64");
      });
    return res.end("data:image/jpeg;base64," + response);
  } catch (e) {
    return returnError(e, res);
  }
});

router.get("/region/get", checkAuth, async (req, res) => {
  try {
    let { method } = req.query;

    if (method === undefined) {
      wifi = "SQL";
    }

    let response = ["0"];

    if (wifi === "files") {
      fs.readdirSync(`${bin_location}/opensim`).forEach((file) => {
        console.log(file);
        if (file === "region_1") {
          lineReader.eachLine(
            `${bin_location}/opensim/${file}/regions/regions.ini`,
            (line) => {
              // If line is not a comment
              if (line.replace(" ", "")[0] === ";") {
              }
              console.log(line);
            }
          );
        }
      });
      /*
      const consoleSession = regionConsoles[8002];

      const response2 = await axios({
        method: "post",
        url: consoleSession.getFullAddress() + "/SessionCommand/",
        data: qs.stringify({
          ID: consoleSession.consoleID,
          COMMAND: "show regions",
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });
      const response = axios({
        method: "post",
        url:
          consoleSession.getFullAddress() +
          "/ReadResponses/" +
          consoleSession.consoleID,
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      res.send(await response.data);


      let test_string =
        "1363:normal:Name ID Position Owner ID Flags cis499server c78c5e0c-fc23-4501-8235-f28192bccad3 1000,1000 f577aa90-7db9-4a77-afc2-6daee8916c3e RegionOnline cis499server1 c78c5e0c-fc23-4501-8235-f28192bccad4 1001,1000 f577aa90-7db9-4a77-afc2-6daee8916c3e RegionOnline cis499server2 c78c5e0c-fc23-4501-8235-f28192bccad5 1000,1001 f577aa90-7db9-4a77-afc2-6daee8916c3e RegionOnline cis499server3 c78c5e0c-fc23-4501-8235-f28192bccad6 1001,1001 f577aa90-7db9-4a77-afc2-6daee8916c3e RegionOnline ";

      // Prepare String for parsing
      test_string = test_string.replace(
        test_string.substring(0, test_string.indexOf("Name")),
        ""
      );
      response = [];

      // Extract Headers
      let headers = test_string
        .substring(0, test_string.indexOf("Flags") + 5)
        .split(" ");
      test_string = test_string.replace(headers.join(" ") + " ", "");

      //Start Loop here
      while (test_string !== "") {
        let charIndex = test_string.search(uuidRegex);
        let name = test_string.substring(0, charIndex - 1);
        test_string = test_string.replace(name + " ", "");
        let id = test_string.substring(0, test_string.indexOf(" "));
        test_string = test_string.replace(id + " ", "");
        let coords = test_string.substring(0, test_string.indexOf(" "));
        test_string = test_string.replace(coords + " ", "");
        let ownerID = test_string.substring(0, test_string.indexOf(" "));
        test_string = test_string.replace(ownerID + " ", "");
        let flags = test_string.substring(0, test_string.indexOf(" "));
        test_string = test_string.replace(flags + " ", "");
        let region = {
          name,
          id,
          coords,
          ownerID,
          flags,
        };
        response.push(region);
      }
      */
    } else {
      response = await Regions.findAll({
        attributes: [
          "regionName",
          "owner_uuid",
          "serverHttpPort",
          "serverURI",
          "serverPort",
          "locX",
          "locY",
          "sizeX",
          "sizeY",
        ],
      });
    }

    res.json(response);
  } catch (e) {
    return returnError(e, res);
  }
});

router.post("/region/create", checkAuth, async (req, res) => {
  try {
    const { name, port, vport, folderName, gridIP, delay } = req.body;
    console.log(req.body);
    // Run: .\addRegion.ps1 –GridIP x.x.x.x –RegionFolder “FolderName” –RegionName “My Region” –Port “9000” –Vport “6599” –Delay “123”
    //const consoleSession = regionConsoles[8002];
    //const gridIP = consoleSession.address;
    //const folderName = "Regions";
    //const delay = 100;
    let command = `.\\addRegion.ps1 –GridIP ${gridIP} –RegionFolder "${folderName}" –RegionName "${name}" –Port "${port}" –Vport "${vport}" –Delay "${delay}"`;
    console.log(command);

    // Run Command
    ChildProcess.exec(
      command,
      { shell: "powershell.exe" },
      (error, stdout, stderr) => {
        if (error) {
          console.error("exec error: ", error);
          return;
        }
        console.log("stdout: ", stdout);
        console.log("stderr: ", stderr);
      }
    );

    res.sendStatus(201);
  } catch (e) {
    return returnError(e, res);
  }
});

router.post("/region/cancel", checkAuth, async (req, res) => {
  try {
    res.send("Test");
  } catch (e) {
    return returnError(e, res);
  }
});

module.exports = router;
