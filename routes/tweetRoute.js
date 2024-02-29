const express = require("express");
const app = express();
const verifyLogin = require("../middleware/verifyLogin");
const tweetHandler = require("../controller/TweetController");

app.use(verifyLogin);
app.use("/tweet", tweetHandler);

module.exports = app;
