import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";
import {
  validationRequestBodyMiddleWare,
  validationRequestParamsMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import { icdCodevalidationSchema } from "../helperFunctions/validationSchemas.js";

const router = express.Router();

router.get(`/view:id`, validationRequestParamsMiddleWare, async (req, res) => {
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

router.patch(
  `/update:id`,
  validationRequestParamsMiddleWare,
  validationRequestBodyMiddleWare(icdCodevalidationSchema),

  async (req, res) => {
    await updateRecords(req, res, "financials", "appointment_id");
  }
);

export default router;
