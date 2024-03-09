import express from "express";
import pool from "../config/dbconfig.js";
import { v4 as uuidv4 } from "uuid";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  const invoiceNumber = "INV-" + uuidv4().slice(0, 6);
  const appointmentId = req.params.id;

  const { invoice_title, invoice_start_date, invoice_end_date, paid } =
    req.body;

  try {
    const result = await pool.query(
      `INSERT INTO invoices(invoice_number,invoice_title,invoice_start_date,invoice_end_date,
       appointment_id,paid)values($1,$2,$3,$4,$5,$6)`,
      [
        invoiceNumber,
        invoice_title,
        invoice_start_date,
        invoice_end_date,
        appointmentId,
        paid,
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
  updateRecords(req, res, "invoices", "appointment_id");
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

export default router;
