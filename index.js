const express = require("express");
const cors = require("cors");
const connectDb = require("./db");
const morgan = require("morgan");
const path = require("path");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();

app.set("trust proxy", 2);

const PORT = process.env.PORT;

// get logs
const logger = morgan(
  ":remote-addr :user-agent :referrer :method :url :status :res[content-length] - :response-time ms"
);

connectDb();

require("./models/user_model");
require("./models/tweet_model");
const User = mongoose.model("User");
const Tweet = mongoose.model("Tweet");

const contentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: "GET, POST, PUT, DELETE",
    optionSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(logger);

app.use(
  "/profile",
  contentLimiter,
  express.static(path.join(__dirname, "./images"))
);
app.get("/ip", (request, response) => response.send(request.ip));
app.use("/api", apiLimiter, require("./routes/authenticate"));
app.use("/api", apiLimiter, require("./routes/userRoute"));
app.use("/api", apiLimiter, require("./routes/tweetRoute"));

// API: get profile picture
app.get("/:userId/profile-pic", contentLimiter, async (req, res) => {
  try {
    // find user and return user's profile image
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.set("Content-Type", "image/jpeg");
    res.sendFile(path.join(__dirname, "./images", user.profilePic));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

// API: get tweet images
app.get("/post-image/:tweetId", contentLimiter, async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      return res.status(404).send("Image not found");
    }
    res.set("Content-Type", "image/jpeg");
    res.sendFile(path.join(__dirname, "./post", tweet.image));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
