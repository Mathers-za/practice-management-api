import { assert } from "puppeteer";
import pool from "../config/dbconfig.js";

async function updateRecords(
  req,
  res,
  tableName,
  idColumnName,
  validationSchema = undefined
) {
  try {
    const updates = validationSchema
      ? await validationSchema.cast(req.body, { assert: false })
      : req.body;

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
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json(error.message);
  }
}

export default updateRecords;
