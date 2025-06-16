/**
 * Configuration Index
 * Exports all configuration modules
 */

const env = require("./env");
const database = require("./database");
const swagger = require("./swagger.config");

module.exports = {
  env,
  database,
  swagger,
};
