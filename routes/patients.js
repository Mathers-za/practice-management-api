import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  //create client endpoint

  const { firstName, lastName, contactNumber, email } = req.body;
  const profileId = req.params.id;

  try {
    const data = await pool.query(
      "INSERT INTO patients(first_name,last_name,email,contact_number,profile_id) values($1,$2,$3,$4,$5) returning * ",
      [firstName, lastName, email, contactNumber, profileId]
    );
    res
      .status(201)
      .json({ success: true, message: "patient successfuly created" });
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ success: false, message: "failed to create user" });
  }
});

router.delete("/delete:id", async (req, res) => {
  //delete cleint

  try {
    await pool.query("delete from patients where id = $1", [req.params.id]);
    res
      .status(201)
      .json({ success: true, message: "patient succesfully deleted" });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error });
  }
});

router.get("/all:id", async (req, res) => {
  //get all patients endpoint
  const profileId = req.params.id;
  try {
    const result = await pool.query(
      "select * from patients where profile_id= $1",
      [profileId]
    );
    res.status(201).json({
      success: true,
      message: "successfuly read all patients",
      data: result.rows,
      cookie: req.user.id,
    });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error });
  }
});

router.get("/patient:id", async (req, res) => {
  try {
    console.log(req.user);

    const result = await pool.query("select * from patients where id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      res
        .status(404)
        .json({ success: false, message: "patient does not exist" });
    } else {
      res.status(201).json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error });
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "patients", "id");
});

export default router;
