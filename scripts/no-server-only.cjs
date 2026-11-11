// Permite usar módulos marcados con "server-only" desde scripts de Node (tareas programadas).
const Module = require("module");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./empty.cjs");
  return resolve.call(this, request, ...rest);
};
