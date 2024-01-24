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
      res
        .status(200)
        .json({ message: "successfully retrieved data", data: result.rows[0] });
    } else {
      res.status(404).json({ message: "Data does not exist" });
    }
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ message: "interal server error", error: error.message });
    throw error;
  }
});

router.post("/create:id", async (req, res) => {
  const profile_id = req.params.id;
  const { practice_name, practice_num, practice_address, billing_address } =
    req.body;

  try {
    const result = await pool.query(
      "INSERT INTO practice_details(practice_name,practice_num,practice_address,billing_address,profile_id)values($1,$2,$3,$4,$5)",
      [
        practice_name,
        practice_num,
        practice_address,
        billing_address,
        profile_id,
      ]
    );

    if (result.rowCount > 0) {
      res.status(201).json({
        success: true,
        message: "successfully created resource",
        data: result.rows[0],
      });
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
  console.log("patch request was initiated");
});

export default router;
