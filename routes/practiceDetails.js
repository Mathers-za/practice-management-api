import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.get("/view", async (req, res) => {
  try {
    const results = await pool.query(
      `SELECT pd.id, pd.practice_name, pd.practice_num,pd.practice_address,pd.billing_address,
                        pd.profile_id,up.user_id from practice_details AS pd 
                        inner join user_profile AS up ON pd.profile_id = up.id 
                        WHERE up.user_id = $1 `,
      [req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "successfully retrieved practice details",
      data: results.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ success: false, message: "failed to retrieve practice details" });
  }
});

router.post("/createPractice:id", async (req, res) => {
  const { pracName, pracNum, pracAddress, pracBillingAddress } = req.body;
  const profile_id = req.params.id;
  console.log(pracName);

  try {
    const results = await pool.query(
      "INSERT INTO practice_details(practice_name,practice_num,practice_address,billing_address,profile_id)values($1,$2,$3,$4,$5)",
      [pracName, pracNum, pracAddress, pracBillingAddress, profile_id]
    );

    res.status(201).json({
      success: true,
      message: "succeesfully created practice",
      data: results.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ success: false, message: "failed to create practice." });
  }
});

export default router;
