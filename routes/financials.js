import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.get(`/view:id`, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `select * from financials where appointment_id = $1`,
      [appointmentId]
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

router.patch(`/update:id`, async (req, res) => {
  //pass appoitnmentId in params since only one unique appointment_id field will exist at any given time in financials since its financial data per appointment which there can only be one off
  await updateRecords(req, res, "financials", "appointment_id");
});

//financials creation and most of the updating is taken care of by trigger in the db except for discount. that has to be manually updated;
//deletion will occur automatically if the appointment that is linked to financials, via the forgein key, is deleted

export default router;
