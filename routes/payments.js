import express from "express";
import pool from "../config/dbconfig.js";

const router = express.Router();

router.get(`/view:id`, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM payments where appointment_id = $1`,
      [appointmentId]
    );
    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else res.status(204).json();
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.post(`/create:id`, async (req, res) => {
  const appointmentId = req.params.id;
  const { amount, payment_method, payment_reference } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO payments(amount,payment_method,appointment_id,payment_reference)VALUES($1,$2,$3,$4) RETURNING * `,
      [amount, payment_method, appointmentId, payment_reference]
    );

    if (result.rowCount > 0) {
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.delete(`/delete:id`, async (req, res) => {
  const paymentId = req.params.id;

  try {
    const result = await pool.query(`DELETE FROM payments WHERE id = $1`, [
      paymentId,
    ]);

    if (result.rowCount > 0) {
      res.status(200).json("Deletion was a success");
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get(`/getAllProfilePayments:id`, async (req, res) => {
  if (!req.params.id || !req.query.start_date || !req.query.end_date) {
    res
      .status(400)
      .json({ message: "Not all paramteres or queries were supplied" });
    return;
  }

  const profileId = req.params.id;
  const startDateSearch = req.query.start_date;
  const endDateSearch = req.query.end_date;
  const limit = parseInt(req.query.pageSize);
  const offset = (parseInt(req.query.page) - 1) * limit;

  try {
    const totalRowCount = await pool.query(
      `select count(*)  FROM PAYMENTS 
    JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
    JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where patients.profile_id = $1 and payment_date >= $2 and payment_date <= $3 `,
      [profileId, startDateSearch, endDateSearch]
    );

    const totalPages = Math.max(
      Math.ceil(parseInt(totalRowCount.rows[0].count) / limit),
      1
    );

    const result = await pool.query(
      `SELECT PAYMENTS.ID AS PAYMENT_ID,
    APPOINTMENTS.ID AS APPOINTMENT_ID,
    PAYMENT_METHOD,
    PAYMENT_DATE,
    AMOUNT,
    PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
    PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
    APPOINTMENT_TYPE_ID,
    PROFILE_ID
    
  FROM PAYMENTS 
  JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
  JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where patients.profile_id = $1 and payment_date >= $2 and payment_date <= $3 offset $4 limit $5 `,
      [profileId, startDateSearch, endDateSearch, offset, limit]
    );

    res
      .status(200)
      .json({ data: result.rows, metaData: { totalPages: totalPages } });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.get(`/filterview`, async (req, res) => {
  const filterCriteria = req.query.filterCriteria;
  const page = req.query.page || 1;
  const pageSize = req.query.limit || 10;
  const keys = Object.keys(filterCriteria);
  const valuesForQuery1 = Object.values(filterCriteria);
  const condtions = [];
  const offset = (page - 1) * pageSize;
  valuesForQuery1.push(pageSize, offset);
  const valuesForQuery2 = Object.values(filterCriteria);

  keys.forEach((key, index) => {
    if (key === "start_date") {
      condtions.push(`payment_date >= $${index + 1}`);
    } else if (key === "end_date") {
      condtions.push(`payment_date <= $${index + 1}`);
    } else {
      condtions.push(`${key} = $${index + 1} `);
    }
  });

  const query1 = `SELECT PAYMENTS.ID AS PAYMENT_ID,
  APPOINTMENTS.ID AS APPOINTMENT_ID,
  PAYMENT_METHOD,
  PAYMENT_DATE,
  AMOUNT,
  PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
  PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
  APPOINTMENT_TYPE_ID,
  PROFILE_ID
  
FROM PAYMENTS 
JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where  ${condtions.join(
    " AND "
  )} LIMIT $${valuesForQuery1.length - 1} OFFSET $${valuesForQuery1.length}`;

  const query2 = `SELECT COUNT(*) as total FROM PAYMENTS
JOIN APPOINTMENTS ON APPOINTMENTS.ID = PAYMENTS.APPOINTMENT_ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID where  ${condtions.join(
    " AND "
  )}`;

  try {
    const [data, count] = await Promise.all([
      pool.query(query1, valuesForQuery1),
      pool.query(query2, valuesForQuery2),
    ]);

    const paginationInfo = {
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(count?.rows[0]?.total / pageSize),
      totalResults: count?.rows[0]?.total || 0,
    };

    if (data.rowCount > 0 && count) {
      res.status(200).json({ data: data.rows, metadata: paginationInfo });
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

export default router;
