import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create:id", async (req, res) => {
  //create client endpoint

  const { first_name, last_name, contact_number, email } = req.body;
  const profileId = req.params.id;

  try {
    const result = await pool.query(
      "INSERT INTO patients(first_name,last_name,email,contact_number,profile_id) values($1,$2,$3,$4,$5) returning * ",
      [first_name, last_name, email, contact_number, profileId]
    );
    if (result.rowCount > 0) {
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.delete("/delete:id", async (req, res) => {
  try {
    await pool.query("delete from patients where id = $1", [req.params.id]); //will have to sort out delete cascades later on in db design
    res
      .status(201)
      .json({ success: true, message: "patient successfully deleted" });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error });
  }
});

router.get("/viewAll:id", async (req, res) => {
  //get all patients endpoint
  const profileId = req.params.id;

  try {
    const result = await pool.query(
      "select * from patients where profile_id= $1 ",
      [profileId]
    );

    if (result.rowCount > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/viewPatient:id", async (req, res) => {
  try {
    console.log(req.params.id);

    const result = await pool.query("select * from patients where id = $1", [
      req.params.id,
    ]);

    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(204).json();
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.patch("/update:id", async (req, res) => {
  await updateRecords(req, res, "patients", "id");
});

export default router;
