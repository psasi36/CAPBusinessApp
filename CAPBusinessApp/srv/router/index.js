/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0, new-cap:0*/
/*eslint-env node, es6 */

"use strict";

module.exports = (app, server) => {
	app.use('/api/db', require('./routes/db')());
};