import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import { validationMiddleWare } from "../helperFunctions/middlewareHelperFns.js";
import { medicalAidValidation } from "../helperFunctions/validationSchemas.js";
const router = express.Router();

router.post(
  "/create:id",
  validationMiddleWare(medicalAidValidation),
  async (req, res) => {
    const patientId = req.params.id;
    const cleanedData = req.validatedData;
    const {
      gov_id,
      medaid_name,
      medaid_scheme,
      medaid_number,
      mainmem_name,
      mainmem_surname,
      mainmem_gov_id,
    } = cleanedData;

    const insertQuery = `
   INSERT INTO medical_aid(
        gov_id, medaid_name, medaid_scheme, medaid_number, 
        mainmem_name, mainmem_surname, mainmem_gov_id, patient_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
`;

    try {
      const result = await pool.query(insertQuery, [
        gov_id,
        medaid_name,
        medaid_scheme,
        medaid_number,
        mainmem_name,
        mainmem_surname,
        mainmem_gov_id,
        patientId,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "internal server error" });
    }
  }
);

router.patch(
  "/update:id",
  validationMiddleWare(medicalAidValidation),
  async (req, res) => {
    await updateRecords(req, res, "medical_aid", "id");
  }
);

router.get("/view:id", async (req, res) => {
  const patient_id = req.params.id;

  try {
    const result = await pool.query(
      "select * from medical_aid where patient_id = $1",
      [patient_id]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ succes: false, message: "internal server error" });
  }
});

export default router;
