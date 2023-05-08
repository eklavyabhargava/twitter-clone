require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();
const User = mongoose.model('User');

// API: user registration
router.post('/api/auth/register', async (req, res) => {
    const { name, email, username, password } = req.body;

    // validate inputs
    if (!name || !email || !username || !password) {
        return res.status(400).json({ Error: "Mandatory fields are missing!" });
    }

    try {
        // check for uniqueness of email and username
        const emailFound = await User.findOne({ email });
        if (emailFound) {
            return res.status(400).json({ Error: "User with given email already exists!" });
        }
        
        // find user with same username in database
        const userFound = await User.findOne({ username });
        if (userFound) {
            return res.status(400).json({ Error: "Username already exists!" });
        }

        // hash password and create new user
        const hashedPassword = await bcryptjs.hash(password, 16);
        const newUser = new User({ name, email, username, password: hashedPassword });
        const userInfo = await newUser.save();

        res.status(200).json({ Success: "Account created successfully!", Name: userInfo.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ Error: "Internal error occurred!" });
    }
});

// API:  user login
router.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // validate inputs
    if (!username || !password) {
        return res.status(400).json({Error: "Mandatory fields are missing!"});
    }

    try {
        // check username in db
        const user = await User.findOne({ username });
        if (user) {
            // compare password and login if password match
            const didMatch = await bcryptjs.compare(password, user.password);
            if (didMatch) {
                const jwtToken = jwt.sign({ id: user._id}, JWT_SECRET);
                return res.status(200).json({Token: jwtToken, userId: user._id, Name: user.name, username: user.username});
            } else {
                return res.status(401).json({Error: "Invalid Credentials!"});
            }
        } else {
            return res.status(401).json({Error: "Invalid Credentials!"});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({Error: "Internal Error Occurred!"});
    }
});

module.exports = router;