import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
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
import icd10CodeRoute from "./routes/icd10Codes.js";
import sessionValidationRoute from "./routes/sessionValidation.js";
import treatmentNotesRoute from "./routes/treatmentNotes.js";
import paymentRoute from "./routes/payments.js";
import financialsRoute from "./routes/financials.js";
import emailNotificationsRoute from "./routes/customEmails.js";
import patientAdditionalInformationRoute from "./routes/patientAdditionalInformation.js";
import { ValidationError } from "yup";
//import job from "./ScheduledCronJobs/sendEmailAppointmentReminder.js"; //dont delete- runs a cron job- disbaled in development

const app = express();
const port = process.env.SERVER_PORT;

app.use(
  session({
    secret: process.env.SECRET_KEY, //middleware
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      domain: "localhost",
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/session", sessionValidationRoute);
//add req.isAthtcated middleware here to secure the follwoing routes:
app.use("/users", userRoute);
app.use("/patients", patientRoute);
app.use("/medicalAid", medicalAidRoute);
app.use("/profile", profileRoute);
app.use("/practiceDetails", practiceDetailsRoute);
app.use("/appointmentTypes", appointmentTypesRoute);
app.use("/appointments", appointmentsRoute);
app.use("/invoices", invoiceRoute);
app.use("/predefinedIcd10", predefInedIcd10CodesRoute);
app.use("/emailNotifications", emailNotificationsRoute);
app.use("/icd10Codes", icd10CodeRoute);
app.use("/treatmentNotes", treatmentNotesRoute);
app.use("/financials", financialsRoute);
app.use("/payments", paymentRoute);
app.use("/patientAdditionalInformation", patientAdditionalInformationRoute);
app.use((error, req, res, next) => {
  if (error instanceof ValidationError) {
    res.status(400).json({
      message: "an error occured",
      errorType: error.name,
      errorMessage: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
