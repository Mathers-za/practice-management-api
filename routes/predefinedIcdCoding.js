import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import { validationMiddleWare } from "../helperFunctions/middlewareHelperFns.js";
import { icdCodevalidationSchema } from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.post(
  "/create:id",
  validationMiddleWare(icdCodevalidationSchema),
  async (req, res) => {
    const appTypeid = req.params.id;
    const { icd10_code, procedural_code, price } = req.body;

    try {
      const result = await pool.query(
        "INSERT INTO predefined_icd10_codes(icd10_code,procedural_code,price,appointment_type_id)VALUES($1,$2,$3,$4) returning * ",
        [icd10_code, procedural_code, price, appTypeid]
      );

      if (result.rowCount > 0) {
        res.status(201).json(result.rows[0]);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

router.patch(
  "/update:id",
  validationMiddleWare(icdCodevalidationSchema),
  async (req, res) => {
    updateRecords(req, res, "predefined_icd10_codes", "id");
  }
);

router.get("/view:id", async (req, res) => {
  //this get route gets all predfined icd_10 code per appointment type
  const appointment_type_id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT * FROM predefined_icd10_codes where appointment_type_id = $1 ",
      [appointment_type_id]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(204).json();
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

router.delete("/delete:id", async (req, res) => {
  //chnaged
  const preDfinedIcd10Id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM predefined_icd10_codes WHERE id = $1 returning *`,
      [preDfinedIcd10Id]
    );
    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
  }
});

router.post(`/batchCreate:id`, async (req, res) => {
  const arrayOfIcds = req.body;
  const appTypeid = req.params.id;

  try {
    const arrayOfPromises = arrayOfIcds.map(async (icdObj) => {
      await pool.query(
        "INSERT INTO predefined_icd10_codes(icd10_code,procedural_code,price,appointment_type_id)VALUES($1,$2,$3,$4)",
        [icdObj.icd10_code, icdObj.procedural_code, icdObj.price, appTypeid]
      );
    });

    const result = await Promise.all(arrayOfPromises);
    console.log(result);
    res.status(201).json(result);
  } catch (error) {
    console.error(error.message);
  }
});

router.delete("/batchDeletion", async (req, res) => {
  const arrayOfIcdsToDelete = req.body;

  console.log("made it here");
  console.log(arrayOfIcdsToDelete);
  if (!arrayOfIcdsToDelete) {
    res.status(400).json({ message: " this is thre porblem" });
  }
  try {
    const arrayOfPromises = arrayOfIcdsToDelete.map(async (id) => {
      await pool.query("DELETE FROM predefined_icd10_codes WHERE id = $1", [
        id,
      ]);
    });

    await Promise.all(arrayOfPromises);
    res.status(200).json("All icds deleted");
  } catch (error) {
    console.error(error.message);
  }
});

export default router;
