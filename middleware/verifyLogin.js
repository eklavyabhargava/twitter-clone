require('dotenv').config();

const jwt = require('jsonwebtoken')
const mongoose = require('mongoose');

const User = mongoose.model('User');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = ((req,res,next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({Error: "Not logged In. Please Login Again!"});
    } else {
        const token = authorization.replace("Bearer ", "");

        jwt.verify(token, JWT_SECRET, (error, payload) => {
            if (error) {
                return res.status(500).json({Error: "Internal error occurred!"});
            } else {
                User.findById(payload.id).then((userFound) => {
                    if (!userFound) {
                        return res.status(401).json({Error: "Invalid Credentials!"});
                    }
                    req.user = userFound;
                    next();
                }).catch((error) => {
                    return res.status(500).json({ Error: error.message });
                });
            }
        });
    }
});