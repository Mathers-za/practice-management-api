import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import { patientAdditonalInformationValidationSchema } from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.get("/view:id", validationRequestParamsMiddleWare, async (req, res) => {
  const patientId = req.params.id;

  try {
    const result = await pool.query(
      `select * from additional_patient_information where patient_id = $1`,
      [patientId]
    );
    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else res.status(204).json();
  } catch (error) {
    res
      .status(500)
      .json({ message: "internal server error", error: error.message });
  }
});

router.post(
  "/create:id",
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(patientAdditonalInformationValidationSchema),
  async (req, res) => {
    const patientId = req.params.id;
    const { date_of_birth, bio, billing_address, title, initials, gender } =
      req.validatedData;

    try {
      const result = await pool.query(
        `insert into additional_patient_information(date_of_birth,bio,billing_address,title,initials,gender,patient_id)values($1,$2,$3,$4,$5,$6,$7) returning * `,
        [
          date_of_birth,
          bio,
          billing_address,
          title,
          initials,
          gender,
          patientId,
        ]
      );

      if (result.rowCount > 0) {
        res.status(201).json(result.rows[0]);
      }
    } catch (error) {
      res.status(500).json({
        message:
          "Internal server error has occured. Please contact support if the problem persists",
        error: error.message,
      });
      console.error(error);
    }
  }
);

router.patch(
  "/update:id",
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(patientAdditonalInformationValidationSchema),
  async (req, res) => {
    await updateRecords(
      req,
      res,
      "additional_patient_information",
      "patient_id"
    );
  }
);

export default router;
