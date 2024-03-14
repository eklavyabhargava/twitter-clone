const express = require("express");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const router = express.Router();
const User = mongoose.model("User");

const multer = require("multer");
const path = require("path");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    return { isSuccess: true, user };
  } catch (error) {
    console.log(error);
    return { isSuccess: false };
  }
};

async function getUserByName(username) {
  try {
    const users = await User.find({
      username: { $regex: `^${username}`, $options: "i" },
    });
    return { isSuccess: true, users };
  } catch (error) {
    console.log(error);
    return { isSuccess: false };
  }
}

// API: get logged-in user detail
router.get("/get-details", async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ isSuccess: false, errMsg: "Please login again!" });
    }

    const response = await getUserById(userId);
    if (response.isSuccess && response.user) {
      const { user } = response;
      res.status(200).json({
        isSuccess: true,
        user: user,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal server error" });
  }
});

// API: get single user details
router.get("/get-user-details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await getUserById(id);
    if (response.isSuccess && response.user) {
      const { user } = response;
      res.status(200).json({
        isSuccess: true,
        _id: user._id,
        name: user.name,
        username: user.username,
        dob: user.dob,
        followers: user.followers,
        followings: user.followings,
        location: user.location,
        profilePic: path.join(__dirname, "..", user.profilePic),
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ isSuccess: false, errMsg: "User Not Found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: follow user
router.put("/follow/:id", async (req, res) => {
  const userId = req.params.id;
  const followerId = req.user._id;

  if (userId == followerId) {
    return res
      .status(403)
      .json({ isSuccess: false, errMsg: "Cannot Follow Yourself" });
  }

  try {
    // get user details
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ isSuccess: false, errMsg: "User Not Found!" });
    }

    // check if already followed
    if (user.followers.includes(followerId)) {
      return res
        .status(400)
        .json({ isSuccess: false, errMsg: "Already followings!" });
    }

    // Else:

    // add followerId in user's follower fields
    user.followers.push(followerId);
    await user.save();

    // get followerId's details and add followerId in followings fields
    const follower = await User.findById(followerId);
    follower.followings.push(userId);
    await follower.save();

    return res.status(200).json({ isSuccess: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: unfollow user
router.put("/unfollow/:id", async (req, res) => {
  const followingId = req.params.id;
  const followerId = req.user._id;

  try {
    const followings = await User.findById(followingId);
    const follower = await User.findById(followerId);
    if (!followings) {
      return res
        .status(404)
        .json({ isSuccess: false, errMsg: "User Not Found" });
    }

    // check if user followings or not to that user
    if (!followings.followers.includes(followerId)) {
      return res
        .status(409)
        .json({ isSuccess: false, errMsg: "Not followings" });
    }

    // Remove the follower from the followings's followers array
    const followerIndex = followings.followers.indexOf(followerId);
    followings.followers.splice(followerIndex, 1);

    // Remove the followings from the follower's followings array
    const followingIndex = follower.followings.indexOf(followingId);
    follower.followings.splice(followingIndex, 1);

    await followings.save();
    await follower.save();

    return res.status(200).json({ isSuccess: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: edit user detail
router.put("/edit-profile/:id", async (req, res) => {
  const { name, dob, location } = req.body;
  const reqId = req.params.id;
  const userId = req.user._id;

  if (!name || !dob || !location) {
    res
      .status(400)
      .json({ isSuccess: false, errMsg: "Mandatory fields are missing!" });
  } else {
    try {
      if (reqId != userId) {
        return res.status(403).json({
          isSuccess: false,
          errMsg: "Not allowed to edit other details",
        });
      } else {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            name,
            dob,
            location,
          },
          { new: true }
        );
        if (updatedUser) {
          res.status(200).json({
            isSuccess: true,
            msg: "User data updated successfully!",
          });
        } else {
          res.status(404).json({ isSuccess: false, errMsg: "User Not Found" });
        }
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ isSuccess: false, errMsg: "Internal Server Error" });
    }
  }
});

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

// use upload middleware to handle the file upload
const upload = multer({ storage: storage, fileFilter: filefilter });

// API: upload profile picture
router.post(
  "/upload-profile-pic/:id",
  upload.single("profilePic"),
  async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user._id.toString();

    try {
      if (userId !== currentUser) {
        return res.status(403).json({
          isSuccess: false,
          errMsg: "Not allowed to change other's profile",
        });
      }

      const { isSuccess, user } = await getUserById(currentUser);

      if (!isSuccess || !user) {
        return res
          .status(404)
          .json({ isSuccess: false, errMsg: "User Not Found" });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ isSuccess: false, errMsg: "File type not allowed" });
      }
      const params = {
        Bucket: process.env.CYCLIC_BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ACL: "public-read-write",
        ContentType: "image/jpeg",
      };

      const data = await s3.upload(params).promise();

      user.profilePic = data.Location;
      await user.save();

      return res
        .status(200)
        .json({ isSuccess: true, msg: "File Uploaded Successfully!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ errMsg: "Internal Server Error" });
    }
  }
);

router.get("/get-user-by-name/:username", async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).json({ isSuccess: false });
  }

  const { isSuccess, users } = await getUserByName(username);

  const sanitizedUsers = users?.map((user) => {
    const sanitizedUser = user.toObject({ getters: true, virtuals: true });
    delete sanitizedUser.password;
    return sanitizedUser;
  });

  if (isSuccess && sanitizedUsers) {
    res.status(200).json({
      isSuccess: true,
      users: [...sanitizedUsers],
    });
  } else {
    res.status(404).json({ isSuccess: false });
  }
});

module.exports = router;
