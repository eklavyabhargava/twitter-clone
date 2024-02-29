const express = require("express");
const verifyLogin = require("../middleware/verifyLogin");
const userHandler = require("../controller/UserController");
const app = express();

app.use(verifyLogin);
app.use("/user", userHandler);

module.exports = app;
