import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.get(`/viewAll:id`, async (req, res) => {
  const patient_Id = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM treatment_notes where patient_id = $1`,
      [patient_Id]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.post("/create:id", async (req, res) => {
  const patient_id = req.params.id;
  const {
    title,
    date,
    subjective,
    objective,
    assessment,
    plan,
    additional_notes,
  } = req.body;

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
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "treatment_notes", "id");
});

router.delete("/delete:id", async (req, res) => {
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
});

router.get("/view:id", async (req, res) => {
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