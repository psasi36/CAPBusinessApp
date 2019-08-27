{
	"_Name": "MDKListApp",
	"Version": "/MDKListApp/Globals/AppDefinition_Version.global",
	"MainPage": "/MDKListApp/Pages/Main.page",
	"OnLaunch": [
		"/MDKListApp/Actions/Service/InitializeOffline.action"
	],
	"OnWillUpdate": "/MDKListApp/Rules/OnWillUpdate.js",
	"OnDidUpdate": "/MDKListApp/Actions/Service/InitializeOffline.action",
	"Styles": "/MDKListApp/Styles/Styles.css",
	"SDKStyles": "/MDKListApp/Styles/SDKStyles.nss",
	"Localization": "/MDKListApp/i18n/i18n.properties"
}