import express from "express";
import pool from "../config/dbconfig.js";
import viewAll from "../helperFunctions/getAll.js";

const router = express.Router();

router.post("/createAppointment", async (req, res) => {
  const { date, startTime, endTime, appTypeId, patientId } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO appointments(appointment_date,start_time,end_time,appointment_type_id,patient_id)values($1,$2,$3,$4,$5)",
      [date, startTime, endTime, appTypeId, patientId]
    );

    res.status(201).json({
      success: true,
      message: "appointment successfully created",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "internal server error",
      error: error.message,
    });
  }
});

router.get("/viewAll:id", async (req, res) => {
  await viewAll(req, res, "appointments", "patient_id");
});

export default router;
