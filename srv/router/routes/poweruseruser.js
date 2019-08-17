/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express"),
	fileUpload = require('express-fileupload'),
	os = require("os"),
	TextBundle = require("@sap/textbundle").TextBundle;

module.exports = () => {
	var app = express.Router();
	app.use(express.json());
	app.get("/getUserCustomer/:id", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.params.id
			const statement = await dbConn.preparePromisified(
				`SELECT CUSTOMER_CUSTOMERID FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			console.log(resultsCustomer);
			if (resultsCustomer.length > 0) {
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT * FROM "CUSTOMER" WHERE CUSTOMERID = ?;`);
					const results = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].CUSTOMER_CUSTOMERID]);

					return res.type("application/json").status(200).send(results);
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

	app.get("/getTotalUsers/:customerId", async(req, res) => {
		try {
			var bundle = new TextBundle(global.__base + "_i18n/i18n", require(global.__base + "utils/util").getLocale(req));
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const iCustomerId = req.params.customerId
			const statement = await dbConn.preparePromisified(
				`SELECT COUNT(*) AS COUNT FROM "USER" WHERE CUSTOMER_CUSTOMERID = ?;`
			);
			const results = await dbConn.statementExecPromisified(statement, [iCustomerId]);
			const count = results[0].COUNT;
			return res.type("application/json").status(200).send(count + "");
		} catch (err) {
			return res.type("text/plain").status(500).send("ERROR: " + JSON.stringify(err));
		}
	});

	app.get("/getPowerUserUserCount", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const sEmail = req.user ? req.user.id : "WebIDE";
			const statement = await dbConn.preparePromisified(
				`SELECT CUSTOMER_CUSTOMERID FROM "USER" WHERE EMAIL = ?;`
			);
			const resultsCustomer = await dbConn.statementExecPromisified(statement, [sEmail]);
			console.log(resultsCustomer);
			if (resultsCustomer.length > 0) {
				try {
					const statement = await dbConn.preparePromisified(
						`SELECT Count(*) AS COUNT from "USER" WHERE CUSTOMER_CUSTOMERID=? AND USERSTATUS=?`
					);
					const results = await dbConn.statementExecPromisified(statement, [resultsCustomer[0].CUSTOMER_CUSTOMERID, "Active"]);
					const expiryDays = results[0].COUNT;
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

	return app;
};