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
        message: "Successfully created code",
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

router.delete("/delete", async (req, res) => {
  //route deltes icd_10 entries based on whether appointment_id or lineItemId is provided (use cases- the user may wish to delete all predined codes for a specific type of appointment or which to simply delete one line of the predfined code)
  const { appointment_id, lineItemId } = req.body;

  const conditions = [];
  const values = [];

  if (appointment_id) {
    conditions.push(`appointment_id = $${conditions.length + 1}`);
    values.push(appointment_id);
  }
  if (lineItemId) {
    conditions.push(`id = $${conditions.length + 1}`);
    values.push(lineItemId);
  }
  console.log(conditions);
  console.log(values);

  let query = "DELETE FROM predefined_icd10_codes where ";

  if (conditions.length > 0) {
    query += conditions.join(" AND ");
  } else {
    query = undefined;
  }

  try {
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      res.status(200).json({ success: true, message: "successful deletion" });
    } else {
      res.status(404).json({
        success: false,
        message: "Does not exist therefore cannot delete",
      });
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

router.get("/view:id", async (req, res) => {
  //this get route gets all predfined icd_10 code per appointment type
  const appointment_type_id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT * FROM predefined_icd10_codes where appointment_type_id = $1",
      [appointment_type_id]
    );

    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ success: true, message: "Data retrieved", data: result.rows });
    } else {
      res.status(404).json({
        message: "no data found id does not exist",
      });
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

export default router;
