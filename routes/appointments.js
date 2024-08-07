import express from "express";
import pool from "../config/dbconfig.js";

import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import { createAppointmentValidationSchema } from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.post(
  "/createAppointment",
  validationRequestBodyMiddleWare(createAppointmentValidationSchema),
  async (req, res) => {
    const cleanedData = req.validatedData;
    const {
      appointment_date,
      start_time,
      end_time,
      appointment_type_id,
      patient_id,
      sent_confirmation,
      send_reminder,
    } = cleanedData;

    try {
      const result = await pool.query(
        "INSERT INTO appointments(appointment_date,start_time,end_time,appointment_type_id,patient_id, send_reminder, sent_confirmation)values($1,$2,$3,$4,$5,$6,$7) returning *",
        [
          appointment_date,
          start_time,
          end_time,
          appointment_type_id,
          patient_id,
          send_reminder,
          sent_confirmation,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        success: false,
        message: "internal server error",
        error: error.message,
      });
    }
  }
);

router.get(
  "/viewByDate",
  validationRequestQueryMiddleWare(["startDate", "endDate", "profile_id"]),
  async (req, res) => {
    const { startDate, endDate, profile_id } = req.query;

    try {
      const result = await pool.query(
        `SELECT * from appointments as apps 
      inner join appointment_type as apptype 
      on apps.appointment_type_id = apptype.id
	  inner join patients on apps.patient_id = patients.id 
inner join user_profile on patients.profile_id = user_profile.id
      where profile_id= $1 and appointments.soft_delete = false 
    AND appointment_date >= $2 
    AND appointment_date <= $3
    `,
        [profile_id, startDate, endDate]
      );

      if (result.rowCount == 0) {
        res.status(200).json({ message: "no data" });
      } else {
        res.status(200).json({
          success: true,
          message: "succeessfully retrieved data",
          data: result.rows,
        });
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

router.get(
  "/viewSpecific:id",
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const appointment_id = req.params.id;

    try {
      const result = await pool.query(
        `SELECT * from appointments as app
      inner join appointment_type as apptype
      on app.appointment_type_id = appType.id
       where app.id = $1`,
        [appointment_id]
      );

      res.status(200).json({
        success: true,
        message: "retrieved appointment successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        success: false,
        message: "Internla server error",
        error: error.message,
      });
    }
  }
);

router.get(
  "/filter:id",
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare(["start_date", "end_date"]),
  async (req, res) => {
    const data = req.query;
    const profileId = req.params.id;
    const properties = Object.keys(data);
    const values = Object.values(data);
    const dynamicFilter = [];

    properties.forEach((property, index) => {
      if (property === "start_date") {
        dynamicFilter.push(`(appointment_date >= $${index + 1}`);
      } else if (property === "end_date") {
        dynamicFilter.push(`appointment_date <= $${index + 1})`);
      } else {
        dynamicFilter.push(`${property} = $${index + 1}`);
      }
    });

    dynamicFilter.push(`user_profile.id = $${dynamicFilter.length + 1}`);
    values.push(profileId);

    const joinedDynamicFilter = dynamicFilter.join(" AND ");

    const queryString = `SELECT PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
	PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
	APPOINTMENT_DATE,
	USER_PROFILE.FIRST_NAME AS PRACTITIONER_FIRST_NAME,
	USER_PROFILE.LAST_NAME AS PRACTITIONER_LAST_NAME,
	START_TIME,
	END_TIME,
	PRACTICE_NAME,
	PRACTICE_ADDRESS,
	APPOINTMENT_NAME,
	APPOINTMENT_TYPE.PRICE AS APPTYPE_PRICE,
	APPOINTMENT_TYPE.ID AS APPTYPE_ID,
	USER_PROFILE.ID AS PROFILE_ID,
	APPOINTMENTS.ID AS APPOINTMENT_ID,
  email,
	PATIENTS.ID AS PATIENT_ID,
  FINANCIALS.AMOUNT_DUE,
  FINANCIALS.TOTAL_AMOUNT,
  FINANCIALS.AMOUNT_PAID
FROM APPOINTMENTS
JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.ID = APPOINTMENTS.APPOINTMENT_TYPE_ID
LEFT JOIN INVOICES ON INVOICES.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
JOIN USER_PROFILE ON USER_PROFILE.ID = PATIENTS.PROFILE_ID
JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID 
  WHERE ${joinedDynamicFilter} and appointments.soft_delete = false `;

    try {
      const result = await pool.query(queryString, values);
      if (result.rowCount > 0) {
        res.status(200).json(result.rows);
      } else {
        res.status(200).json([]);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.get(
  `/appointmentsPagination:id`,
  validationRequestQueryMiddleWare(["start_date", "end_date"]),
  validationRequestParamsMiddleWare,
  async (req, res) => {
    if (!req.params.id || !req.query.page || !req.query.pageSize) {
      res.status(400).json("No profile id provided");
      return;
    }
    const profileId = req.params.id;
    const limit = parseInt(req.query.pageSize);
    const offset = (parseInt(req.query.page) - 1) * limit;

    const { start_date, end_date, search } = req.query;
    const values = [profileId, start_date, end_date];

    let lowerCaseSearch = "";

    if (search) {
      lowerCaseSearch = search.toLocaleLowerCase();
    }

    let queryString = `SELECT PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
  PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
  APPOINTMENT_DATE,
  USER_PROFILE.FIRST_NAME AS PRACTITIONER_FIRST_NAME,
  USER_PROFILE.LAST_NAME AS PRACTITIONER_LAST_NAME,
  START_TIME,
  END_TIME,
  patients.email as patient_email,
  PRACTICE_NAME,
  PRACTICE_ADDRESS,
  APPOINTMENT_NAME,
  APPOINTMENT_TYPE.PRICE AS APPTYPE_PRICE,
  APPOINTMENT_TYPE.ID AS APPTYPE_ID, 
  invoice_status,
  invoice_number,
  invoice_title,
  USER_PROFILE.ID AS PROFILE_ID,
  APPOINTMENTS.ID AS APPOINTMENT_ID,
  PATIENTS.ID AS PATIENT_ID,
  FINANCIALS.AMOUNT_DUE,
  FINANCIALS.TOTAL_AMOUNT,
  FINANCIALS.AMOUNT_PAID
FROM APPOINTMENTS
JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.ID = APPOINTMENTS.APPOINTMENT_TYPE_ID
LEFT JOIN INVOICES ON INVOICES.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
JOIN USER_PROFILE ON USER_PROFILE.ID = PATIENTS.PROFILE_ID
JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
 where user_profile.id = $1 and appointment_date >= $2  and appointment_date <= $3 and appointments.soft_delete = false `;

    if (lowerCaseSearch) {
      queryString +=
        "and (lower(patients.first_name)  like $4||'%' or lower(patients.last_name) like $4||'%')  offset $5 limit $6";
      values.push(lowerCaseSearch, offset, limit);
    } else {
      queryString += " offset $4 limit $5 ";
      values.push(offset, limit);
    }

    let totalCount = "";
    try {
      if (start_date && end_date && lowerCaseSearch) {
        totalCount = await pool.query(
          "select count(*) from appointments JOIN patients ON patients.id = appointments.patient_id where  profile_id = $1 and appointments.soft_delete = false and appointment_date >= $2 and appointment_date <= $3 and (lower(patients.first_name)  like $4||'%' or lower(patients.last_name) like $4||'%')",
          [profileId, start_date, end_date, lowerCaseSearch]
        );
      } else {
        totalCount = await pool.query(
          "select count(*) from appointments JOIN patients ON patients.id = appointments.patient_id where profile_id = $1 and appointments.soft_delete = false and appointment_date >= $2 and appointment_date <= $3",
          [profileId, start_date, end_date]
        );
      }

      const totalPages = Math.max(
        Math.ceil(parseInt(totalCount.rows[0].count) / limit),
        1
      );

      const dataChunk = await pool.query(queryString, values);

      res
        .status(200)
        .json({ data: dataChunk.rows, metaData: { totalPages: totalPages } });
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.get(
  `/viewAppointmentsByPatient:id`,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare(["page", "pageSize"]),
  async (req, res) => {
    console.log(req.params.id);
    const patientId = req.params.id;
    const limit = parseInt(req.query.pageSize);
    const offset = (parseInt(req.query.page) - 1) * limit;

    const query = `SELECT PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
  PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
  APPOINTMENT_DATE,
  USER_PROFILE.FIRST_NAME AS PRACTITIONER_FIRST_NAME,
  USER_PROFILE.LAST_NAME AS PRACTITIONER_LAST_NAME,
  START_TIME,
  patients.email as patient_email,
  END_TIME,
  PRACTICE_NAME,
  PRACTICE_ADDRESS,
  APPOINTMENT_NAME,
  APPOINTMENT_TYPE.PRICE AS APPTYPE_PRICE,
  APPOINTMENT_TYPE.ID AS APPTYPE_ID, 
  invoice_status,
  invoice_number,
  invoice_title,
  USER_PROFILE.ID AS PROFILE_ID,
  APPOINTMENTS.ID AS APPOINTMENT_ID,
  PATIENTS.ID AS PATIENT_ID, 
  FINANCIALS.AMOUNT_DUE,
  FINANCIALS.TOTAL_AMOUNT,
  FINANCIALS.AMOUNT_PAID
FROM APPOINTMENTS
left JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.ID = APPOINTMENTS.APPOINTMENT_TYPE_ID
LEFT JOIN INVOICES ON INVOICES.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
JOIN USER_PROFILE ON USER_PROFILE.ID = PATIENTS.PROFILE_ID
JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID where patients.id = $1 and appointments.soft_delete = false  
order by appointments.id desc
offset $2 limit $3`;

    try {
      const totalRowsCounted = await pool.query(
        `select count(*) from appointments where patient_id = $1 and appointments.soft_delete = false`,
        [patientId]
      );

      const totalPages = Math.max(
        Math.ceil(parseFloat(totalRowsCounted.rows[0].count) / limit),
        1
      );

      const result = await pool.query(query, [patientId, offset, limit]);
      console.log(result.rowCount);

      res
        .status(200)
        .json({ data: result.rows, metaData: { totalPages: totalPages } });
    } catch (error) {
      console.error(error);
    }
  }
);

router.delete(
  "/delete:id",
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const appointmentId = req.params.id;

    if (!appointmentId) {
      res.status(400).json({ message: "appointmentId not supplied" });
    }

    try {
      await pool.query(
        "update appointments set soft_delete = true where id = $1",
        [appointmentId]
      );
      res.status(200).json({ message: "Appointment successfully deleted" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: error.message, message: "Internal server error" });
    }
  }
);

export default router;
