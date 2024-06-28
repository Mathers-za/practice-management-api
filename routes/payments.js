import express from "express";
import pool from "../config/dbconfig.js";
import { validate } from "uuid";
import {
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";

const router = express.Router();

router.get(`/view:id`, validationRequestParamsMiddleWare, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM payments where appointment_id = $1`,
      [appointmentId]
    );
    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else res.status(204).json();
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.post(
  `/create:id`,
  validationRequestParamsMiddleWare,
  async (req, res) => {
    //TODO add payment req.body validation in this file
    const appointmentId = req.params.id;
    const { amount, payment_method, payment_reference } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO payments(amount,payment_method,appointment_id,payment_reference)VALUES($1,$2,$3,$4) RETURNING * `,
        [amount, payment_method, appointmentId, payment_reference]
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

router.delete(
  `/delete:id`,
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const paymentId = req.params.id;

    try {
      const result = await pool.query(`DELETE FROM payments WHERE id = $1`, [
        paymentId,
      ]);

      if (result.rowCount > 0) {
        res.status(200).json("Deletion was a success");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.get(
  `/getAllProfilePayments:id`,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare([
    "start_date",
    "end_date",
    "page",
    "pageSize",
  ]),
  async (req, res) => {
    const profileId = req.params.id;
    const startDateSearch = req.query.start_date;
    const endDateSearch = req.query.end_date;
    const limit = parseInt(req.query.pageSize);
    const offset = (parseInt(req.query.page) - 1) * limit;

    try {
      const totalRowCount = await pool.query(
        `select count(*)  FROM PAYMENTS 
    JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
    JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where patients.profile_id = $1 and payment_date >= $2 and payment_date <= $3 `,
        [profileId, startDateSearch, endDateSearch]
      );

      const totalPages = Math.max(
        Math.ceil(parseInt(totalRowCount.rows[0].count) / limit),
        1
      );

      const result = await pool.query(
        `SELECT PAYMENTS.ID AS PAYMENT_ID,
    APPOINTMENTS.ID AS APPOINTMENT_ID,
    PAYMENT_METHOD,
    PAYMENT_DATE,
    AMOUNT,
    PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
    PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
    APPOINTMENT_TYPE_ID,
    PROFILE_ID
    
  FROM PAYMENTS 
  JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
  JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where patients.profile_id = $1 and payment_date >= $2 and payment_date <= $3 offset $4 limit $5 `,
        [profileId, startDateSearch, endDateSearch, offset, limit]
      );

      res
        .status(200)
        .json({ data: result.rows, metaData: { totalPages: totalPages } });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

export default router;
