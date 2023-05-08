const express = require('express');
const mongoose = require('mongoose');
const verifyLogin = require('../middleware/verifyLogin');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const Tweet = mongoose.model('Tweet');

// configure multer to handle file upload
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, './images/post');
    },
    filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        callback(null, uniqueSuffix + extension);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, callback) => {
        // check if uploaded file is an image with valid format
        const extname = path.extname(file.originalname);
        if (extname !== '.jpg' && extname !== '.jpeg' && extname !== '.png') {
            return callback(new Error('Only JPG, JPEG and PNG fiels are allowed'));
        }
        callback(null, true);
    }
});

// @Login-Required
// API: create tweet
router.post('/api/tweet', verifyLogin, upload.single('image'), async (req, res) => {
    const { content } = req.body;
    const { file } = req;

    try {
        let tweet = new Tweet({
            content: content,
            tweetedBy: req.user._id
        });

        if (file) {
            tweet.image = file.path; // store image file path in tweet object
        }

        await tweet.save();
        res.status(200).json({ Success: "Tweet created successfully", Tweet: tweet });
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: like tweet
router.post('/api/tweet/:id/like', verifyLogin, async (req, res) => {
    const tweetId = req.params.id;
    const userId = req.user._id;

    try {
        const tweet = await Tweet.findById(tweetId);
        if (!tweet) {
            res.status(404).json({ Error: "Tweet Not Found" });
        } else {
            if (tweet.likes.includes(userId)) {
                res.status(400).json({ Error: "Already liked" });
            } else {
                tweet.likes.push(userId);
                await tweet.save();
                res.status(200).json({ Success: "Tweet Liked" });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: unlike tweet API
router.post('/api/tweet/:id/dislike', verifyLogin, async (req, res) => {
    const tweetId = req.params.id;
    const userId = req.user._id;

    try {
        const tweet = await Tweet.findById(tweetId);
        if (tweet) {
            if (tweet.likes.includes(userId)) {
                tweet.likes.pull(userId);
                await tweet.save();
                res.status(200).json({ Success: true });
            } else {
                res.status(400).json({ Error: "Tweet not liked" });
            }
        } else {
            res.status(404).json({ Error: "Tweet Not Found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: reply on a tweet
router.post('/api/tweet/:id/reply', verifyLogin, async (req, res) => {
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
                res.status(200).json({ Success: true });
            } else {
                res.status(400).json({ Error: "Mandatory fields are missing" });
            }
        } else {
            res.status(404).json({ Error: "Tweet Not Found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: get signle tweet detail
router.get('/api/tweet/:id', verifyLogin, async (req, res) => {
    const tweetId = req.params.id;

    try {
        const tweet = await Tweet.findById(tweetId).populate([
            { path: 'tweetedBy', select: 'name username email profilePic' },
            { path: 'likes', select: '_id name username' },
            { path: 'retweetBy', select: 'name username' },
            { path: 'replies', select: 'content tweetedBy likes retweetBy replies createdAt',
            populate: { path: 'tweetedBy', select: '_id name username' } }
        ]);
        if (tweet) {
            res.status(200).json({ Tweet: tweet });
        } else {
            res.status(404).json({ Error: "Tweet Not Found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: get all tweet
router.get('/api/tweet', verifyLogin, async (req, res) => {
    try {
        const tweet = await Tweet.find().sort({ createdAt: -1 }).populate([
            { path: 'tweetedBy', select: 'name username email profilePic' },
            { path: 'likes', select: 'name username' },
            { path: 'retweetBy', select: 'name username' },
            { path: 'replies', select: 'content', populate: { path: 'tweetedBy', select: 'name username' } }
        ]);

        res.status(200).json({ AllTweet: tweet });
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// API: get tweet images
router.get('/api/tweet/:tweetId/image', async (req, res) => {
    try {
        const tweet = await Tweet.findById(req.params.tweetId);
        if (!tweet) {
            return res.status(404).send('Image not found');
        }
        res.set('Content-Type', 'image/jpeg');
        res.sendFile(path.join(__dirname, '..', tweet.image));
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

// @Login-Required
// API: delete tweet
router.delete('/api/tweet/:id', verifyLogin, async (req, res) => {
    const tweetId = req.params.id;
    console.log(tweetId);

    try {
        const tweet = await Tweet.findById(tweetId);
        console.log(tweet);

        if (!tweet) {
            res.status(404).json({ Error: "Tweet Not Found" });
        } else {
            if (tweet.tweetedBy.toString() === req.user._id.toString()) {
                await tweet.deleteOne();
                res.status(200).json({ Success: "Tweet Removed" });
            } else {
                res.status(401).json({ Error: "Not allowed to delete other's tweet" });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: retweet
router.post('/api/tweet/:id/retweet', verifyLogin, async(req, res) => {
    const tweetId = req.params.id;
    const userId = req.user._id;

    try {
        const tweet = await Tweet.findById(tweetId);
        if (!tweet) {
            res.status(404).json({ Error: "Tweet Not Found!" });
        } else {
            if (tweet.retweetBy.includes(userId)) {
                res.status(400).json({ Error: "Already retweeted" });
            } else {
                tweet.retweetBy.push(userId);
                await tweet.save();
                res.status(200).json({ Success: "Retweeted" });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

module.exports = router;