/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	fileUpload = require('express-fileupload'),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;

module.exports = () => {
	var app = express.Router();
	app.use(express.json());
	app.get("/getCustomerDevice", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT USERID,CUSTOMER_CUSTOMERID,QCUSER,POWERUSER FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			console.log(resultsCustomer);

			if (resultsCustomer.length > 0) {
				if (resultsCustomer[0].POWERUSER === 1) {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT SCANLOGID,SAMPLENAME,RESULT,GPSLAT,GPSLONG,DATASET,DEVICE_DEVICEID,CREATEDBY,CREATEDDATE
						FROM "SCANLOG" WHERE DEVICE_DEVICEID IN (SELECT DEVICEID FROM "DEVICE" WHERE CUSTOMER_CUSTOMERID = ?);`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].CUSTOMER_CUSTOMERID]);
						var aScanLogs = [];
						if (resultsDevices.length > 0) {
							for (var i = 0; i < resultsDevices.length; i++) {
								var oScanLog = {};
								oScanLog.ScanLogID = resultsDevices[i].SCANLOGID;
								oScanLog.SampleName = resultsDevices[i].SAMPLENAME;
								oScanLog.Result = resultsDevices[i].RESULT;
								oScanLog.GPSLat = resultsDevices[i].GPSLAT;
								oScanLog.GPSLong = resultsDevices[i].GPSLONG;
								oScanLog.Dataset = resultsDevices[i].DATASET;
								oScanLog.Device_DeviceID = resultsDevices[i].DEVICE_DEVICEID;
								oScanLog.CreatedBy = resultsDevices[i].CREATEDBY;
								oScanLog.CreatedDate = resultsDevices[i].CREATEDDATE;
								aScanLogs.push(oScanLog);
							}
						}
						return res.type("application/json").status(200).send(aScanLogs);
					} catch (err) {
						return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
					}
				} else {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT SCANLOGID,SAMPLENAME,RESULT,GPSLAT,GPSLONG,DATASET,DEVICE_DEVICEID,CREATEDBY,CREATEDDATE
						FROM "SCANLOG" WHERE DEVICE_DEVICEID IN (SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?);`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].USERID]);
						var aScanLogs = [];
						if (resultsDevices.length > 0) {
							for (var i = 0; i < resultsDevices.length; i++) {
								var oScanLog = {};
								oScanLog.ScanLogID = resultsDevices[i].SCANLOGID;
								oScanLog.SampleName = resultsDevices[i].SAMPLENAME;
								oScanLog.Result = resultsDevices[i].RESULT;
								oScanLog.GPSLat = resultsDevices[i].GPSLAT;
								oScanLog.GPSLong = resultsDevices[i].GPSLONG;
								oScanLog.Dataset = resultsDevices[i].DATASET;
								oScanLog.Device_DeviceID = resultsDevices[i].DEVICE_DEVICEID;
								oScanLog.CreatedBy = resultsDevices[i].CREATEDBY;
								oScanLog.CreatedDate = resultsDevices[i].CREATEDDATE;
								aScanLogs.push(oScanLog);
							}
						}
						return res.type("application/json").status(200).send(aScanLogs);
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

	app.get("/getPowerUserScanLogCount", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT USERID,CUSTOMER_CUSTOMERID,QCUSER,POWERUSER FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			console.log(resultsCustomer);

			if (resultsCustomer.length > 0) {
				if (resultsCustomer[0].POWERUSER === 1) {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT DEVICEID FROM "DEVICE" WHERE CUSTOMER_CUSTOMERID = ?;`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].CUSTOMER_CUSTOMERID]);
						const count = resultsDevices.length > 0 ? resultsDevices.length : 0;
						return res.type("text/plain").status(200).send(count + "");
					} catch (err) {
						return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
					}
				} else {
					try {
						const statement = await dbConn.preparePromisified(
							`SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?;`
						);
						const resultsDevices = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].USERID]);
						const count = resultsDevices.length > 0 ? resultsDevices.length : 0;
						return res.type("text/plain").status(200).send(count + "");
					} catch (err) {
						return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
					}
				}
			}
			return res.type("text/plain").status(200).send(0 + "");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	return app;
};