/*eslint no-console: 0, no-undef: 0, no-unused-vars: 0, no-shadow: 0, quotes: 0, no-use-before-define: 0, new-cap:0 */
'use strict';

module.exports = {
	createIASUser: function (req, callback) {
		return (createIASUser(req.body, callback));
	},
	updateIASUser: function (req, callback) {
		return (updateIASUser(req.body, callback));
	}
};

const request = require('request'); // HTTP Client
const Route = require("../dests/Destination"); // destinations management
const usersEntity = "Users";
// Load IAS route and destination (as defined in dests/dest-app.json file)
var IASRoute = null;
var IASDest = null;
Route.getRoute("IAS").then(r => {
	IASRoute = r;
	console.log("IASRoute " + IASRoute.target.name);

	// Load IAS destination
	IASRoute.getDestination().then(dest => {
		console.log("Destination in IAS API is" + JSON.stringify(dest));
		IASDest = dest;
	});
});

/**
 * Create IAS User
 * @param {*} body 
 * @param {*} callback 
 */
function createIASUser(body, callback) {
	console.log("in create ias api " + JSON.stringify(body));
	var sGroupName, options = {}
	options.url = IASDest.destinationConfiguration.URL + IASRoute.target.entryPath + usersEntity;
	options.method = "POST";
	options.headers = {
		'Authorization': "Basic " + IASDest.authTokens[0].value,
		'Content-Type': 'application/scim+json'
	};

	if (body.PowerUser === 1) {
		sGroupName = "CAP_Power_User";
	} else {
		sGroupName = "CAP_End_User";
	}

	options.body = {
		"userName": body.Email.toLowerCase(),
		"name": {
			"givenName": body.FirstName,
			"familyName": body.LastName,
			"middleName": "",
			"honorificPrefix": ""
		},
		"emails": [{
			"value": body.Email.toLowerCase()
		}],
		"addresses": [],
		"phoneNumbers": [{
			"value": body.Phone,
			"type": "mobile"
		}],
		"locale": "",
		"timeZone": "",
		"groups": [{
			"value": sGroupName
		}],
		"displayName": body.FirstName + " " + body.LastName,
		"contactPreferenceEmail": "yes",
		"contactPreferenceTelephone": "yes",
		"company": "Sun Chemical",
		"department": "",
		"active": body.UserStatus === "Active" ? true : false,
		"sendMail": "true",
		"mailVerified": "false",
		"telephoneVerified": "false",
	};
	options.body = JSON.stringify(options.body);
	console.log("URL is: " + JSON.stringify(options.url));
	console.log("BODY is: " + options.body);
	request(options, function (error, response, body) {
		if (error) {
			console.error("IASRequest Error : " + JSON.stringify(response));
			callback(error);
		} else {
			console.log("IASRequest Success : " + JSON.stringify(response))
			callback(error, response, body);
		}
	});
}

/**
 * Update IAS User
 * @param {*} body 
 * @param {*} callback 
 */
function updateIASUser(body, callback) {
	console.log("in update ias api " + JSON.stringify(body));
	var sGroupName, options = {},
		oPayload = {
			"id": body.IASUserID
		};
	options.url = IASDest.destinationConfiguration.URL + IASRoute.target.entryPath + usersEntity + "/" + body.IASUserID;
	options.method = "PUT";
	options.headers = {
		'Authorization': "Basic " + IASDest.authTokens[0].value,
		'Content-Type': 'application/scim+json'
	};
	console.log("in update ias api " + JSON.stringify(options.url));
	Object.keys(body).forEach(function (key) {
		if (key === "FirstName") {
			oPayload.name = {
				"givenName": body.FirstName
			}
		}
		if (key === "LastName") {
			oPayload.name = {
				"familyName": body.LastName
			}
		}
		if (key === "UserStatus") {
			oPayload.active = body.UserStatus === "Active" ? true : false
		}
		if (key === "Phone") {
			oPayload.phoneNumber = [{
				"value": body.Phone,
				"type": "mobile"
			}];
			oPayload.telephoneVerified = "false";
		}
		if (key === "PowerUser" || key === "EndUser") {
			if (body.PowerUser === 1) {
				sGroupName = "CAP_Power_User";
			} else {
				sGroupName = "CAP_End_User";
			}
			oPayload.groups = [{
				"value": sGroupName
			}];
		}
	});
	options.body = JSON.stringify(oPayload);
	console.log("BODY is: " + options.body);
	request(options, function (error, response, body) {
		if (error) {
			console.error("IASRequest Error : " + JSON.stringify(response));
			callback(error);
		} else {
			console.log("IASRequest Success : " + JSON.stringify(response))
			callback(error, response, body);
		}
	});
}