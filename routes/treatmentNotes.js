import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import {
  createTreatmentNoteValidationSchema,
  updateTreatmentNoteValidationSchema,
} from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.get(
  `/viewAll:id`,
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare(["page", "pageSize"]),

  async (req, res) => {
    const patient_Id = req.params.id;
    const limit = parseInt(req.query.pageSize);
    const offset = (parseInt(req.query.page) - 1) * limit;

    try {
      const totalRowCount = await pool.query(
        `select count(*) from treatment_notes where patient_id = $1`,
        [patient_Id]
      );

      console.log(totalRowCount.rows[0].count);
      const totalPages = Math.max(
        Math.ceil(parseInt(totalRowCount.rows[0].count) / limit),
        1
      );
      const result = await pool.query(
        `SELECT * FROM treatment_notes where patient_id = $1
       order by id desc
      offset $2 limit $3`,
        [patient_Id, offset, limit]
      );
      res
        .status(200)
        .json({ data: result.rows, metaData: { totalPages: totalPages } });
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.post(
  "/create:id",
  validationRequestBodyMiddleWare(createTreatmentNoteValidationSchema),
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const patient_id = req.params.id;
    const {
      title,
      date,
      subjective,
      objective,
      assessment,
      plan,
      additional_notes,
    } = req.validatedData;

    try {
      const result = await pool.query(
        `INSERT INTO treatment_notes(title,date,subjective,objective,assessment,plan,additional_notes,patient_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          title,
          date,
          subjective,
          objective,
          assessment,
          plan,
          additional_notes,
          patient_id,
        ]
      );

      if (result.rowCount > 0) {
        res.status(201).json(result.rows[0]);
      } else
        res
          .status(400)
          .json("There is a problem with the data that is being sent over");
    } catch (error) {
      console.error(error), res.status(500).json(error.message);
    }
  }
);

router.patch(
  "/update:id",
  validationRequestBodyMiddleWare(updateTreatmentNoteValidationSchema),
  validationRequestParamsMiddleWare,
  async (req, res) => {
    await updateRecords(req, res, "treatment_notes", "id");
  }
);

router.delete(
  "/delete:id",
  validationRequestParamsMiddleWare,
  async (req, res) => {
    const treatmentNoteId = req.params.id;

    try {
      const result = await pool.query(
        "DELETE FROM treatment_notes where id = $1",
        [treatmentNoteId]
      );

      if (result.rowCount > 0) {
        res.status(200).json("Successfully deleted treatment note");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  }
);

router.get("/view:id", validationRequestParamsMiddleWare, async (req, res) => {
  const treatmentNoteId = req.params.id;
  try {
    const result = await pool.query(
      "SELECT * FROM treatment_notes where id = $1",
      [treatmentNoteId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

export default router;
