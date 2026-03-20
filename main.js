const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const appRoutes = require("./routes/applications");
const profileRoutes = require("./routes/profiles")
const cvRoutes = require("./routes/cv")
const rankingRouter = require("./routes/ranking");
const httpLogger = require("./utils/log/httpLogger");

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());
app.use(httpLogger)

app.use("/auth", authRoutes);
app.use("/ranking", rankingRouter);
app.use("/jobs", jobRoutes);
app.use("/applications", appRoutes);
app.use("/profiles", profileRoutes);
app.use("/cvs", cvRoutes)

app.listen(3000, () => {
  console.log("Server running on port 3000");
});