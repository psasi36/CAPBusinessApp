/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	fileUpload = require('express-fileupload'),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;
const IASUtil = require(global.__base + "utils/IAS-API");

module.exports = () => {
	var app = express.Router();
	app.use(express.json());
	app.post("/create", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			const validationUtil = require(global.__base + "utils/validation");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			var oValidationObj = validationUtil.isValidPayload("USER", oReqObj);
			if (oValidationObj.IsValid) {
				let oCurrDateTime = new Date().toISOString(),
					sCreatedBy = req.user ? req.user.id : "WebIDE";
				const getStatement = await dbConn.preparePromisified(
					`SELECT Count(*) AS COUNT from "USER" WHERE LOWER("EMAIL") = LOWER(?);`
				);
				const getResults = await dbConn.statementExecPromisified(getStatement, [oReqObj.Email]);
				if (getResults.length > 0 && getResults[0].COUNT > 0) {
					var oRespObjSel = {
						message: bundle.getText("userDuplicate", [os.hostname(), os.type()])
					};
					return res.type("application/json").status(400).send(oRespObjSel);
				} else {
					const statement = await dbConn.preparePromisified(
						`INSERT INTO "USER" (USERNAME, FIRSTNAME, LASTNAME, EMAIL, PHONE, USERSTATUS, 
						QCUSER, POWERUSER, SUPERADMIN, CUSTOMER_CUSTOMERID, CREATEDBY, CREATEDDATE)  
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
					);
					const values = [oReqObj.UserName.toLowerCase(), oReqObj.FirstName, oReqObj.LastName, oReqObj.Email.toLowerCase(), oReqObj.Phone,
						oReqObj.UserStatus, oReqObj.QCUser,
						oReqObj.PowerUser, oReqObj.SuperAdmin, oReqObj.CustomerID, sCreatedBy, oCurrDateTime
					];
					const results = await dbConn.statementExecPromisified(statement, values);
					if (oReqObj.CreateIASUser) {
						IASUtil.createIASUser(req, async function (error, response, body) {
							if (response.statusCode == 201) {
								var oBody = JSON.parse(body);
								console.log("IAS Id is " + oBody.id);
								const IASUpdStatement = await dbConn.preparePromisified(
									`UPDATE "USER" SET "IASUSERID" = ? WHERE "CREATEDBY" = ? AND "CREATEDDATE" = ?;`
								);
								const results = await dbConn.statementExecPromisified(IASUpdStatement, [oBody.id, sCreatedBy, oCurrDateTime]);
								return res.type("application/json").status(200).send(oReqObj);
							} else if (response.statusCode == 409) {
								var oRespObjSel = {
									message: bundle.getText("userDuplicateIAS", [os.hostname(), os.type()])
								};
								return res.type("application/json").status(409).send(oRespObjSel);
							} else {
								var oRespObjSel = {
									message: bundle.getText("userCreateErrorIAS", [os.hostname(), os.type()])
								};
								return res.type("application/json").status(400).send(oRespObjSel);
							}
						});
					} else {
						return res.type("application/json").status(200).send(oReqObj);
					}
				}
			} else {
				var sMsg = oValidationObj.MissingFields + " " + bundle.getText("mandatoryFiledsErrMsg", [os.hostname(), os.type()]);
				return res.type("text/plain").status(400).send("ERROR:" + sMsg);
			}
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.put("/update", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			let sKey, sModifiedBy = req.user ? req.user.id : "WebIDE",
				oCurrDateTime = new Date().toISOString(),
				aHistValues = [sModifiedBy, oCurrDateTime, oReqObj.UserID],
				aReqVals = [],
				aValues = [],
				sUpdQuery = 'UPDATE "USER" SET ';
			Object.keys(oReqObj).forEach(function (key) {
				if (key !== "UserID" && key !== "Email") {
					sKey = key;
					sUpdQuery += '"' + key.toUpperCase() + '" = ?,';
					aReqVals.push(oReqObj[sKey]);
				}
			});
			sUpdQuery += ' "MODIFIEDBY" = ?, "MODIFIEDDATE" = ? WHERE "USERID" = ?';
			console.log("query " + sUpdQuery);
			aValues = aReqVals.concat(aHistValues);
			const updStatement = await dbConn.preparePromisified(sUpdQuery);
			const updResults = await dbConn.statementExecPromisified(updStatement, aValues);

			const selStatement = await dbConn.preparePromisified(
				`SELECT "IASUSERID" FROM "USER" WHERE "USERID" = ?;`
			);
			const selResults = await dbConn.statementExecPromisified(selStatement, [oReqObj.UserID]);
			if (selResults.length > 0) {
				req.body.IASUserID = selResults[0].IASUSERID;
				IASUtil.updateIASUser(req, function (error, response) {
					if (response.statusCode == 200) {
						return res.type("application/json").status(200).send(oReqObj);
					} else {
						var oRespObjSel = {
							message: bundle.getText("updateUserError", [os.hostname(), os.type()])
						};
						return res.type("application/json").status(400).send(oRespObjSel);
					}
				});
			} else {
				var oRespObjSel = {
					message: bundle.getText("updateUserError", [os.hostname(), os.type()])
				};
				return res.type("application/json").status(400).send(oRespObjSel);
			}
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/isUserSuperAdmin", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT SUPERADMIN FROM "USER" WHERE EMAIL = ?;`
			);
			const results = await dbConn.statementExecPromisified(statement, [sEmail]);
			var bIsUserSuperAdmin = false;
			if (results.length > 0) {
				bIsUserSuperAdmin = results[0].SUPERADMIN == 1 ? true : false;
			}
			var oRespObj = {
				"SuperAdmin": bIsUserSuperAdmin ? true : false
			};
			return res.type("application/json").status(200).send(oRespObj);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post("/createUserHistory", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			const validationUtil = require(global.__base + "utils/validation");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			var oValidationObj = validationUtil.isValidPayload("USER_HISTORY", oReqObj);
			if (oValidationObj.IsValid) {
				let oCurrDateTime = new Date().toISOString(),
					sCreatedBy = req.user ? req.user.id : "WebIDE";
				const statement = await dbConn.preparePromisified(
					`INSERT INTO "USERHISTORY" (USER_USERID, FIELDNAME, OLDVALUE, NEWVALUE, CREATEDBY, CREATEDDATE)  
					VALUES (?, ?, ?, ?, ?, ?);`
				);
				const values = [oReqObj.UserID, oReqObj.FieldName, oReqObj.OldValue, oReqObj.NewValue, sCreatedBy, oCurrDateTime];
				const results = await dbConn.statementExecPromisified(statement, values);
				return res.type("application/json").status(200).send(oReqObj);
			} else {
				var sMsg = oValidationObj.MissingFields + " " + bundle.getText("mandatoryFiledsErrMsg", [os.hostname(), os.type()]);
				return res.type("text/plain").status(400).send("ERROR:" + sMsg);
			}
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.post("/createIASUser", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const oReqObj = req.body;
			IASUtil.createIASUser(req, function (error, response) {
				if (response.statusCode == 201) {
					return res.type("application/json").status(200).send(oReqObj);
				} else if (response.statusCode == 409) {
					var oRespObjSel = {
						message: bundle.getText("userDuplicateIAS", [os.hostname(), os.type()])
					};
					return res.type("application/json").status(409).send(oRespObjSel);
				} else {
					var oRespObjSel = {
						message: bundle.getText("userCreateErrorIAS", [os.hostname(), os.type()])
					};
					return res.type("application/json").status(400).send(oRespObjSel);
				}
			});
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/getUserDevice/:id", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const iUserID = req.params.id;
			console.log(iUserID);
			if (iUserID > 0) {
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT * FROM "DEVICE" WHERE DEVICEID IN (SELECT DEVICEID FROM "DEVICE_USER" WHERE USERID = ?) ;`
					);
					const resultsDevices = await dbConn.statementExecPromisified(statement, [iUserID]);
					var aDevices = [];
					for (var i = 0; i < resultsDevices.length; i++) {
						var oDevice = {};
						oDevice.SerialNumber = resultsDevices[i].SERIALNUMBER;
						oDevice.ExpirationDate = resultsDevices[i].EXPIRATIONDATE;
						oDevice.LastConnectedDate = resultsDevices[i].LASTCONNECTEDDATE;
						oDevice.DeviceStatus = resultsDevices[i].DEVICESTATUS;
						oDevice.ProjectName = resultsDevices[i].PROJECTNAME;
						oDevice.VersionNumber = resultsDevices[i].VERSIONNUMBER;
						aDevices.push(oDevice);
					}
					return res.type("application/json").status(200).send(aDevices);
				} catch (err) {
					return res.type("text/plain").status(500).send("ERROR" + JSON.stringify(err));
				}
			}
			return res.type("application/json").status(200).send(oRespObjSel);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/getUserRoles", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const util = require(global.__base + "utils/util");
			const sUser = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT QCUSER, POWERUSER, SUPERADMIN FROM "USER" WHERE EMAIL = ?;`
			);
			const resultUser = await dbConn.statementExecPromisified(statement, [sUser]);
			var oRespObj = util.getUserRoles(resultUser);
			console.log("REsp is " + JSON.stringify(oRespObj));
			return res.type("application/json").status(200).send(oRespObj);
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});
	return app;
};