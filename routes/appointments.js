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

router.get("/filter:id", async (req, res) => {
  const data = req.query;
  const profileId = req.params.id;
  console.log(req.query);

  try {
    const dataArray = Object.keys(data);
    console.log("the value of data array is" + dataArray);
    let dynamicFilter = [];
    const theValues = Object.values(data);
    let placeHolderIndex = 1;

    if (dataArray.includes("name")) {
      dynamicFilter.push(
        `(patients.first_name =$${placeHolderIndex} or patients.last_name = $${placeHolderIndex}) `
      );
      placeHolderIndex += 1;
    }

    if (dataArray.includes("start_date")) {
      dynamicFilter.push(
        `(appointment_date  >= $${placeHolderIndex} and appointment_date <= $${
          placeHolderIndex + 1
        }) `
      );
      placeHolderIndex += 2;
    }
    theValues.push(profileId);
    dynamicFilter.push(`user_profile.id = $${placeHolderIndex}`);

    dynamicFilter = dynamicFilter.join(" AND ");
    console.log("the dynamic string is" + dynamicFilter);
    console.log("the value sthat go with it are" + theValues);

    const queryString = `SELECT APPOINTMENT_TYPE.PRICE,
  PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
  PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
  APPOINTMENTS.END_TIME,
  USER_PROFILE.FIRST_NAME AS PRACTITIONER_FIRST_NAME,
  USER_PROFILE.LAST_NAME AS PRACTITIONER_LAST_NAME, 
  PRACTICE_DETAILS.PRACTICE_ADDRESS,
  APPOINTMENT_TYPE.APPOINTMENT_NAME,
  APPOINTMENTS.APPOINTMENT_DATE,
  APPOINTMENTS.START_TIME
  FROM APPOINTMENTS
  JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
  JOIN USER_PROFILE ON USER_PROFILE.ID = PATIENTS.PROFILE_ID
  JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
  JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.PROFILE_ID = USER_PROFILE.ID where ${dynamicFilter}`;

    const result = await pool.query(queryString, theValues);
    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else res.status(200).json([]);
  } catch (error) {
    console.error(error.message);
  }
});

export default router;
