import express from "express";
import pool from "../../config/dbconfig.js";
import {
  checkIfDbEntryExists,
  createMedicalAidQuery,
  createPtAddtionalInfoQuery,
  organiseDataFromWebHook,
  updateMedicalAidQuery,
  updatePatientContactDetailsQuery,
  updatePtAdditionalInfoQuery,
} from "./jotformRouteHelpers.js";

const router = express.Router();

router.post(`/webhook`, async (req, res) => {
  const webHookData = organiseDataFromWebHook(req.body); //see return object for object structure

  try {
    await pool.query(updatePatientContactDetailsQuery, [
      ...Object.values(webHookData.patientContactDetails),
      webHookData.patientId,
    ]);

    if (
      await checkIfDbEntryExists(
        "medical_aid",
        webHookData.patientId,
        "patient_id"
      )
    ) {
      await pool.query(updateMedicalAidQuery, [
        ...Object.values(webHookData.medicalAidData),
        webHookData.patientId,
      ]);
    } else {
      await pool.query(createMedicalAidQuery, [
        ...Object.values(webHookData.medicalAidData),
        webHookData.patientId,
      ]);
    }

    if (
      await checkIfDbEntryExists(
        "additional_patient_information",
        webHookData.patientId,
        "patient_id"
      )
    ) {
      await pool.query(updatePtAdditionalInfoQuery, [
        ...Object.values(webHookData.ptAdditionalInfo),
        webHookData.patientId,
      ]);
    } else {
      await pool.query(createPtAddtionalInfoQuery, [
        ...Object.values(webHookData.ptAdditionalInfo),
        webHookData.patientId,
      ]);
    }

    res
      .status(201)
      .json({ message: "Succesfully synced jotform submission with Db data" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

export default router;
