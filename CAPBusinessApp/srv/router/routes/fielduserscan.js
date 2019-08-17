/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;

module.exports = () => {
	var app = express.Router();
	app.use(express.json());
	app.get("/getFieldUserScanCount", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT USERID FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			if (resultsCustomer.length > 0) {
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT EXPIRYDAYS FROM "DEVICE" WHERE DEVICEID IN (SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?) 
						ORDER BY LASTCONNECTEDDATE DESC LIMIT 1;`
					);
					const results = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].USERID]);
					const expiryDays = results[0].EXPIRYDAYS;
					return res.type("text/plain").status(200).send(expiryDays + "");
				} catch (err) {
					return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
				}
			}
			return res.type("text/plain").status(200).send(0 + "");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/getDeviceStatus/:id", async(req, res) => {
		console.log("Akbar the great");
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const iDeviceID = req.params.id;
			let oCurrDateTime = new Date().toISOString();
			console.log(iDeviceID);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT USERID,FIRSTNAME,LASTNAME,CHROMEEXTID,CHROMEAPPID FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			if (resultsCustomer.length > 0) {
				if (iDeviceID <= 0) {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT DEVICEID,EXPIRATIONDATE,DEVICESTATUS,PROJECTNAME,VERSIONNUMBER,LASTTESTSCANDATE,
							SERIALNUMBER,DEVICETYPE FROM "DEVICE" WHERE DEVICEID IN (SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?) 
							ORDER BY LASTCONNECTEDDATE DESC LIMIT 1;`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].USERID]);
						var oScan = {};
						if (resultsDevices.length > 0) {
							oScan.DeviceID = resultsDevices[0].DEVICEID;
							oScan.ExpirationDate = resultsDevices[0].EXPIRATIONDATE;
							oScan.DeviceStatus = resultsDevices[0].DEVICESTATUS;
							oScan.ProjectName = resultsDevices[0].PROJECTNAME;
							oScan.VersionNumber = resultsDevices[0].VERSIONNUMBER;
							oScan.LastScanDate = resultsDevices[0].LASTTESTSCANDATE;
							oScan.Name = resultsCustomer[0].FIRSTNAME + " " + resultsCustomer[0].LASTNAME;
							oScan.Connection = "OFF";
							oScan.SerialNumber = resultsDevices[0].SERIALNUMBER;
							oScan.DeviceType = resultsDevices[0].DEVICETYPE;
							oScan.ChromeExtID = resultsCustomer[0].CHROMEEXTID;
							oScan.ChromeAppID = resultsCustomer[0].CHROMEAPPID;
						}
						return res.type("application/json").status(200).send(oScan);
					} catch (err) {
						return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
					}
				} else {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT DEVICEID,EXPIRATIONDATE,DEVICESTATUS,PROJECTNAME,VERSIONNUMBER,LASTTESTSCANDATE,SERIALNUMBER, 
							LASTCONNECTEDDATE,FIRMWAREDATETOUPDATE,MODELDATETOUPDATE,DEVICETYPE FROM "DEVICE" WHERE DEVICEID = ?;`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [iDeviceID]);
						console.log(resultsDevices);
						var oScan = {};
						if (resultsDevices.length > 0) {
							oScan.DeviceID = resultsDevices[0].DEVICEID;
							oScan.ExpirationDate = resultsDevices[0].EXPIRATIONDATE;
							oScan.DeviceStatus = resultsDevices[0].DEVICESTATUS;
							oScan.ProjectName = resultsDevices[0].PROJECTNAME;
							oScan.VersionNumber = resultsDevices[0].VERSIONNUMBER;
							oScan.LastScanDate = resultsDevices[0].LASTTESTSCANDATE;
							oScan.Name = resultsCustomer[0].FIRSTNAME + " " + resultsCustomer[0].LASTNAME;
							oScan.Connection = "ON";
							oScan.SerialNumber = resultsDevices[0].SERIALNUMBER;
							oScan.DeviceType = resultsDevices[0].DEVICETYPE;
							oScan.ChromeExtID = resultsCustomer[0].CHROMEEXTID;
							oScan.ChromeAppID = resultsCustomer[0].CHROMEAPPID;
							if (resultsDevices[0].FIRMWAREDATETOUPDATE < oCurrDateTime && resultsDevices[0].LASTCONNECTEDDATE < resultsDevices[0].FIRMWAREDATETOUPDATE) {
								oScan.FirmwareMessage = bundle.getText("firmwareUpdate", [os.hostname(), os.type()]);
								oScan.FirmWareUpdateRequired = true;
								const statement = await dbConn.preparePromisified(
									`UPDATE "DEVICE" SET FIRMWAREUPDATEREQUIRED =? WHERE DEVICEID=?;`
								);
								const values = [1, iDeviceID];
								await dbConn.statementExecPromisified(statement, values);
							}
							if (resultsDevices[0].MODELDATETOUPDATE < oCurrDateTime && resultsDevices[0].LASTCONNECTEDDATE < resultsDevices[0].MODELDATETOUPDATE) {
								oScan.ModelMessage = bundle.getText("modelUpdate", [os.hostname(), os.type()]);
								oScan.ModelUpdateRequired = true;
								const statement = await dbConn.preparePromisified(
									`UPDATE "DEVICE" SET MODELUPDATEREQUIRED =? WHERE DEVICEID=?;`
								);
								const values = [1, iDeviceID];
								await dbConn.statementExecPromisified(statement, values);
							}
						}
						return res.type("application/json").status(200).send(oScan);
					} catch (err) {
						return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
					}
				}
			} else {
				var oRespObjSel = {
					message: bundle.getText("noCustomerAssigned", [os.hostname(), os.type()]),
					success: false
				};
			}
			return res.type("application/json").status(200).send(oRespObjSel);

		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/getAvailableDevices", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT USERID,FIRSTNAME,LASTNAME FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			console.log(resultsCustomer);

			if (resultsCustomer.length > 0) {
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT DEVICEID,LASTCONNECTEDDATE,DEVICESTATUS,PROJECTNAME,SERIALNUMBER 
							FROM "DEVICE" WHERE DEVICEID IN (SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?) 
							ORDER BY LASTCONNECTEDDATE DESC;`
					);
					const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].USERID]);
					var aAvailableDevices = [];
					if (resultsDevices.length > 0) {
						for (var i = 0; i < resultsDevices.length; i++) {
							var oDevice = {};
							oDevice.DeviceID = resultsDevices[i].DEVICEID;
							oDevice.DeviceStatus = resultsDevices[i].DEVICESTATUS;
							oDevice.ProjectName = resultsDevices[i].PROJECTNAME;
							oDevice.SerialNumber = resultsDevices[i].SERIALNUMBER;
							oDevice.LastScanDate = resultsDevices[i].LASTCONNECTEDDATE;
							aAvailableDevices.push(oDevice);
						}
					}
					return res.type("application/json").status(200).send(aAvailableDevices);
				} catch (err) {
					return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
				}
			} else {
				var oRespObjSel = {
					message: bundle.getText("noCustomerAssigned", [os.hostname(), os.type()]),
					success: false
				};
			}
			return res.type("application/json").status(200).send(oRespObjSel);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});
	app.get("/getCustomerParams/:DeviceID/:ScanID", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			const util = require(global.__base + "utils/util");
			let dbConn = new dbClass(req.db);
			const sDeviceID = req.params.DeviceID;
			const sScanID = req.params.ScanID;
			let oCurrDateTime = new Date().toISOString();
			console.log(sDeviceID + "\n" + sScanID);
			const statement = await dbConn.preparePromisified(
				`SELECT CUSTOMER_CUSTOMERID FROM "DEVICE" WHERE DEVICEID = ?;`
			);
			const results = await dbConn.statementExecPromisified(statement, [sDeviceID]);
			if (results.length > 0) {
				try {
					const statementCust = await dbConn.preparePromisified(
						`SELECT CHANNEL1, CHANNEL2, CHANNEL3, CHANNEL4, CHANNEL5, CHANNEL6, PARAM1, PARAM2,
						PARAM3, PARAM4, OUTCOME FROM "CUSTOMER" WHERE CUSTOMERID = ?;`
					);
					const resultsParamCust = await dbConn.statementExecPromisified(statementCust, [results[0].CUSTOMER_CUSTOMERID]);
					console.log(resultsParamCust);
					var oParam = resultsParamCust.length > 0 ? resultsParamCust[0] : {};
					const statementDataset = await dbConn.preparePromisified(
						`SELECT DATASET FROM "SCANLOG" WHERE SCANLOGID = ?;`
					);
					const resultsDataset = await dbConn.statementExecPromisified(statementDataset, [sScanID]);
					var oDataset = resultsDataset.length > 0 ? JSON.parse(resultsDataset[0].DATASET) : {};
					var oJSONObj = util.getCustomerDataset(oParam, oDataset);
					return res.type("application/json").status(200).send(oJSONObj);
				} catch (err) {
					return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
				}
			} else {
				var oRespObjSel = {
					message: bundle.getText("noCustomerAssigned", [os.hostname(), os.type()]),
					success: false
				};
			}
			return res.type("application/json").status(200).send(oRespObjSel);

		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post("/getScanStatus", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			const util = require(global.__base + "utils/util");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			const sEmail = req.user ? req.user.id : "WebIDE";
			var oJSONObj = util.convertScanStringtoJSON(oReqObj.scanData, oReqObj.deviceType);

			let oCurrDateTime = new Date().toISOString();
			const statement = await dbConn.preparePromisified(
				`INSERT INTO "SCANLOG" (DEVICE_DEVICEID, SAMPLENAME, RESULT, SCANTYPE, LOCATION, GPSLAT, GPSLONG, DATASET, CREATEDBY, CREATEDDATE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? ,?);`
			);
			const values = [oReqObj.deviceID, oReqObj.sampleName, oJSONObj.Status, oReqObj.scanType, oReqObj.location, oReqObj.gpsLat, oReqObj.gpsLong,
				JSON.stringify(oJSONObj), sEmail, oCurrDateTime
			];
			const results = await dbConn.statementExecPromisified(statement, values);
			const statementSelect = await dbConn.preparePromisified(
				`SELECT SCANLOGID FROM "SCANLOG" WHERE CREATEDBY = ? AND CREATEDDATE = ?;`);
			const resultsSelect = await dbConn.statementExecPromisified(statementSelect, [sEmail, oCurrDateTime]);
			var sScanLogID = "";
			if (resultsSelect.length > 0) {
				sScanLogID = resultsSelect[0].SCANLOGID;
			}
			var oRespObj = {};
			oRespObj.scanLogID = sScanLogID;
			oRespObj.Scan = oReqObj.sampleName;
			oRespObj.Status = oJSONObj.Status;
			return res.type("application/json").status(200).send(oRespObj);

		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});
	
	app.put("/updateChrExtAppIDs", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			let sUser = req.user ? req.user.id : "WebIDE",
			oCurrDateTime = new Date().toISOString(),
			sUpdQuery = 'UPDATE "USER" SET CHROMEEXTID = ?, CHROMEAPPID = ?, MODIFIEDBY = ?, MODIFIEDDATE = ? WHERE EMAIL = ?';
			console.log("sUser is "+sUser +" and DateTime "+oCurrDateTime);
			const updStatement = await dbConn.preparePromisified(sUpdQuery);
			const updResults = await dbConn.statementExecPromisified(updStatement, [oReqObj.ExtID, oReqObj.AppID, sUser, oCurrDateTime, sUser]);
			return res.type("application/json").status(200).send(oReqObj);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});
	return app;
};