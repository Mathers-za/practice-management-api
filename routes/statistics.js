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
      const appointmentsResult = await pool.query(
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

      const invoiceResults = await pool.query(
        `SELECT  count(*) as total_num,
    SUM(CASE WHEN invoice_status = 'Paid' THEN 1 ELSE 0 END) AS num_invoices_Paid,
	sum(case when invoice_status = 'Sent' then 1 else 0 end) as num_invoices_sent,
	sum( case when invoice_status = 'In progress' then 1 else 0 end) as num_invoices_in_progress
FROM invoices
JOIN appointments ON appointments.id = invoices.appointment_id
JOIN patients ON patients.id = appointments.patient_id
WHERE patients.profile_id = $1 and appointment_date <= $2 and appointment_date >= $3 `,
        [profileId, end_date, start_date]
      );

      res.status(200).json({
        appointmentCount: appointmentsResult.rows[0].total_num_appointments,
        totalValue: appointmentsResult.rows[0].appointments_amount_total,
        totalCollected: appointmentsResult.rows[0].appointments_amount_paid,
        totalOutstanding: appointmentsResult.rows[0].appointments_amount_due,
        totalDiscount: appointmentsResult.rows[0].appointments_total_discounts,
        totalInvoicesPaid: invoiceResults.rows[0].num_invoices_paid,
        totalInvoicesSent: invoiceResults.rows[0].num_invoices_sent,
        totalInvoices: invoiceResults.rows[0].total_num,
        totalInvoicesInProgress:
          invoiceResults.rows[0].num_invoices_in_progress,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "internal server error", error: error.message });
    }
  }
);

export default router;
