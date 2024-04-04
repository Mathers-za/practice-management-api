import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.get("/view:id", async (req, res) => {
  const profileId = req.params.id;

  try {
    const result = await pool.query(
      "SELECT * FROM practice_details where profile_id = $1",
      [profileId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else if (result.rowCount === 0) {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ message: "interal server error", error: error.message });
    throw error;
  }
});

router.post("/create", async (req, res) => {
  const {
    practice_name,
    practice_num,
    practice_address,
    billing_address,
    profile_id,
    bank_details,
  } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO practice_details(practice_name,practice_num,practice_address,billing_address,profile_id,bank_details)values($1,$2,$3,$4,$5,$6) returning *",
      [
        practice_name,
        practice_num,
        practice_address,
        billing_address,
        profile_id,
        bank_details,
      ]
    );

    if (result.rowCount > 0) {
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "failed to create practice.",
      error: error.message,
    });

    throw error;
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "practice_details", "id");
});

export default router;
