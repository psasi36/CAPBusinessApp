/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";
var express = require("express");

module.exports = () => {
	var app = express.Router();
	//Hello Router
	app.get("/db", (req, res) => {
		let client = require("@sap/hana-client");
		//Lookup HANA DB Connection from Bound HDB Container Service
		const xsenv = require("@sap/xsenv");
		let hanaOptions = xsenv.getServices({
			hana: {
				tag: "hana"
			}
		});
		//Create DB connection with options from the bound service
		let conn = client.createConnection();
		var connParams = {
			serverNode: hanaOptions.hana.host + ":" + hanaOptions.hana.port,
			uid: hanaOptions.hana.user,
			pwd: hanaOptions.hana.password,
			CURRENTSCHEMA: hanaOptions.hana.schema
		};

		//connect
		conn.connect(connParams, (err) => {
			if (err) {
				res.type("text/plain").status(500).send(`ERROR: ${JSON.stringify(err)}`);
			} else {
				conn.exec(`SELECT SESSION_USER, CURRENT_SCHEMA FROM "DUMMY"`, (err, result) => {
					if (err) {
						res.type("text/plain").status(500).send(`ERROR: ${JSON.stringify(err)}`);
					} else {
						conn.disconnect();
						res.type("application/json").status(200).send(result);
					}
				});
			}
		});
	});

	//Simple Database Select Via Client Wrapper/Middelware - In-line Callbacks
	app.get("/express", (req, res) => {
		let client = req.db;
		client.prepare(
			`SELECT SESSION_USER, CURRENT_SCHEMA FROM "DUMMY"`,
			(err, statement) => {
				if (err) {
					res.type("text/plain").status(500).send("ERROR: " + err.toString());
				}
				statement.exec([],
					(err, results) => {
						if (err) {
							res.type("text/plain").status(500).send("ERROR: " + err.toString());
						} else {
							var result = JSON.stringify({
								Objects: results
							});
							res.type("application/json").status(200).send(result);
						}
					});
			});
	});

	app.get("/space", (req, res) => {
		let VCAP = JSON.parse(process.env.VCAP_APPLICATION);
		return res.type("application/json").status(200).send(JSON.stringify(VCAP.space_name));
	});

	app.get("/userinfo", function (req, res) {
		let xssec = require("@sap/xssec");
		let xsenv = require("@sap/xsenv");
		let accessToken;
		let authWriteScope = false;
		let authReadScope = false;
		let controllerAdminScope = true;
		let userInfo = {
			"user": req.user,
			"authInfo": req.authInfo,
			"scopes": []
		};

		function getAccessToken(req) {
			var accessToken = null;
			if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
				accessToken = req.headers.authorization.split(" ")[1];
			}
			return accessToken;
		}
		accessToken = getAccessToken(req);
		let uaa = xsenv.getServices({
			uaa: {
				tag: "xsuaa"
			}
		}).uaa;
		xssec.createSecurityContext(accessToken, uaa, function (error, securityContext) {
			if (error) {
				console.log("Security Context creation failed");
				return;
			}
			console.log("Security Context created successfully");
			userInfo.scopes = securityContext.scopes;
			console.log("Scope checked successfully");
		});
		return res.type("application/json").status(200).json(userInfo);
	});

	//Build the Security Context Via XSSEC
	app.get("/xssec", (req, res) => {
		let xssec = require("@sap/xssec");
		let xsenv = require("@sap/xsenv");
		let accessToken;

		function getAccessToken(req) {
			var accessToken = null;
			if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
				accessToken = req.headers.authorization.split(" ")[1];
			}
			return accessToken;
		}

		accessToken = getAccessToken(req);
		let uaa = xsenv.getServices({
			uaa: {
				tag: "xsuaa"
			}
		}).uaa;
		xssec.createSecurityContext(accessToken, uaa, function (error, securityContext) {
			if (error) {
				console.log("Security Context creation failed");
				return;
			}
			console.log("Security Context created successfully");
			res.type("application/json").status(200).send(JSON.stringify(securityContext));

		});
	});

	app.get("/hdb", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const statement = await dbConn.preparePromisified(
				`SELECT TOP 10 ID, TITLE, STOCK FROM MY_BOOKSHOP_BOOKS`
			);
			const results = await dbConn.statementExecPromisified(statement, []);
			let result = JSON.stringify({
				PurchaseOrders: results
			});
			return res.type("application/json").status(200).send(result);
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.get("/tables", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const statement = await dbConn.preparePromisified(
				`SELECT TABLE_NAME FROM M_TABLES 
				  WHERE SCHEMA_NAME = CURRENT_SCHEMA 
				    AND RECORD_COUNT > 0 `
			);
			const results = await dbConn.statementExecPromisified(statement, []);
			return res.type("application/json").status(200).send(JSON.stringify(results));
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.get("/views", async(req, res) => {
		try {
			const dbClass = require(global.__base + "utils/dbPromises");
			let dbConn = new dbClass(req.db);
			const statement = await dbConn.preparePromisified(
				`SELECT VIEW_NAME FROM VIEWS 
				  WHERE SCHEMA_NAME = CURRENT_SCHEMA 
				    AND (VIEW_TYPE = 'ROW' or VIEW_TYPE = 'CALC')`
			);
			const results = await dbConn.statementExecPromisified(statement, []);
			return res.type("application/json").status(200).send(JSON.stringify(results));
		} catch (err) {
			return res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
		}
	});

	app.get("/os", (req, res) => {
		var os = require("os");
		var output = {};

		output.tmpdir = os.tmpdir();
		output.endianness = os.endianness();
		output.hostname = os.hostname();
		output.type = os.type();
		output.platform = os.platform();
		output.arch = os.arch();
		output.release = os.release();
		output.uptime = os.uptime();
		output.loadavg = os.loadavg();
		output.totalmem = os.totalmem();
		output.freemem = os.freemem();
		output.cpus = os.cpus();
		output.networkInfraces = os.networkInterfaces();

		var result = JSON.stringify(output);
		res.type("application/json").status(200).send(result);
	});

	app.get("/osUser", (req, res) => {
		var exec = require("child_process").exec;
		exec("whoami", (err, stdout, stderr) => {
			if (err) {
				res.type("text/plain").status(500).send(`ERROR: ${err.toString()}`);
				return;
			} else {
				res.type("text/plain").status(200).send(stdout);
			}
		});
	});

	return app;
};