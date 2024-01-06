import pool from "../config/dbconfig.js";

async function viewAll(req, res, tableName, fkColName) {
  const id = req.params.id;
  console.log(id);

  try {
    const result = await pool.query(
      `SELECT * FROM ${tableName} where ${fkColName} = $1 `,
      [id]
    );

    if (!result.rows.some((element) => element.patient_id == id)) {
      res.status(200).json({ message: "no data" });
    } else {
      res
        .status(200)
        .json({ message: "successfuy rertived all data", data: result.rows });
    }
  } catch (error) {
    console.error(error.message);
    res
      .status(500)
      .json({ message: "internal server errror", data: error.message });
  }
}

export default viewAll;
