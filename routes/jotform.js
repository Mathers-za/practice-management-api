import express from "express";

const router = express.Router();

router.post(`/webhook`, (req, res) => {
  const data = req.body;
  const {
    q3_firstName: patientFirstName,
    q4_lastName: patientLastName,
    q6_patientPhoneNumber: patientPhoneNumber,
  } = JSON.parse(data.rawRequest);
  console.log(patientFirstName + " " + patientLastName);
});

export default router;
