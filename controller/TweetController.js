const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const bucket = require("../firebase-storage");

const router = express.Router();
const Tweet = mongoose.model("Tweet");

// set file destination
const storage = multer.memoryStorage({
  destination: function (req, file, cb) {
    cb(null, "");
  },
});

const filefilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/gif"
  ) {
    cb(null, true); // Allow the file to be uploaded
  } else {
    cb(null, false); // Reject the file
  }
};

// using upload middleware to handle the file upload
const upload = multer({ storage: storage, fileFilter: filefilter });

// API: create tweet
router.post("/create-tweet", upload.single("image"), async (req, res) => {
  const { content } = req.body;
  const { file } = req;

  try {
    if (!content) {
      return res
        .status(400)
        .json({ isSuccess: false, errMsg: "Content is required" });
    }

    let tweet = new Tweet({
      content: content,
      tweetedBy: req.user._id,
    });

    if (file) {
      const fileName = `posts/${req.user._id}/${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      const metadata = {
        contentType: file.mimetype, // Simplified metadata structure
      };

      // upload the file
      fileUpload.save(file.buffer, metadata, async (err) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .json({ isSuccess: false, errMsg: "Error uploading file" });
        }

        try {
          const [url] = await fileUpload.getSignedUrl({
            action: "read",
            expires: "2500-01-30",
          });
          tweet.image = url;

          await tweet.save();
          res.status(201).json({
            isSuccess: true,
            msg: "Tweet created successfully",
            tweet: tweet,
          });
        } catch (error) {
          console.log(error);
          res
            .status(500)
            .json({ isSuccess: false, errMsg: "Error saving tweet" });
        }
      });
    } else {
      await tweet.save();
      res.status(201).json({
        isSuccess: true,
        msg: "Tweet created successfully",
        tweet: tweet,
      });
    }
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
      { path: "likes", select: "_id name username profilePic" },
      { path: "retweetBy", select: "name username profilePic" },
      {
        path: "replies",
        select: "content image tweetedBy likes retweetBy replies createdAt",
        populate: { path: "tweetedBy", select: "_id name username profilePic" },
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
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  const limit = 10; // Number of tweets per page

  setTimeout(async () => {
    try {
      const tweets = await Tweet.find()
        .populate("tweetedBy", "name username profilePic")
        .populate("likes", "name username profilePic")
        .populate("retweetBy", "name username profilePic")
        .populate({
          path: "replies",
          populate: { path: "tweetedBy", select: "name username profilePic" },
        })
        .skip((page - 1) * limit) // Skip tweets based on the page number
        .limit(limit); // Limit the number of tweets per page

      res.status(200).json({ isSuccess: true, tweets: tweets });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ isSuccess: false, errMsg: "Internal Server Error" });
    }
  }, 5000);
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
      "_id name username profilePic"
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
