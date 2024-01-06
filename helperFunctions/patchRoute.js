import pool from "../config/dbconfig.js";

async function updateRecords(req, res, tableName, idColumnName) {
  try {
    const updates = req.body;

    const id = req.params.id;

    const updateColumns = Object.keys(updates);

    const setClauses = updateColumns
      .map((key, index) => {
        return `${key} = $${index + 1}`;
      })
      .join(", ");

    const queryText = `
      UPDATE ${tableName}
      SET ${setClauses}
      WHERE ${idColumnName} = $${updateColumns.length + 1}
      RETURNING *;
    `;
    const values = [...Object.values(updates), id];

    const result = await pool.query(queryText, values);

    if (result.rowCount > 0) {
      res
        .status(201)
        .json({ success: true, message: "successfully updated records" });
    } else {
      res
        .status(200)
        .json({ success: false, message: "failed to find record" });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "failed to update records",
      error: error.message,
    });
  }
}

export default updateRecords;
