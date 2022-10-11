import * as shell from "shelljs";
import dotenv from 'dotenv';
dotenv.config();

// Copy static files to dist folder
shell.cp("-R", ["src/views", "src/assets"], "dist/");

// Copy SSL key and certificate to dist folder
try {
	shell.cp("-R", [
		process.env.SSL_CERT_SRC_DIR + '/' + process.env.SSL_KEY,
		process.env.SSL_CERT_SRC_DIR + '/' + process.env.SSL_CERT
	], 'dist/');
} catch (err) {
	throw new Error(`SSL Key/Cert not found (${err})`);
}
