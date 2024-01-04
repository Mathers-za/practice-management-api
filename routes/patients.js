import express from "express";
import pool from "../config/dbconfig.js";
import updateRecords from "../helperFunctions/patchRoute.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  //create client endpoint

  const { firstName, lastName, contactNumber, email } = req.body;
  console.log(firstName);

  try {
    const data = await pool.query(
      "INSERT INTO patients(first_name,last_name,email,contact_number,user_id) values($1,$2,$3,$4,$5) returning * ",
      [firstName, lastName, email, contactNumber, req.user.id]
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

router.get("/all", async (req, res) => {
  //get all patients endpoint
  console.log(`the cookie is: ${req.user.id}`);
  try {
    const result = await pool.query(
      "select * from patients where user_id = $1",
      [req.user.id]
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

    const result = await pool.query(
      "select * from patients where id = $1 and user_id = $2",
      [req.params.id, req.user.id]
    );
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
  //the patch route works. at the moment it updates based on patient id alone- may need to add userId in future.
  await updateRecords(req, res, "patients", "id");
});

export default router;
