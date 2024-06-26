import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  const { appointment_name, duration, price } = req.body;
  const profile_id = req.params.id;

  try {
    const result = await pool.query(
      "INSERT INTO appointment_type(appointment_name,duration,price,profile_id)values($1,$2,$3,$4) returning * ",
      [appointment_name, duration, price, profile_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
});

router.get("/viewAll:id", async (req, res) => {
  const profile_id = req.params.id;
  try {
    const result = await pool.query(
      "SELECT * FROM appointment_type where profile_id = $1 and soft_delete = false",
      [profile_id]
    );
    if (result.rowCount > 0) {
      res.status(201).json(result.rows);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "failed to retrieve appointment types",
      error: error.message,
    });
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "appointment_type", "id");
});

router.get("/view:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      "SELECT * FROM appointment_type WHERE id=$1",
      [id]
    );
    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "internal server error",
      error: error.message,
    });
  }
});

router.delete("/delete:id", async (req, res) => {
  const appointmentId = req.params.id;

  if (!appointmentId) {
    res.status(400).json({ message: "Appointment type id not supplied" });
    return;
  }

  try {
    await pool.query(
      "update appointment_type set soft_delete = true where id = $1",
      [appointmentId]
    );
    res.status(200).json({ message: "Appointment type successfully deleted" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.get(`/getAppTypesAndThierIcds:id`, async (req, res) => {
  const profileId = req.params.id;
  const limit = parseInt(req.query.pageSize);
  const offset = (parseInt(req.query.page) - 1) * limit;

  if (!profileId) {
    res
      .status(400)
      .json({ message: "Profile id missing", name: "Bad Request" });
    return;
  }

  async function getIcds(appointmentTypesObj) {
    const promises = appointmentTypesObj.rows.map(async (type) => {
      const myArr = await pool.query(
        "SELECT * FROM predefined_icd10_codes WHERE appointment_type_id = $1",
        [type.id]
      );

      return myArr.rows;
    });

    return Promise.all(promises);
  }

  try {
    const totalRowCount = await pool.query(
      "select count(*) from appointment_type where profile_id = $1 and soft_delete = false",
      [profileId]
    );
    const totalPages = Math.max(
      Math.ceil(parseInt(totalRowCount.rows[0].count) / limit),
      1
    );
    const appointmentTypeData = await pool.query(
      "SELECT * FROM appointment_type WHERE profile_id= $1 and soft_delete = false order by appointment_type.id desc offset $2 limit $3",
      [profileId, offset, limit]
    );
    if (appointmentTypeData.rowCount > 0) {
      const icdArray = await getIcds(appointmentTypeData);
      res.status(200).json({
        data: {
          predefinedIcd10Data: icdArray,
          appointmentTypeData: appointmentTypeData.rows,
        },
        metaData: { totalPages: totalPages },
      });
    } else {
      res.status(200).json({ data: [], metaData: { totalPages: totalPages } });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error: error });
  }
});

export default router;
