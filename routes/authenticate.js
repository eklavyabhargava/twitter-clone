const express = require("express");
const app = express();
const authUser = require("../controller/AuthUser");

app.use("/auth", authUser);
module.exports = app;
