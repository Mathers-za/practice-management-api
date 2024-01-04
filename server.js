import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import userRoute from "./routes/users.js";
import patientRoute from "./routes/patients.js";
import passport from "./config/passportConfig.js";
import medicalAidRoute from "./routes/medicalAids.js";
import profileRoute from "./routes/userProfile.js";

const app = express();
const port = process.env.SERVER_PORT;

app.use(
  session({
    secret: process.env.SECRET_KEY, //middleware
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/users", userRoute);
app.use("/patients", patientRoute);
app.use("/medicalAid", medicalAidRoute);
app.use("/profile", profileRoute);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
