require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDb = require('./db');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

// get logs
const logger = morgan(':remote-addr :user-agent :referrer :method :url :status :res[content-length] - :response-time ms');

connectDb();

require('./models/user_model');
require('./models/tweet_model');

app.use(cors());
app.use(express.json());
app.use(logger);

app.use(require('./routes/authenticate'));
app.use(require('./routes/userRoute'));
app.use(require('./routes/tweetRoute'));

app.listen(PORT, ()=>{
    console.log(`Listening on PORT: ${PORT}`);
});
