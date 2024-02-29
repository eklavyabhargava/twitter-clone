const express = require("express");
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const router = express.Router();
const User = mongoose.model("User");

// API: user registration
router.post("/register", async (req, res) => {
  const { name, emailId, username, password } = req.body;

  // validate inputs
  if (!name || !emailId || !username || !password) {
    return res
      .status(400)
      .json({ isSuccess: false, errMsg: "Mandatory fields are missing!" });
  }

  try {
    // check for uniqueness of emailId and username
    const emailIdFound = await User.findOne({ emailId });
    if (emailIdFound) {
      return res.status(400).json({
        isSuccess: false,
        errorFor: "emailId",
        errMsg: "User with given email Id already exists!",
      });
    }

    // find user with same username in database
    const userFound = await User.findOne({ username });
    if (userFound) {
      return res.status(400).json({
        isSuccess: false,
        errorFor: "username",
        errMsg: "Username already in use, please try different username!",
      });
    }

    // hash password and create new user
    const hashedPassword = await bcryptjs.hash(password, 16);
    const newUser = new User({
      name,
      emailId,
      username,
      password: hashedPassword,
    });
    const userInfo = await newUser.save();

    res.status(201).json({
      isSuccess: true,
      msg: "Account created successfully!",
      Name: userInfo.username,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ isSuccess: false, errMsg: "Internal error occurred!" });
  }
});

// API:  user login
router.post("/login", async (req, res) => {
  const { usernameOrEmailId, password } = req.body;

  // validate inputs
  if (!usernameOrEmailId || !password) {
    return res
      .status(200)
      .json({ isSuccess: false, errMsg: "Mandatory fields are missing!" });
  }

  try {
    // check username in db
    const user = await User.findOne({
      $or: [
        { username: usernameOrEmailId },
        { isSuccess: false, emailId: usernameOrEmailId },
      ],
    });
    if (user) {
      // compare password and login if password match
      const didMatch = await bcryptjs.compare(password, user.password);
      if (didMatch) {
        const jwtToken = jwt.sign({ id: user._id }, JWT_SECRET_KEY, {
          expiresIn: "1h",
        });
        const data = { ...user.toObject(), password: undefined };
        return res.status(200).json({
          isSuccess: true,
          Token: jwtToken,
          user: data,
        });
      } else {
        return res
          .status(401)
          .json({ isSuccess: false, errMsg: "Invalid Credentials!" });
      }
    } else {
      return res.status(400).json({
        isSuccess: false,
        errMsg: "User with given username or emailId doesn't exist",
      });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ isSuccess: false, errMsg: "Internal Error Occurred!" });
  }
});

module.exports = router;
