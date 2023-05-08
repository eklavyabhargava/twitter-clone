const express = require('express');
const mongoose = require('mongoose');
const verifyLogin = require('../middleware/verifyLogin');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const User = mongoose.model('User');
const Tweet = mongoose.model('Tweet');

// @Login-Required
// API: get single user details
router.get('/api/user/:id', verifyLogin, async (req, res) => {
    const id = req.params.id;

    // Check for empty user-id
    if (!id) {
        return res.status(400).json({ Error: "Missing ID parameter" });
    } else {
        try {
            // get all details of user except password and send it as response
            const user = await User.findById(id, { password: 0 });
            if (user) {
                return res.status(200).json(user);
            } else {
                return res.status(404).json({ Error: "User Not Found" });
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ Error: "Internal Server Error" });
        }
    }
});

// @Login-Required
// API: get profile picture
router.get('/api/user/:userId/profile-pic', async (req, res) => {
    try {
        // find user and return user's profile image
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.set('Content-Type', 'image/jpeg');
        res.sendFile(path.join(__dirname, '..', user.profilePic));
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

// @Login-Required
// API: follow user
router.put('/api/user/:id/follow', verifyLogin, async (req, res) => {
    const userId = req.params.id;
    const followerId = req.user._id;

    if (userId == followerId) {
        return res.status(403).json({ Error: "Cannot Follow Yourself" });
    }

    try {
        // get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ Error: "User Not Found!" });
        }

        // check if already followed
        if (user.followers.includes(followerId)) {
            return res.status(409).json({ Error: "Already following!" });
        }
        
        // Else:

        // add followerId in user's follower fields
        user.followers.push(followerId);
        await user.save();

        // get followerId's details and add followerId in following fields
        const follower = await User.findById(followerId);
        follower.following.push(userId);
        await follower.save();

        return res.status(200).json({ Success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: unfollow user
router.put('/api/user/:id/unfollow', verifyLogin, async (req, res) => {
    const followingId = req.params.id;
    const followerId = req.user._id;

    try {
        const following = await User.findById(followingId);
        const follower = await User.findById(followerId);
        if (!following) {
            return res.status(404).json({ Error: "User Not Found" });
        }

        // check if user following or not to that user
        if (!following.followers.includes(followerId)) {
            return res.status(409).json({ Error: "Not Following" });
        }

        // Remove the follower from the following's followers array
        const followerIndex = following.followers.indexOf(followerId);
        following.followers.splice(followerIndex, 1);

        // Remove the following from the follower's following array
        const followingIndex = follower.following.indexOf(followingId);
        follower.following.splice(followingIndex, 1);

        await following.save();
        await follower.save();

        return res.status(200).json({ Success: true });


        return res.status(200).json({ Success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// @Login-Required
// API: edit user detail
router.put('/api/user/:id', verifyLogin, async (req, res) => {
    const { name, dob, location } = req.body;
    const reqId = req.params.id;
    const userId = req.user._id;

    if (!name || !dob || !location) {
        res.status(400).json({ Error: "Mandatory fields are missing!" });
    } else {
        try {
            if (reqId != userId) {
                return res.status(403).json({ Error: "Not allowed to edit other details" });
            } else {
                const updatedUser = await User.findByIdAndUpdate(userId, {
                    name,
                    dob,
                    location
                }, { new: true });
                if (updatedUser) {
                    res.status(200).json({ Success: "User data updated successfully!" });
                } else {
                    res.status(404).json({ Error: "User Not Found" });
                }
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ Error: "Internal Server Error" });
        }
    }
});

// @Login-Required
// API: get user tweet
router.post('/api/user/:id/tweets', verifyLogin, async (req, res) => {
    const userId = req.params.id;

    try {
        const tweets = await Tweet.find({ tweetedBy: userId });
        if (tweets) {
            res.status(200).json({ Tweets: tweets });
        } else {
            res.status(404).json({ Error: "No any tweet from this user" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

// set file destination
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension); // rename file with unique suffix and original extension
    },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
            return cb(new Error('Only .jpg, .jpeg and .png formats are allowed'));
        }
        cb(null, true);
    }
})

// use upload middleware to handle the file upload
const upload = multer({ storage: storage });

// @Login-Required
// API: upload profile picture
router.post('/api/user/:id/uploadProfilePic', verifyLogin, upload.single('profilePic'), async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user._id;

    try {
        if (userId != currentUser) {
            res.status(403).json({ Error: "Not allowed to change other's profile" });
        } else {
            const user = await User.findById(currentUser);

            if (user) {
                user.profilePic = path.join('images', req.file.filename);
                await user.save();
                res.status(200).json({ Success: "File Uploaded Successfully!" })
            } else {
                res.status(404).json({ Error: "User Not Found" });
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ Error: "Internal Server Error" });
    }
});

module.exports = router;