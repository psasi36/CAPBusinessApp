/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;

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
			var oValidationObj = validationUtil.isValidPayload("CUSTOMER", oReqObj);
			if(oValidationObj.IsValid){
				let oCurrDateTime = new Date().toISOString(),
				sCreatedBy= req.user ? req.user.id:"WebIDE";
				const statement = await dbConn.preparePromisified(
					`INSERT INTO "CUSTOMER" (CUSTOMERNAME, STREETADDRESS, CITY, STATE, ZIP, COUNTRY, 
					CHANNEL1, CHANNEL2, CHANNEL3, CHANNEL4, CHANNEL5, CHANNEL6, PARAM1, PARAM2, PARAM3, PARAM4, 
					OUTCOME, EXPIRYDAYS, LIFECYCLEDAYS, CREATEDBY, CREATEDDATE)  
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
				);
				
				const values = [oReqObj.CustomerName, oReqObj.StreetAddress, oReqObj.City, oReqObj.State, oReqObj.Zip, oReqObj.Country, oReqObj.Channel1,
					oReqObj.Channel2, oReqObj.Channel3, oReqObj.Channel4, oReqObj.Channel5, oReqObj.Channel6,
					oReqObj.Param1, oReqObj.Param2, oReqObj.Param3, oReqObj.Param4, oReqObj.Outcome, oReqObj.ExpiryDays, oReqObj.LifeCycleDays, sCreatedBy, oCurrDateTime
				];
				const results = await dbConn.statementExecPromisified(statement, values);
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT CUSTOMERID FROM "CUSTOMER" WHERE CREATEDBY = ? AND CREATEDDATE = ?;`);
					const results = await dbConn.statementExecPromisified(statement, [oReqObj.CreatedBy, oCurrDateTime]);
					var sCustID = "";
					if (results.length > 0) {
						sCustID = results[0].CUSTOMERID;
					}
					var oRespObj = {
						"CustomerID": sCustID
					};
					return res.type("application/json").status(200).send(oRespObj);
				} catch (err) {
					return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
				}
			}else{
				var sMsg = oValidationObj.MissingFields + " " + bundle.getText("mandatoryFiledsErrMsg", [os.hostname(), os.type()]);
				return res.type("text/plain").status(400).send("ERROR:"+sMsg);
			}
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});
	return app;
};