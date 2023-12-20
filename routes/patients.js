import express from "express";
import pool from "../config/dbconfig.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  //create client endpoint

  const { fullname, contactnumber, email } = req.body;

  try {
    const data = await pool.query(
      "INSERT INTO patients(fullname,email,contact_number,user_id) values($1,$2,$3,$4) returning * ",
      [fullname, email, contactnumber, req.user.id]
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
  console.log(`the cookie is: ${req.user}`);
  try {
    const result = await pool.query("select * from patients");
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
  const { fullname, email, contact_number } = req.body;

  try {
    const result = await pool.query(
      "update patients set fullname = $1, email = $2 , contact_number = $3 where id = $4 returning *  ",
      [fullname, email, contact_number, req.params.id]
    );
    console.log(result.rows.length);
    console.log(req.params.id);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "cannout update:user does not exist",
      });
    }
    return res
      .status(201)
      .json({ success: true, message: "user successfully updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "internal server error",
      error: error.message,
    });
  }
});

//get all clients

//get specific client

//update client (partial updates using patch)

export default router;
