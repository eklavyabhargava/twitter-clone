const express = require("express");
const app = express();
const { router } = require("../controller/AuthUser");

app.use("/auth", router);
module.exports = app;
