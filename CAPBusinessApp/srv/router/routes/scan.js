/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express");

module.exports = () => {
	var app = express.Router();
	app.get("/getScanTileCount", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const oReqObj = req.body;
			const statement = await dbConn.preparePromisified(
				`SELECT EXPIRYDAYS FROM "DEVICE" ORDER BY LASTCONNECTEDDATE DESC LIMIT 1`
			);
			const results = await dbConn.statementExecPromisified(statement, []);
			const expiryDays = results[0].EXPIRYDAYS;
			return res.type("text/plain").status(200).send(expiryDays+"");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: "+JSON.stringify(err));
		}
	});
	return app;
};