const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();
const User = mongoose.model("User");

const multer = require("multer");
const path = require("path");

const getUserById = async (id) => {
  const user = await User.findById(id);
  return user;
};

// API: get logged-in user detail
router.get("/get-details", async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ isSuccess: false, errMsg: "Please login again!" });
    }

    const userData = await getUserById(userId);
    res.status(200).json({
      isSuccess: true,
      user: userData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal server error" });
  }
});

// API: get single user details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (user) {
      res.status(200).json({
        id: user._id,
        name: user.name,
        dob: user.dob,
        location: user.location,
        profilePic: path.join(__dirname, "..", user.profilePic), // Add profilePic field
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
        .json({ isSuccess: false, errMsg: "Already following!" });
    }

    // Else:

    // add followerId in user's follower fields
    user.followers.push(followerId);
    await user.save();

    // get followerId's details and add followerId in following fields
    const follower = await User.findById(followerId);
    follower.following.push(userId);
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
    const following = await User.findById(followingId);
    const follower = await User.findById(followerId);
    if (!following) {
      return res
        .status(404)
        .json({ isSuccess: false, errMsg: "User Not Found" });
    }

    // check if user following or not to that user
    if (!following.followers.includes(followerId)) {
      return res
        .status(409)
        .json({ isSuccess: false, errMsg: "Not Following" });
    }

    // Remove the follower from the following's followers array
    const followerIndex = following.followers.indexOf(followerId);
    following.followers.splice(followerIndex, 1);

    // Remove the following from the follower's following array
    const followingIndex = follower.following.indexOf(followingId);
    follower.following.splice(followingIndex, 1);

    await following.save();
    await follower.save();

    return res.status(200).json({ isSuccess: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ isSuccess: false, errMsg: "Internal Server Error" });
  }
});

// API: edit user detail
router.put("/edit-details/:id", async (req, res) => {
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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension); // rename file with unique suffix and original extension
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      return cb(new Error("Only .jpg, .jpeg and .png formats are allowed"));
    }
    cb(null, true);
  },
});

// use upload middleware to handle the file upload
const upload = multer({ storage: storage });

// API: upload profile picture
router.post(
  "/upload-profile-pic/:id",
  upload.single("profilePic"),
  async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user._id;

    try {
      if (userId != currentUser) {
        res.status(403).json({
          isSuccess: false,
          errMsg: "Not allowed to change other's profile",
        });
      } else {
        const user = await User.findById(currentUser);

        if (user) {
          user.profilePic = req.file.filename;
          await user.save();
          res
            .status(200)
            .json({ isSuccess: true, msg: "File Uploaded Successfully!" });
        } else {
          res.status(404).json({ isSuccess: false, errMsg: "User Not Found" });
        }
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ errMsg: "Internal Server Error" });
    }
  }
);

module.exports = router;
