const express = require("express");
const cors = require("cors");
const connectDb = require("./db");
const morgan = require("morgan");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
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

app.use(cors());
app.use(express.json());
app.use(logger);

app.use("/profile", express.static(path.join(__dirname, "./images")));

app.use("/api", require("./routes/authenticate"));
app.use("/api", require("./routes/userRoute"));
app.use("/api", require("./routes/tweetRoute"));

// API: get profile picture
app.get("/:userId/profile-pic", async (req, res) => {
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
app.get("/post-image/:tweetId", async (req, res) => {
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
