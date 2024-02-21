import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post(`/create:id`, async (req, res) => {
  const appointmentId = req.params.id;
  const { icd_10_code, procedural_codes, price } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO icd_10_codes(icd_10_code,procedural_codes,price,appointment_id)
        values($1,$2,$3,$4) RETURNING * `,
      [icd_10_code, procedural_codes, price, appointmentId]
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
  //get all icd-10 codes for specific appointment(appointments.id)
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM icd_10_codes where appointment_id = $1 `,
      [appointmentId]
    );

    if (result.rowCount > 0) {
      res.send(200).json(result.rows);
    } else {
      res.status(204).json();
    } //status sent back if resource not found ie (no codes for appointment exist yet)
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.patch(`/update:id`, async (req, res) => {
  await updateRecords(req, res, "icd_10_codes", "id");
});

router.delete(`/delete:id`, async (req, res) => {
  //deletes specific code where id is specified
  const icd10Id = req.params.id;

  try {
    const result = await pool.query(`DELETE FROM icd_10_codes where id = $1 `, [
      icd10Id,
    ]);

    if (result.rowCount > 0) {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

export default router;
