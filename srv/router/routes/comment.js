/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express");

module.exports = () => {
	var app = express.Router();
	app.use(express.json());
	app.post("/create", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			let oCurrDateTime = new Date().toISOString(),
			sCreatedBy = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`INSERT INTO "COMMENT" (COMMENTS, CREATEDBY, CREATEDDATE, DEVICE_DEVICEID)  
				VALUES (?, ?, ?, ?);`
			);
			const values = [oReqObj.Comments, sCreatedBy, oCurrDateTime, oReqObj.Device_DeviceID];
			const results = await dbConn.statementExecPromisified(statement, values);
			return res.type("application/json").status(200).send(oReqObj);
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});
	return app;
};