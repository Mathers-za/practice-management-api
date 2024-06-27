import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import { validationMiddleWare } from "../helperFunctions/middlewareHelperFns.js";
import {
  createPatientValidationSchema,
  updatePatientValidationSchema,
} from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.post(
  "/create:id",
  validationMiddleWare(createPatientValidationSchema),
  async (req, res) => {
    //create client endpoint
    const cleanedData = createPatientValidationSchema.cast(req.body);
    const { first_name, last_name, contact_number, email } = cleanedData;
    const profileId = req.params.id;

    try {
      const result = await pool.query(
        "INSERT INTO patients(first_name,last_name,email,contact_number,profile_id) values($1,$2,$3,$4,$5) returning * ",
        [first_name, last_name, email, contact_number, profileId]
      );
      if (result.rowCount > 0) {
        res.status(201).json(result.rows[0]);
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

router.get("/viewAll:id", async (req, res) => {
  //get all patients endpoint
  const profileId = req.params.id;

  try {
    const result = await pool.query(
      "select * from patients where profile_id= $1 and soft_delete = false ",
      [profileId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(204).json();
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

router.get("/viewPatient:id", async (req, res) => {
  try {
    console.log(req.params.id);

    const result = await pool.query("select * from patients where id = $1", [
      req.params.id,
    ]);

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
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

router.patch(
  "/update:id",
  validationMiddleWare(updatePatientValidationSchema),
  async (req, res) => {
    await updateRecords(
      req,
      res,
      "patients",
      "id",
      updatePatientValidationSchema
    );
  }
);

router.delete(`/delete:id`, async (req, res) => {
  const { deleteCorrespondingAppointments } = req.query;
  const patient_id = req.params.id;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id not supplied" });
  }

  try {
    let arrayOfPromises = [];

    if (deleteCorrespondingAppointments === "true") {
      console.log("made it into if block");
      const appointments = await pool.query(
        `SELECT id FROM appointments WHERE patient_id = $1`,
        [patient_id]
      );

      if (appointments.rowCount > 0) {
        arrayOfPromises = appointments.rows.map((appointment) => {
          return pool.query(
            "UPDATE appointments SET soft_delete = true WHERE id = $1",
            [appointment.id]
          );
        });
      }
    }
    await pool.query("update patients set soft_delete = true WHERE id = $1", [
      patient_id,
    ]);

    await Promise.all(arrayOfPromises);

    res.status(200).json({
      message: deleteCorrespondingAppointments
        ? "Patient and corresponding appointments were successfully deleted"
        : "Patient successfully deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete(`/delete:id`, async (req, res) => {
  const { deleteCorrespondingAppointments } = req.query;
  const patient_id = req.params.id;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id not supplied" });
  }

  try {
    let arrayOfPromises = [];

    if (deleteCorrespondingAppointments === "true") {
      console.log("made it into if block");
      const appointments = await pool.query(
        `SELECT id FROM appointments WHERE patient_id = $1`,
        [patient_id]
      );

      if (appointments.rowCount > 0) {
        arrayOfPromises = appointments.rows.map((appointment) => {
          return pool.query(
            "UPDATE appointments SET soft_delete = true WHERE id = $1",
            [appointment.id]
          );
        });
      }
    }
    await pool.query("update patients set soft_delete = true WHERE id = $1", [
      patient_id,
    ]);

    await Promise.all(arrayOfPromises);

    res.status(200).json({
      message: deleteCorrespondingAppointments
        ? "Patient and corresponding appointments were successfully deleted"
        : "Patient successfully deleted",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
