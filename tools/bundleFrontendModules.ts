import * as shell from "shelljs";

// Bundle/Browserify the frontend scripts in the production folder
shell.exec("browserify dist/events/Scripts.js > dist/events/ScriptsBundled.js");
