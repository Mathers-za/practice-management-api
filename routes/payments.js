import express from "express";
import pool from "../config/dbconfig.js";

const router = express.Router();

router.get(`/view:id`, async (req, res) => {
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

router.post(`/create:id`, async (req, res) => {
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
});

router.delete(`/delete:id`, async (req, res) => {
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
});

export default router;
