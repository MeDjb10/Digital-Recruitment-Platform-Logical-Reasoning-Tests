const bcrypt = require("bcrypt");
const saltRounds = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(inputPassword, storedHash) {
  return await bcrypt.compare(inputPassword, storedHash);
}

module.exports = { hashPassword, comparePasswords };
