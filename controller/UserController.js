const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = mongoose.model("User");

const multer = require("multer");
const bucket = require("../firebase-storage");
const { generateRefreshToken } = require("./AuthUser");

const getUserById = async (id) => {
  try {
    const user = await User.findById(id).select("-password");
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
    }).select("-password");
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

// Endpoint to receive active status updates and return refresh token
router.post("/active-status", (req, res) => {
  // Process active status update
  const { activeStatus } = req.body;
  if (activeStatus) {
    // Generate and return refresh token
    const refreshToken = generateRefreshToken(req.user._id);
    res.json({ isSuccess: true, Token: refreshToken });
  } else {
    res.status(400).json({ isSuccess: false });
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
        ...user._doc,
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

  if (!name) {
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
            dob: dob || "",
            location: location || "",
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

// using upload middleware to handle the file upload
const upload = multer({ storage: storage, fileFilter: filefilter });

// API: upload profile picture
router.post(
  "/upload-profile-pic/:id",
  upload.single("profilePic"),
  async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user._id.toString();

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
        .json({ isSuccess: false, errMsg: "File not provided" });
    }

    const file = req.file;

    const fileName = `images/${currentUser}/${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const metadata = {
      metadata: {
        contentType: file.mimetype,
      },
    };

    // Upload the file
    fileUpload.save(file.buffer, metadata, (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        return res.status(500).send("Error uploading file.");
      }

      // File uploaded successfully, get the download URL
      fileUpload.getSignedUrl(
        { action: "read", expires: "2500-01-30" }, // Correct format for expiration date
        async (err, url) => {
          if (err) {
            console.error("Error generating signed URL:", err);
            return res.status(500).json({
              isSuccess: false,
              errMsg: "Error generating download URL.",
            });
          }

          try {
            user.profilePic = url;
            await user.save();
          } catch (error) {
            console.log(error);
            return res
              .status(500)
              .json({ isSuccess: false, errMsg: "Internal error occurred!" });
          }

          // Return the download URL to the client
          return res.status(200).json({
            isSuccess: true,
            msg: "Profile updated successfully!",
            profilePic: url,
          });
        }
      );
    });
  }
);

router.get("/get-user-by-name/:username", async (req, res) => {
  const { username } = req.params;
  if (!username) {
    return res.status(400).json({ isSuccess: false });
  }

  const { isSuccess, users } = await getUserByName(username);

  if (isSuccess && users) {
    res.status(200).json({
      isSuccess: true,
      users: [...users],
    });
  } else {
    res.status(404).json({ isSuccess: false });
  }
});

module.exports = router;
