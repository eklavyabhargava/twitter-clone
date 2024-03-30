const express = require("express");
const cors = require("cors");
const connectDb = require("./db");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");

const app = express();

app.set("trust proxy", 2);

const PORT = process.env.PORT;

// get logs
const logger = morgan(
  ":remote-addr :user-agent :referrer :method :url :status :res[content-length] - :response-time ms"
);

connectDb();

require("./models/user_model");
require("./models/tweet_model");

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: "GET, POST, PUT, DELETE",
    optionSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(logger);

app.use("/api", apiLimiter, require("./routes/authenticate"));
app.use("/api", apiLimiter, require("./routes/userRoute"));
app.use("/api", apiLimiter, require("./routes/tweetRoute"));

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
