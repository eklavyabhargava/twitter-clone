const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const Tweet = mongoose.model("Tweet");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const destinationPath = "./post";

    // Check if the destination folder exists, create it if not
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    callback(null, destinationPath);
  },
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    callback(null, uniqueSuffix + extension);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    // check if the uploaded file is an image with a valid format
    const extname = path.extname(file.originalname);
    if (extname !== ".jpg" && extname !== ".jpeg" && extname !== ".png") {
      return callback(new Error("Only JPG, JPEG, and PNG files are allowed"));
    }
    callback(null, true);
  },
});

// API: create tweet
router.post("/create-tweet", upload.single("image"), async (req, res) => {
  const { content } = req.body;
  const { file } = req;

  try {
    let tweet = new Tweet({
      content: content,
      tweetedBy: req.user._id,
    });

    if (file) {
      tweet.image = file.filename;
    }

    await tweet.save();
    res.status(201).json({
      isSuccess: true,
      msg: "Tweet created successfully",
      tweet: tweet,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: like tweet
router.post("/like/:id", async (req, res) => {
  const tweetId = req.params.id;
  const userId = req.user._id;

  try {
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      res.status(404).json({ isSuccess: false, errMsg: "Tweet Not Found" });
    } else {
      if (tweet.likes.includes(userId)) {
        res.status(409).json({ isSuccess: false, errMsg: "Already liked" });
      } else {
        tweet.likes.push(userId);
        await tweet.save();
        res.status(200).json({ isSuccess: true, msg: "Tweet Liked" });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: unlike tweet API
router.post("/dislike/:id", async (req, res) => {
  const tweetId = req.params.id;
  const userId = req.user._id;

  try {
    const tweet = await Tweet.findById(tweetId);
    if (tweet) {
      if (tweet.likes.includes(userId)) {
        tweet.likes.pull(userId);
        await tweet.save();
        res.status(200).json({ isSuccess: true });
      } else {
        res.status(409).json({ isSuccess: false, errMsg: "Tweet not liked" });
      }
    } else {
      res.status(404).json({ isSuccess: false, errMsg: "Tweet Not Found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: reply on a tweet
router.post("/reply/:id", async (req, res) => {
  const tweetId = req.params.id;
  const userId = req.user._id;
  const { content } = req.body;

  try {
    const tweet = await Tweet.findById(tweetId);
    if (tweet) {
      if (content) {
        const newTweet = new Tweet({ content, tweetedBy: userId });
        await newTweet.save();
        tweet.replies.push(newTweet._id);
        await tweet.save();
        res.status(200).json({ isSuccess: true });
      } else {
        res
          .status(400)
          .json({ isSuccess: false, errMsg: "Mandatory fields are missing" });
      }
    } else {
      res.status(404).json({ isSuccess: false, errMsg: "Tweet Not Found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: get single tweet detail
router.get("/tweet-detail/:id", async (req, res) => {
  const tweetId = req.params.id;
  try {
    const tweet = await Tweet.findById(tweetId).populate([
      { path: "tweetedBy", select: "name username emailId profilePic" },
      { path: "likes", select: "_id name username" },
      { path: "retweetBy", select: "name username" },
      {
        path: "replies",
        select: "content tweetedBy likes retweetBy replies createdAt",
        populate: { path: "tweetedBy", select: "_id name username" },
      },
    ]);
    if (tweet) {
      res.status(200).json({ isSuccess: true, tweet: tweet });
    } else {
      res.status(404).json({ isSuccess: false, errMsg: "Tweet Not Found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: get all tweet
router.get("/get-tweets", async (req, res) => {
  try {
    const tweets = await Tweet.find()
      .populate("tweetedBy", "name username")
      .populate("likes", "name username")
      .populate("retweetBy", "name username")
      .populate({
        path: "replies",
        populate: { path: "tweetedBy", select: "name username" },
      });

    res.status(200).json({ isSuccess: true, tweets: tweets });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: delete tweet
router.delete("/delete/:id", async (req, res) => {
  const tweetId = req.params.id;

  try {
    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
      res.status(404).json({ errMsg: "Tweet Not Found" });
    } else {
      if (tweet.tweetedBy.toString() === req.user._id.toString()) {
        await tweet.deleteOne();
        res.status(200).json({ isSuccess: true, msg: "Tweet Removed" });
      } else {
        res.status(400).json({
          isSuccess: false,
          errMsg: "Not allowed to delete other's tweet",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: retwee__dirnamet
router.post("/retweet/:id", async (req, res) => {
  const tweetId = req.params.id;
  const userId = req.user._id;

  try {
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      res.status(404).json({ isSuccess: false, errMsg: "Tweet Not Found!" });
    } else {
      if (tweet.retweetBy.includes(userId)) {
        res.status(409).json({ isSuccess: false, errMsg: "Already retweeted" });
      } else {
        tweet.retweetBy.push(userId);
        await tweet.save();
        res.status(200).json({ isSuccess: true, msg: "Retweeted" });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: get user tweet
router.get("/user-tweets/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const tweets = await Tweet.find({ tweetedBy: userId }).populate(
      "tweetedBy",
      "_id, name, username"
    );
    if (tweets) {
      res.status(200).json({ isSuccess: true, tweets: tweets });
    } else {
      res
        .status(404)
        .json({ isSuccess: false, errMsg: "No any tweet from this user" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

module.exports = router;
