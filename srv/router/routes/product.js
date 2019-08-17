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
			var oValidationObj = validationUtil.isValidPayload("PRODUCT", oReqObj);
			if(oValidationObj.IsValid){
				let oCurrDateTime = new Date().toISOString(),
				sCreatedBy= req.user ? req.user.id:"WebIDE";
				const statement = await dbConn.preparePromisified(
					`INSERT INTO "PRODUCT" (PRODUCTNAME, CUSTOMER_CUSTOMERID, CREATEDBY, CREATEDDATE)  
					VALUES (?, ?, ?, ?);`
				);
				const values = [oReqObj.ProductName, oReqObj.CustomerID, sCreatedBy, oCurrDateTime];
				const results = await dbConn.statementExecPromisified(statement, values);
				return res.type("application/json").status(200).send(oReqObj);
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