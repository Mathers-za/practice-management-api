import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/createAppointment", async (req, res) => {
  const {
    appointment_date,
    start_time,
    end_time,
    appointment_type_id,
    patient_id,
  } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO appointments(appointment_date,start_time,end_time,appointment_type_id,patient_id)values($1,$2,$3,$4,$5) returning *",
      [appointment_date, start_time, end_time, appointment_type_id, patient_id]
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
});

router.get("/ptAppointments:id", async (req, res) => {
  //retrives all appointments and appointmnt related data for specific patient
  const patient_id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * from appointments as apps 
      inner join appointment_type as apptype 
      on apps.appointment_type_id = apptype.id
	  inner join patients on apps.patient_id = patients.id 
inner join user_profile on patients.profile_id = user_profile.id
      where patient_id = $1`,
      [patient_id]
    );

    if (result.rowCount > 1) {
      res.status(200).json({
        success: true,
        message: "succeessfully retrieved the patients appointments",
        data: result.rows,
      });
    } else {
      res.status(200).json({ message: " No data" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "internal server error",
      error: error.message,
    });
  }
});

router.get("/viewByDate", async (req, res) => {
  //retrives all users appointments based on a date filtering
  const { startDate, endDate, profile_id } = req.query;

  try {
    const result = await pool.query(
      `SELECT * from appointments as apps 
      inner join appointment_type as apptype 
      on apps.appointment_type_id = apptype.id
	  inner join patients on apps.patient_id = patients.id 
inner join user_profile on patients.profile_id = user_profile.id
      where profile_id= $1
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
});

router.get("/viewSpecific:id", async (req, res) => {
  //retreves specific appointment based on appoientmnt id
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
});

router.patch("/updateAppointment:id", async (req, res) => {
  //updates appointment info
  await updateRecords(req, res, "appointments", "id");
});

router.delete("/deleteAppointment:id", async (req, res) => {
  //deletes appointments based on id
  const appointment_id = req.params.id;

  try {
    const result = await pool.query("DELETE FROM appointments where id = $1", [
      appointment_id,
    ]);

    if (result.rowCount > 0) {
      res
        .status(204)
        .json({ success: true, message: "successfully deleted appointment" });
    } else {
      res
        .status(404)
        .json({ success: false, message: "appointment not found" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "failed to delete appointment",
      error: error.message,
    });
  }
});

export default router;
