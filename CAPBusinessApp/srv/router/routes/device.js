/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	fileUpload = require('express-fileupload'),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;
module.exports = () => {
	var app = express.Router();
	// default options
	app.use(express.json());
	app.use(fileUpload());
	app.post('/modelupload', async(req, res) => {
		if (Object.keys(req.files).length == 0) {
			return res.status(400).send('No files were uploaded.');
		}
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			var modelFile = req.files.modelFile,
				sFileName = modelFile.name,
				sFileType = modelFile.mimetype,
				sBuffer = modelFile.data,
				oReqObj = req.body,
				oCurrDateTime = new Date().toISOString();
			const statement = await dbConn.preparePromisified(
				`INSERT INTO "DEVICEMODELHISTORY" (MODELNAME, VERSIONNUMBER, FILENAME, FILETYPE, MODELBINARY, CREATEDBY, CREATEDDATE, DEVICE_DEVICEID) 
					VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
			);
			const values = [oReqObj.ModelName, oReqObj.VersionNumber, sFileName, sFileType, sBuffer, oReqObj.CreatedBy, oCurrDateTime, oReqObj.DeviceID];
			const results = await dbConn.statementExecPromisified(statement, values);
			return res.type("text/plain").status(200).send("Uploaded Successfully");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	// default options
	app.post('/firmwareupload', async(req, res) => {
		if (Object.keys(req.files).length == 0) {
			return res.status(400).send('No files were uploaded.');
		}
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			var firmwareFile = req.files.firmwareFile,
				sFileName = firmwareFile.name,
				sFileType = firmwareFile.mimetype,
				sBuffer = firmwareFile.data,
				oReqObj = req.body,
				oCurrDateTime = new Date().toISOString();
			const statement = await dbConn.preparePromisified(
				`INSERT INTO "DEVICEFIRMWAREHISTORY" (VERSIONNUMBER, FILENAME, FILETYPE, FIRMWAREBINARY, CREATEDBY, CREATEDDATE, DEVICE_DEVICEID) 
					VALUES (?, ?, ?, ?, ?, ?, ?);`
			);
			const values = [oReqObj.VersionNumber, sFileName, sFileType, sBuffer, oReqObj.CreatedBy, oCurrDateTime, oReqObj.DeviceID];
			const results = await dbConn.statementExecPromisified(statement, values);
			return res.type("text/plain").status(200).send("Uploaded Successfully");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post('/firmwaredownload', async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const statement = await dbConn.preparePromisified(
				`SELECT FILENAME, FILETYPE, FIRMWAREBINARY FROM "DEVICEFIRMWAREHISTORY" WHERE DEVICEFIRMWAREHISTORYID = ?;`);
			var oReqObj = req.body;
			const results = await dbConn.statementExecPromisified(statement, [oReqObj.DeviceFirmwareHistoryID]);
			var sFileName, sFileType, sFileContent = "";
			if (results.length > 0) {
				sFileName = results[0].FILENAME;
				sFileType = results[0].FILETYPE;
				sFileContent = results[0].FIRMWAREBINARY;
			}
			var oRespObj = {
				"FileName": sFileName,
				"FileType": sFileType,
				"File": sFileContent.toString('base64')
			};
			return res.type("application/json").status(200).send(oRespObj);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post('/modeldownload', async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const statement = await dbConn.preparePromisified(
				`SELECT FILENAME, FILETYPE, MODELBINARY FROM "DEVICEMODELHISTORY" WHERE DEVICEMODELHISTORYID = ?;`);
			var oReqObj = req.body;
			const results = await dbConn.statementExecPromisified(statement, [oReqObj.DeviceModelHistoryID]);
			var sFileName, sFileType, sFileContent = "";
			if (results.length > 0) {
				sFileName = results[0].FILENAME;
				sFileType = results[0].FILETYPE;
				sFileContent = results[0].MODELBINARY;
			}
			var oRespObj = {
				"FileName": sFileName,
				"FileType": sFileType,
				"File": sFileContent.toString('base64')
			};
			return res.type("application/json").status(200).send(oRespObj);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post("/create", async(req, res) => {
		try {
			const util = require(global.__base + "utils/util");
			const dbClass = require(global.__base + "utils/dbPromises");
			const validationUtil = require(global.__base + "utils/validation");
			var bundle = new TextBundle(global.__base + "_i18n/i18n", util.getLocale(req));
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			let oCurrDateTime = new Date().toISOString(),
				sCreatedBy = req.user ? req.user.id : "WebIDE";
			const statementSelect = await dbConn.preparePromisified(
				`SELECT * FROM "DEVICE" WHERE SERIALNUMBER = ?;`);
			const resultsSel = await dbConn.statementExecPromisified(statementSelect, [oReqObj.SerialNumber]);
			if (resultsSel.length > 0) {
				var oRespObjSel = {
					message: bundle.getText("serialNumberDuplicate", [os.hostname(), os.type()])
				};
				return res.type("application/json").status(400).send(oRespObjSel);
			} else {
				const statementConfig = await dbConn.preparePromisified(
					`SELECT VALUE FROM "CONFIGURATION" WHERE KEY = ?;`
				);
				const resultsConfig = await dbConn.statementExecPromisified(statementConfig, ["ENCRYPTION_KEY_DEVICEPASSWORD"]);
				const sEncryKey = resultsConfig.length > 0 ? resultsConfig[0].VALUE : "v4000";
				var oValidationObj = validationUtil.isValidPayload("DEVICE", oReqObj);
				var sEncryptedPassword = util.getEncryptedDevicePassword(sEncryKey, oReqObj.Param1);
				console.log("Encryption Key and Password "+sEncryKey +" and "+ sEncryptedPassword);
				if (oValidationObj.IsValid) {
					const statementInsert = await dbConn.preparePromisified(
						`INSERT INTO "DEVICE" (SERIALNUMBER, DEVICESTATUS, ACTIVITYSTATUS, QCUSER, VERSIONNUMBER, PROJECTNAME, 
					EXPIRYDAYS, LIFECYCLEDAYS, MODELNAME, MODELVERSION, DEVICETYPE, EXPIRATIONDATE, DEACTIVATIONDATE, LASTTESTSCANDATE, LASTCONNECTEDDATE, LASTCONNECTEDBY, LASTUPDATEDDATE, 
					LASTUPDATEDBY, FIRMWAREDATETOUPDATE, FIRMWAREUPDATEREQUIRED, MODELDATETOUPDATE, MODELUPDATEREQUIRED, PARAM1, CREATEDBY, CREATEDDATE, MODIFIEDBY, MODIFIEDDATE,
					PRODUCTID, CUSTOMER_CUSTOMERID)  
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
					);
					const values = [oReqObj.SerialNumber, oReqObj.DeviceStatus, oReqObj.ActivityStatus, oReqObj.QCUser, oReqObj.VersionNumber,
						oReqObj.ProjectName, oReqObj.ExpiryDays, oReqObj.LifeCycleDays, oReqObj.ModelName, oReqObj.ModelVersion, oReqObj.DeviceType, oReqObj.expirationDate,
						oReqObj.deactivationDate,
						oReqObj.lastTestScanDate, oReqObj.lastConnectedDate,
						oReqObj.lastConnectedBy, oReqObj.lastUpdatedDate, oReqObj.lastUpdatedBy, oReqObj.firmwareDateToUpdate, oReqObj.firmwareUpdateRequired,
						oReqObj.modelDateToUpdate, oReqObj.modelUpdateRequired, sEncryptedPassword, sCreatedBy, oCurrDateTime, oReqObj.ModifiedBy,
						oCurrDateTime, oReqObj.ProductID, oReqObj.CustomerID
					];
					const resultsInsert = await dbConn.statementExecPromisified(statementInsert, values);
					const statement = await dbConn.preparePromisified(
						`SELECT DEVICEID FROM "DEVICE" WHERE CREATEDBY = ? AND CREATEDDATE = ?;`);
					const results = await dbConn.statementExecPromisified(statement, [sCreatedBy, oCurrDateTime]);
					var sDeviceID = "";
					if (results.length > 0) {
						sDeviceID = results[0].DEVICEID;
					}
					var oRespObjInsert = {
						"DeviceID": sDeviceID,
						"SerialNumber": oReqObj.SerialNumber
					};
					return res.type("application/json").status(200).send(oRespObjInsert);
				} else {
					var sMsg = oValidationObj.MissingFields + " " + bundle.getText("mandatoryFiledsErrMsg", [os.hostname(), os.type()]);
					return res.type("text/plain").status(400).send("ERROR:" + sMsg);
				}
			}
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.post("/deviceusers", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const deviceID = req.body.DeviceID;
			let oCurrDateTime = new Date().toISOString();
			const statement = await dbConn.preparePromisified(
				`Select u.USERID, u.USERNAME, U.FIRSTNAME, u.LASTNAME, u.USERSTATUS, du.CREATEDDATE from "USER" u, "DEVICE_USER" du
					Where u.USERID = du.USERID and du.DEVICEID = ?;`
			);
			const results = await dbConn.statementExecPromisified(statement, [deviceID]);
			return res.type("application/json").status(200).send(results);
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.post("/adddeviceuser", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			let oCurrDateTime = new Date().toISOString();
			const statement = await dbConn.preparePromisified(
				`INSERT INTO "DEVICE_USER" (DEVICEID, USERID, CREATEDBY, CREATEDDATE) VALUES (?, ?, ?, ?);`
			);
			const values = [oReqObj.DeviceId, oReqObj.UserID, oReqObj.CreatedBy, oCurrDateTime];
			const results = await dbConn.statementExecPromisified(statement, values);
			try {
				const statement = await dbConn.preparePromisified(
					`SELECT * FROM "DEVICE_USER" WHERE DEVICEID = ?;`);
				const results = await dbConn.statementExecPromisified(statement, [oReqObj.DeviceId]);

				return res.type("application/json").status(200).send(results);
			} catch (err) {
				return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
			}
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.post("/getdeviceunassignedusers", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			const statement = await dbConn.preparePromisified(
				`SELECT USERID, USERNAME, FIRSTNAME, LASTNAME,EMAIL, USERSTATUS from "USER" where CUSTOMER_CUSTOMERID = ? and USERID not in (Select USERID from "DEVICE_USER" where DEVICEID=?);`
			);
			const results = await dbConn.statementExecPromisified(statement, [oReqObj.CustomerId, oReqObj.DeviceId]);

			return res.type("application/json").status(200).send(results);
		} catch (err) {
			return res.type("text/plain").status(500).send("Error:" + JSON.stringify(err));
		}
	});
	
	app.get("/getDecryptedDevicePassword/:pwd", async(req, res) => {
		try {
			const util = require(global.__base + "utils/util");
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sPwd = req.params.pwd;
			const statementConfig = await dbConn.preparePromisified(
				`SELECT VALUE FROM "CONFIGURATION" WHERE KEY = ?;`
			);
			const resultsConfig = await dbConn.statementExecPromisified(statementConfig, ["ENCRYPTION_KEY_DEVICEPASSWORD"]);
			const sEncryKey = resultsConfig.length > 0 ? resultsConfig[0].VALUE : "v4000";
			var sDecryptedPassword = util.getDecryptedDevicePassword(sEncryKey, sPwd);
			console.log("Encryption Key and Password "+sEncryKey +" and "+ sDecryptedPassword);
			return res.type("text/plain").status(200).send(sDecryptedPassword+"");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: "+JSON.stringify(err));
		}
	});

	return app;
};