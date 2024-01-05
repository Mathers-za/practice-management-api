import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const { appName, duration, location, price } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO appointment_type(appointment_name,duration,location_at,price)values($1,$2,$3,$4) returning * ",
      [appName, duration, location, price]
    );
    res.status(201).json({
      success: true,
      message: "appointment type successfully created",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "failed to create appointment type",
      error: error.message,
    });
  }
});

router.get("/view:id", async (req, res) => {
  const profile_id = req.params.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM appointment_type where profile_id = $1",
      [profile_id]
    );
    if (rows.length > 0) {
      res.status(201).json({
        success: true,
        message: "successfully retrieved appointment types",
        data: rows,
      });
    } else {
      res
        .status(404)
        .json({ success: false, message: "appointment type does not exist" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "failed to retrieve appointment types",
      error: error.message,
    });
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "appointment_type", "id");
});

export default router;
