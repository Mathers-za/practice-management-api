import express from "express";
import pool from "../config/dbconfig.js";

import {
  compileEmailTemplate,
  sendNotificationEmail,
  processDataForHbsCompatibilty,
  defaultTestForEmailTemplateCompiling,
} from "../helperFunctions/customEmailFunctions.js";

import updateRecords from "../helperFunctions/patchRoute.js";
import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import { updateAppointmentNotificationsEmailsValidationSchema } from "../helperFunctions/validationSchemas.js";
import { CustomError } from "../helperFunctions/newClasses.js";

const router = express.Router();

router.post(`/sendConfirmationEmail`, async (req, res) => {
  const { profileId, appointmentId, patientId } = req.body;
  if (!profileId || !appointmentId || !patientId) {
    //validation
    throw new CustomError(
      "badrequest",
      "Request body is missing variables",
      400
    );
  }
  let compiledSubject = "";
  let compiledBody = "";

  try {
    const result = await pool.query(
      `SELECT PATIENTS.EMAIL AS PATIENT_EMAIL,
        PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
        PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
        USER_PROFILE.FIRST_NAME AS USER_FIRST_NAME,
        USER_PROFILE.LAST_NAME AS USER_LAST_NAME,
        user_profile.id as profile_id,
        patients.id as patient_id,
        USER_PROFILE.PROFILE_EMAIL AS USER_EMAIL,
        CONFIRMATION_SUBJECT,
        CONFIRMATION_BODY,
        cancellation_email_subject,
        cancellation_email_body,
        profession,
        APPOINTMENT_TYPE.APPOINTMENT_NAME AS APPOINTMENT_TYPE_NAME,
        PRACTICE_NAME,
        PRACTICE_ADDRESS,
        START_TIME,
        APPOINTMENT_DATE,appointment_type.id as appointment_type_id,
        appointments.id as appointment_id
    FROM USER_PROFILE
    JOIN EMAIL_CUSTOMIZATIONS ON EMAIL_CUSTOMIZATIONS.PROFILE_ID = USER_PROFILE.ID
    JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.PROFILE_ID = USER_PROFILE.ID
    JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
    JOIN PATIENTS ON PATIENTS.PROFILE_ID = USER_PROFILE.ID
    JOIN APPOINTMENTS ON APPOINTMENTS.APPOINTMENT_TYPE_ID = APPOINTMENT_TYPE.ID
              WHERE USER_PROFILE.ID = $1
                  AND APPOINTMENTS.ID = $2
                  AND PATIENTS.ID = $3`,
      [profileId, appointmentId, patientId]
    );

    const data = result.rows[0];

    try {
      if (data.confirmation_subject) {
        const processedSource = processDataForHbsCompatibilty(
          data,
          "confirmation_subject"
        );
        compiledSubject = compileEmailTemplate(
          processedSource.confirmation_subject,
          data
        );
      }

      if (data.confirmation_body) {
        const processedSource = processDataForHbsCompatibilty(
          data,
          "confirmation_body"
        );
        compiledBody = compileEmailTemplate(
          processedSource.confirmation_body,
          data
        );
      }
      await sendNotificationEmail(
        compiledSubject,
        compiledBody,
        data.patient_email,
        "html"
      );
      res.status(200).json("sucessfully sent confirmation email");
    } catch (error) {
      console.error(
        `error occured during email compiling in sendConfirmEmail api endpoint ${error.message}`
      );
    }
  } catch (error) {
    console.error(
      "error occured in sendConfirmEmail api endpoint " + error.message
    );
    console.error(error);
  }
});

router.post(`/create`, async (req, res) => {
  const { profile_id } = req.body;
  if (!profile_id) {
    throw new CustomError(
      "badRequest",
      "ProfileId in req body is undefined",
      400
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO email_customizations(profile_id,confirmation_subject,confirmation_body,reminder_subject,reminder_body)values($1,default,default,default,default) returning * `,
      [profile_id]
    );

    if (result.rowCount > 0) {
      res.status(201).json(result.rows);
    }
  } catch (error) {
    console.error(`An error occured during posting of custom email, ${error}`);
    res.status(500).json(error.message);
  }
});

router.get(`/view:id`, validationRequestParamsMiddleWare, async (req, res) => {
  const profileId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM  email_customizations where profile_id = $1 `,
      [profileId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(
      `An error occured during custom email get request, ${error.message}`
    );
    res.status(500).json(error.message);
  }
});

router.patch(
  `/update:id`,
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(
    updateAppointmentNotificationsEmailsValidationSchema
  ),
  async (req, res) => {
    await updateRecords(req, res, "email_customizations", "id");
  }
);

router.post(`/customizationErrorCheck`, async (req, res) => {
  const data = req.body;
  if (!data) {
    throw new CustomError("badRequest", "data in req body is missing", 400);
  }

  try {
    let sourceObjectToString = "";
    for (const key in data) {
      sourceObjectToString = data[key]; // this works because the data sent over only sends over one key value pair
    }
    // this block tests immediatly to see if there is a 400 error and sends back error to front end

    const wordArr = sourceObjectToString.split(" ");
    wordArr.forEach((word) => {
      if (
        (word.includes("}}") && !word.includes("{{")) ||
        (word.includes("{{") && !word.includes("}}"))
      ) {
        throw new CustomError(
          "badRequest",
          "Variables must follow the format of {{the_variable ex: user_name etc}} \n in order for your customization to be correct \n Do not use curley braces => { } anywhere in your customization \n other than the variables ",
          400
        );
      }
    });

    compileEmailTemplate(
      sourceObjectToString,
      defaultTestForEmailTemplateCompiling
    );
    res.status(200).json("template is correct");
  } catch (error) {
    res.status(400).json(error.message);
  }
});

router.post(`/sendCancellationEmail`, async (req, res) => {
  const { profileId, appointmentId, patientId } = req.body;

  let compiledSubject = "";
  let compiledBody = "";
  try {
    const result = await pool.query(
      `SELECT PATIENTS.EMAIL AS PATIENT_EMAIL,
        PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
        PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
        USER_PROFILE.FIRST_NAME AS USER_FIRST_NAME,
        USER_PROFILE.LAST_NAME AS USER_LAST_NAME,
        user_profile.id as profile_id,
        patients.id as patient_id,
        USER_PROFILE.PROFILE_EMAIL AS USER_EMAIL,
        CONFIRMATION_SUBJECT,
        CONFIRMATION_BODY,
        cancellation_email_subject,
        cancellation_email_body,
        profession,
        APPOINTMENT_TYPE.APPOINTMENT_NAME AS APPOINTMENT_TYPE_NAME,
        PRACTICE_NAME,
        PRACTICE_ADDRESS,
        START_TIME,
        APPOINTMENT_DATE,appointment_type.id as appointment_type_id,
        appointments.id as appointment_id
    FROM USER_PROFILE
    JOIN EMAIL_CUSTOMIZATIONS ON EMAIL_CUSTOMIZATIONS.PROFILE_ID = USER_PROFILE.ID
    JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.PROFILE_ID = USER_PROFILE.ID
    JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
    JOIN PATIENTS ON PATIENTS.PROFILE_ID = USER_PROFILE.ID
    JOIN APPOINTMENTS ON APPOINTMENTS.APPOINTMENT_TYPE_ID = APPOINTMENT_TYPE.ID
              WHERE USER_PROFILE.ID = $1
                  AND APPOINTMENTS.ID = $2
                  AND PATIENTS.ID = $3`,
      [profileId, appointmentId, patientId]
    );

    const dataUsedForTemplating = result.rows[0];
    console.log(dataUsedForTemplating);

    if (dataUsedForTemplating.cancellation_email_subject) {
      const processedSubject = processDataForHbsCompatibilty(
        dataUsedForTemplating,
        "cancellation_email_subject"
      );
      compiledSubject = compileEmailTemplate(
        processedSubject.cancellation_email_subject,
        dataUsedForTemplating
      );
    } else
      throw new CustomError(
        "Server error",
        "Missing data for remplating cancellation email",
        500
      );
    if (dataUsedForTemplating.cancellation_email_body) {
      const processedBody = processDataForHbsCompatibilty(
        dataUsedForTemplating,
        "cancellation_email_body"
      );
      compiledBody = compileEmailTemplate(
        processedBody.cancellation_email_body,
        dataUsedForTemplating
      );
    } else
      throw new CustomError(
        "Server error",
        "Missing data for remplating cancellation email",
        500
      );

    await sendNotificationEmail(
      compiledSubject,
      compiledBody,
      dataUsedForTemplating.patient_email,
      "html"
    );

    res.status(200).json({ message: "Cancellation email succesfully sent" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

export default router;
