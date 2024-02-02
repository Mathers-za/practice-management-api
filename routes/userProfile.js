import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router(); //no delete route- need to fighure out how to cascade delete while arching poetnetially important info

router.post("/createProfile", async (req, res) => {
  const { first_name, last_name, profile_email, contact_num, council_reg_num } =
    req.body;
  const query =
    "INSERT INTO user_profile(first_name,last_name, profile_email,contact_num,user_id,council_reg_num)VALUES($1,$2,$3,$4,$5,$6) returning *";

  try {
    const result = await pool.query(query, [
      first_name,
      last_name,
      profile_email,
      contact_num,
      req.user.id,
      council_reg_num,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "user_profile", "id");
});

router.get("/view", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_profile where user_id = $1",
      [req.user.id]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json(error);
  }
});

export default router;
