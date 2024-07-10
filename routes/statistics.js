import express from "express";
import {
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare,
} from "../helperFunctions/middlewareHelperFns.js";
import pool from "../config/dbconfig.js";

const router = express.Router();

router.get(
  "/financialStatistics:id",
  validationRequestParamsMiddleWare,
  validationRequestQueryMiddleWare(["start_date", "end_date"]),
  async (req, res) => {
    const { start_date, end_date } = req.query;
    const profileId = req.params.id;
    try {
      const result = await pool.query(
        `select count(*) as total_num_appointments, sum(total_amount) as appointments_amount_total
, sum(amount_paid) as appointments_amount_paid, sum(amount_due) as appointments_amount_due, sum(discount) as appointments_total_discounts
from financials
join appointments ON appointments.id = financials.appointment_id 
join patients ON patients.id = appointments.patient_id
join user_profile ON user_profile.id = patients.profile_id
where appointments.soft_delete = false and user_profile.id = $1 and appointment_date <= $2 and appointment_date >= $3 
`,
        [profileId, end_date, start_date]
      );

      res.status(200).json({
        appointmentCount: result.rows[0].total_num_appointments,
        totalValue: result.rows[0].appointments_amount_total,
        totalCollected: result.rows[0].appointments_amount_paid,
        totalOutstanding: result.rows[0].appointments_amount_due,
        totalDiscount: result.rows[0].appointments_total_discounts,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "internal server error", error: error.message });
    }
  }
);

export default router;
