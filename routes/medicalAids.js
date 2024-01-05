import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  const {
    gov_id,
    medAidName,
    medAidScheme,
    medAidNum,
    mainMemName,
    mainMemSurname,

    mainMemGovId,
    patient_id,
  } = req.body;

  const insertQuery = `
   INSERT INTO medical_aid(
        gov_id, medaid_name, medaid_scheme, medaid_number, 
        mainmem_name, mainmem_surname, mainmem_gov_id, patient_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
`;
  //pateint_id(fprgein key) = id of pateint
  try {
    const result = await pool.query(insertQuery, [
      gov_id,
      medAidName,
      medAidScheme,
      medAidNum,
      mainMemName,
      mainMemSurname,

      mainMemGovId,
      patient_id,
    ]);
    res.status(201).json({
      success: true,
      message: "successfully created medical aid entry",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "internal server error" });
  }
});

router.patch("/update/:id", async (req, res) => {
  await updateRecords(req, res, "medical_aid", "id");
});

router.get("/details/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "select * from medical_aid where patient_id = $1",
      [id]
    );
    res.status(201).json({
      succes: true,
      message: "successfully retrieved data",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ succes: false, message: "internal server error" });
  }
});

export default router;
