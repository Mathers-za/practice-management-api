import { CronJob } from "cron";
import pool from "../config/dbconfig.js";
import { addDays, format } from "date-fns";

import {
  compileEmailTemplate,
  processDataForHbsCompatibilty,
  sendBulkEmailInChunks,
} from "../helperFunctions/customEmailFunctions.js";

const job = new CronJob(
  "00 49 12 * * 1-7",
  sendBulkEmailReminders,
  null,
  true,
  "Africa/Johannesburg"
);

async function checkAppointmentsScheduledForTomorrow() {
  try {
    const tomorrowsDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    console.log(tomorrowsDate);
    console.log(tomorrowsDate);
    const result = await pool.query(
      `select PATIENTS.EMAIL AS PATIENT_EMAIL, 
      PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
      PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
USER_PROFILE.FIRST_NAME AS USER_FIRST_NAME,
	USER_PROFILE.LAST_NAME AS USER_LAST_NAME,
	USER_PROFILE.ID AS PROFILE_ID,
	PATIENTS.ID AS PATIENT_ID,
	USER_PROFILE.PROFILE_EMAIL AS USER_EMAIL,
	REMINDER_SUBJECT,
	REMINDER_BODY,
	APPOINTMENT_TYPE.APPOINTMENT_NAME AS APPOINTMENT_TYPE_NAME,
	PRACTICE_NAME,
	PRACTICE_ADDRESS,
	START_TIME,
	APPOINTMENT_DATE,
	APPOINTMENT_TYPE.ID AS APPOINTMENT_TYPE_ID,
	APPOINTMENTS.ID AS APPOINTMENT_ID
FROM APPOINTMENTS
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.ID = APPOINTMENTS.APPOINTMENT_TYPE_ID
JOIN USER_PROFILE ON USER_PROFILE.ID = APPOINTMENT_TYPE.PROFILE_ID
JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
join email_customizations ON email_customizations.profile_id = user_profile.id
            WHERE APPOINTMENT_DATE = $1 AND SEND_EMAIL_REMINDER = $2`,

      [tomorrowsDate, true]
    );

    return result.rows;
  } catch (error) {
    console.error(
      `error occured in checkappointmentsSheduleForTomorrow cron, ${error.message}`
    );
    throw error;
  }
}

async function sendBulkEmailReminders() {
  const arrayOfReciepentsAndThierRespectiveData = [];
  try {
    const data = await checkAppointmentsScheduledForTomorrow();
    console.log("ran sendemialReminders scripit");
    console.log(data);
    data.forEach((appointment) => {
      const processedSubjectData = processDataForHbsCompatibilty(
        appointment,
        "reminder_subject"
      );
      const compiledEmailSubject = compileEmailTemplate(
        processedSubjectData.reminder_subject,
        appointment
      );
      const processedBodyData = processDataForHbsCompatibilty(
        appointment,
        "reminder_body"
      );
      const compiledEmailBody = compileEmailTemplate(
        processedBodyData.reminder_body,
        appointment
      );

      arrayOfReciepentsAndThierRespectiveData.push({
        subject: compiledEmailSubject,
        body: compiledEmailBody,
        to: appointment.patient_email,
      });
    });

    await sendBulkEmailInChunks(
      arrayOfReciepentsAndThierRespectiveData,
      20,
      4000
    );
  } catch (error) {
    console.error(error);
  }
}

export default job;
