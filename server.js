import dotenv from "dotenv";
dotenv.config();
import express from "express";
import session from "express-session";
import userRoute from "./routes/users.js";
import patientRoute from "./routes/patients.js";
import passport from "./config/passportConfig.js";
import medicalAidRoute from "./routes/medicalAids.js";
import profileRoute from "./routes/userProfile.js";
import practiceDetailsRoute from "./routes/practiceDetails.js";
import appointmentTypesRoute from "./routes/appointmentType.js";
import appointmentsRoute from "./routes/appointments.js";
import invoiceRoute from "./routes/invoices.js";
import predefInedIcd10CodesRoute from "./routes/predefinedIcdCoding.js";

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
app.use("/practiceDetails", practiceDetailsRoute);
app.use("/appointmentTypes", appointmentTypesRoute);
app.use("/appointments", appointmentsRoute);
app.use("/invoice", invoiceRoute);
app.use("/predefinedIcd10", predefInedIcd10CodesRoute);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
