import express from "express";

import pool from "../config/dbconfig.js";
import { v4 as uuidv4 } from "uuid";
import updateRecords from "../helperFunctions/patchRoute.js";
import path from "path";
import nodemailer from "nodemailer";

import {
  compileHtmlContent,
  extractDataFromDB,
  convertToPdfAndStore,
} from "../helperFunctions/pdfConversion.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  const invoiceNumber = "INV-" + uuidv4().slice(0, 6);
  const appointmentId = req.params.id;

  const {
    invoice_title,
    invoice_start_date,
    invoice_end_date,
    invoice_status,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO invoices(invoice_number,invoice_title,invoice_start_date,invoice_end_date,
       appointment_id,invoice_status)values($1,$2,$3,$4,$5,$6) returning * `,
      [
        invoiceNumber,
        invoice_title,
        invoice_start_date,
        invoice_end_date,
        appointmentId,
        invoice_status,
      ]
    );
    if (result.rowCount > 0) {
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get(`/view:id`, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM invoices where appointment_id = $1`,
      [appointmentId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "invoices", "appointment_id");
});

router.delete("/deleteInvoice:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query("DELETE FROM INVOICES WHERE id = $1", [id]);
    if (result.rowCount > 0) {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get("/invoiceSetup:id", async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `select * from appointments
  JOIN appointment_type ON appointment_type.id = appointments.appointment_type_id
  JOIN patients ON patients.id = appointments.patient_id
  JOIN user_profile ON user_profile.id = patients.profile_id
  JOIN practice_details ON practice_details.profile_id = user_profile.id 
  where appointments.id = $1`,
      [appointmentId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get(`/batchview`, async (req, res) => {
  const arrayOfAppointmenIds = req.query.appIds;
  const objectResponse = {};
  if (!arrayOfAppointmenIds) {
    return;
  }

  for (const appId of arrayOfAppointmenIds) {
    try {
      const result = await pool.query(
        `SELECT * FROM invoices where appointment_id = $1`,
        [appId]
      );
      if (result.rowCount > 0) {
        objectResponse[appId] = result.rows[0];
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
      return;
    }
  }

  res.status(200).json(objectResponse);
});

router.get(`/filteredView`, async (req, res) => {
  const queryParams = req.query;
  console.log(`the qyery params in endpoint ` + queryParams);
  const paramKeys = Object.keys(queryParams);
  const values = Object.values(queryParams);
  const conditions = [];
  paramKeys.forEach((key, index) => {
    if (key === "invoice_start_date") {
      conditions.push(`${key} >= $${index + 1}`);
    } else if (key === "invoice_end_date") {
      conditions.push(`${key} <= $${index + 1}`);
    } else {
      conditions.push(`${key} = $${index + 1}`);
    }
  });

  try {
    const result = await pool.query(
      `SELECT INVOICE_NUMBER,
    INVOICE_START_DATE,
    INVOICE_END_DATE,
    INVOICES.ID AS INVOICE_ID,
    INVOICE_TITLE,
    INVOICE_STATUS,
    TOTAL_AMOUNT,
    AMOUNT_DUE,
    AMOUNT_PAID,
    APPOINTMENT_TYPE_ID,
    APPOINTMENTS.ID AS APPOINTMENT_ID,
    PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
    PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
    PATIENTS.ID AS PATIENT_ID,
    patients.profile_id as profile_id,
    email
    
    

  FROM INVOICES
  JOIN APPOINTMENTS ON APPOINTMENTS.ID = INVOICES.APPOINTMENT_ID
  JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
  JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where ${conditions.join(
    " AND "
  )}`,
      [...values]
    );
    console.log(`the result in endpoint ` + result);

    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get(`/retrieveInvoiceStatement`, async (req, res) => {
  const { invoiceNumber, profileId, appointmentId, patientId } = req.query;

  const data = await extractDataFromDB(profileId, appointmentId, patientId);
  const htmlTemplatePath = path.join(
    process.cwd(),
    "templates",
    "invoiceStatement.hbs"
  );
  const htmlContent = compileHtmlContent(htmlTemplatePath, data);
  const buffer = await convertToPdfAndStore(htmlContent, invoiceNumber);

  res.contentType("application/json").status(200).send(buffer);
});

router.post(`/sendInvoiceStatment`, async (req, res) => {
  const { profileId, appointmentId, patientId, invoiceNumber } = req.body;
  console.log(
    `profile id = ${profileId}, appointmentId = ${appointmentId}, patientId = ${patientId}`
  );
  try {
    const data = await extractDataFromDB(profileId, appointmentId, patientId);
    console.log(`data extrcated is ${data?.generalData?.practice_name}`);
    const pathToPdfTemplate = path.join(
      process.cwd(),
      "templates",
      "invoiceStatement.hbs"
    );
    const htmlContent = compileHtmlContent(pathToPdfTemplate, data);
    const pdfBuffer = await convertToPdfAndStore(htmlContent);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "danielmathers97@gmail.com",
        pass: "qfvi vooe ksmi tcpp",
      },
    });

    await transporter.sendMail({
      from: "danielmathers97@gmail.com",
      to: data.generalData.patient_email,
      subject: "Invoice Statment for your chiropractic appointment",
      text: `Please find your invoice Statement for your appointment with ${
        data?.generalData?.user_first_name || ""
      } ${data?.generalData?.user_last_name || ""}`,

      attachments: [
        {
          filename: `${invoiceNumber}-invoiceStatemnt.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).send("sent email successfully");
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get(`/getAllInvoicesByPatient:id`, async (req, res) => {
  console.log(req.params.id);
  if (!req.params.id || !req.query.page || !req.query.pageSize) {
    res
      .status(400)
      .json({ message: "Not all paramters or queries were supplied" });
    return;
  }
  console.log(req.params.id);
  const patientId = req.params.id;
  const limit = parseInt(req.query.pageSize);
  const offset = (parseInt(req.query.page) - 1) * limit;

  try {
    const totalRowCount = await pool.query(
      `select count (*)  FROM INVOICES

  JOIN APPOINTMENTS ON APPOINTMENTS.ID = INVOICES.APPOINTMENT_ID
  JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
  where appointments.patient_id= $1`,
      [patientId]
    );
    const totalPages = Math.max(
      Math.ceil(parseInt(totalRowCount.rows[0].count) / limit),
      1
    );

    const result = await pool.query(
      `SELECT INVOICE_NUMBER,
    INVOICE_START_DATE,
    INVOICE_END_DATE,
    INVOICES.ID AS INVOICE_ID,
    INVOICE_TITLE,
    INVOICE_STATUS,
    TOTAL_AMOUNT,
    AMOUNT_DUE,
    AMOUNT_PAID,
    APPOINTMENT_TYPE_ID,
    APPOINTMENTS.ID AS APPOINTMENT_ID,
    PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
    PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
    PATIENTS.ID AS PATIENT_ID,
    patients.profile_id as profile_id,
    email
    
    

  FROM INVOICES
  JOIN APPOINTMENTS ON APPOINTMENTS.ID = INVOICES.APPOINTMENT_ID
  JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
  JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID 
    where appointments.patient_id = $1 offset $2 limit $3`,
      [patientId, offset, limit]
    );

    res
      .status(200)
      .json({ data: result.rows, metaData: { totalPages: totalPages } });
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal server error: error " + error.message);
  }
});

export default router;
