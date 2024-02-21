import express from "express";
import pool from "../config/dbconfig.js";
import { v4 as uuidv4 } from "uuid";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  //post request creates invoice entry (includes appontment_fk to indicate which appointment the invoice belongs to.)
  const invoiceNumber = "INV-" + uuidv4().slice(0, 6);
  console.log(invoiceNumber);

  const {
    amount_due,
    amount_paid,
    invoice_total,
    payment_method,
    payment_status,
    notes,
    invoice_date,

    appointmentId,
    icdCodesId,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO invoices(invoice_number,invoice_date,invoice_total,amount_due,
        amount_paid,payment_method,notes,icd10_codes_id,appointment_id,payment_status)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        invoiceNumber,
        invoice_date,
        invoice_total,
        amount_due,
        amount_paid,
        payment_method,
        notes,
        icdCodesId,
        appointmentId,
        payment_status,
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

router.get("/view", async (req, res) => {
  //read route with a dyamic sql query that allows data retrieval based on diffrent filtering requirments. Reduces the need for reprtive get requests
  const { profile_id, patient_id, startDate, endDate } = req.query;
  const conditions = [];
  const values = [];

  if (profile_id) {
    conditions.push(`profile_id = $${conditions.length + 1}`);
    values.push(parseInt(profile_id));
  }

  if (patient_id) {
    conditions.push(`patient_id = $${conditions.length + 1}`);
    values.push(parseInt(patient_id));
  }
  if (startDate) {
    conditions.push(`invoice_date >= $${conditions.length + 1}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`invoice_date <= $${conditions.length + 1}`);
    values.push(endDate);
  }

  let query = `SELECT *
    FROM INVOICES AS INV
    JOIN APPOINTMENTS AS APP ON INV.APPOINTMENT_ID = APP.ID
    JOIN PATIENTS AS PAT ON PAT.ID = APP.PATIENT_ID
    JOIN USER_PROFILE AS PROF ON PROF.ID = PAT.PROFILE_ID `;

  if (conditions.length > 0) {
    query += " where " + conditions.join(" AND ");
  }
  console.log(query);
  console.log(values);

  try {
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      res.status(200).json({
        success: true,
        message: "successfully retrieved data",
        data: result.rows,
      });
    } else {
      res.status(404).json({ message: "Data does not exist" });
    }
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.patch("/updateInvoice:id", async (req, res) => {
  updateRecords(req, res, "invoices", "id");
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
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

export default router;
