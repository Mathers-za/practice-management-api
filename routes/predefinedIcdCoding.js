import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  const appTypeid = req.params.id;
  const { icdCode, procCode, price } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO predefined_icd10_codes(icd10_code,procedural_code,price,appointment_type_id)VALUES($1,$2,$3,$4) ",
      [icdCode, procCode, price, appTypeid]
    );

    if (result.rowCount > 0) {
      res.status(201).json({
        success: true,
        message: "Successfully created invoice",
        data: result.rows[0],
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Failed to create invoice" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.patch("/update:id", async (req, res) => {
  updateRecords(req, res, "predefined_icd10_codes", "id");
});

export default router;
