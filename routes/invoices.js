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
import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import {
  createInvoiceValidationSchema,
  updateInvoiceValidationSchema,
} from "../helperFunctions/validationSchemas.js";
import { CustomError } from "../helperFunctions/newClasses.js";

const router = express.Router();

router.post(
  "/create:id",
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(createInvoiceValidationSchema),
  async (req, res) => {
    const invoiceNumber = "INV-" + uuidv4().slice(0, 6);
    const appointmentId = req.params.id;
    const cleanedData = req.validatedData;
    const {
      invoice_title,
      invoice_start_date,
      invoice_end_date,
      invoice_status,
    } = cleanedData;

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
  }
);

router.get(`/view:id`, validationRequestParamsMiddleWare, async (req, res) => {
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

router.patch(
  "/update:id",
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(updateInvoiceValidationSchema),
  async (req, res) => {
    await updateRecords(req, res, "invoices", "appointment_id");
  }
);

router.delete(
  "/delete:id",
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json;
    }

    try {
      const result = await pool.query("DELETE FROM INVOICES WHERE id = $1", [
        id,
      ]);
      if (result.rowCount > 0) {
        res.status(204).json();
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.get(
  "/invoiceSetup:id",
  validationRequestParamsMiddleWare,
  async (req, res) => {
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
  }
);

router.get(`/batchview`, async (req, res) => {
  //Not acid compliant. add start and rollback
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

router.get(
  `/filteredView`,
  validationRequestQueryMiddleWare([
    "invoice_start_date",
    "invoice_end_date",
    "profile_id",
  ]),
  async (req, res) => {
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
  }
);

router.get(
  `/retrieveInvoiceStatement`,
  validationRequestQueryMiddleWare([
    "invoiceNumber",
    "profileId",
    "appointmentId",
    "patientId",
  ]),
  async (req, res) => {
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
  }
);

router.post(
  `/sendInvoiceStatment`,

  async (req, res) => {
    const {
      profileId,
      appointmentId,
      patientId,
      invoiceNumber,
      medicalAidEmailAddress, //if medicalAidEmailAddress arg is supplied, the nodemailer reciepnt will codtionally apply the medical aid email adress
    } = req.body;

    if (!profileId || !appointmentId || !patientId) {
      throw new CustomError(
        "badRequest",
        "ProfileId, appointmentId or patientId is missing from teh request body",
        400
      );
    }

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
        to: medicalAidEmailAddress
          ? medicalAidEmailAddress
          : data.generalData.patient_email,
        subject: medicalAidEmailAddress
          ? `Claims statement for ${
              data.generalData.patient_first_name +
              " " +
              (data.generalData.patient_last_name || "")
            } `
          : "Invoice Statment for your chiropractic appointment",
        text: medicalAidEmailAddress
          ? `Good day. Attached below is an invoice statement for the following patient: ${data?.medicalAidData?.medaid_number} who would like to claim from your medical aid scheme. Thank you in advance   `
          : `Please find your invoice Statement for your appointment with ${
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
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

router.get(
  `/getAllInvoicesByPatient:id`,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare(["page", "pageSize"]),
  async (req, res) => {
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
  }
);

router.get(`/medicalAidContactInformation`, async (req, res) => {
  try {
    const medicalAidData = await pool.query(
      `select * from medical_aid_contact_details`
    );
    if (medicalAidData.rowCount > 0) {
      res.status(200).json(medicalAidData.rows);
    } else
      throw new CustomError(
        "Internal Server Error",
        "error occured during the fetching of medical contact details",
        500
      );
  } catch (error) {
    console.error(error);
    res
      .json(500)
      .json({ message: "Internal server errror", error: error.message });
  }
});

export default router;
