import pool from "../../config/dbconfig.js";

export function organiseDataFromWebHook(rawJotFormData) {
  const data = JSON.parse(rawJotFormData.rawRequest);
  console.log(data);
  const organisedData = {
    patientContactDetails: {
      firstName: data?.q3_firstName || null,
      lastName: data?.q4_lastName || null,
      contactNumber:
        data?.q10_contactNumber?.full.replace(/[\(\)\-\s]/gi, "") || null,
      email: data?.q7_patientEmail || null,
    },
    patientId: +data.q11_patientId,
    medicalAidData: {
      medAidName: data?.q14_medAidName || null,
      scheme: data?.q15_medAidScheme || null,

      medAidNumber: data?.q17_medAidNumber || null,
      idNumber: data?.q16_idNumber || null,

      isDepedant: data.q21_isDependant === "No" ? false : true,
      mainMemFirstName: data.q22_mainMemFirstName,
      mainMemLastName: data?.q23_mainMemLastName || null,
      mainMemId: data?.q24_mainMemIdNumber || null,
    },
    ptAdditionalInfo: {
      dateOfBirth:
        data.q29_dob.year && data.q29_dob.month && data.q29_dob.day
          ? data.q29_dob.year + "" + data.q29_dob.month + "" + data.q29_dob.day
          : null,
      initials: data?.q25_initials || null,
      gender: data?.q26_gender || null,
      title: data?.q28_title || null,
    },
  };
  console.log("web hook data is " + JSON.stringify(organisedData));

  return organisedData;
}

export async function checkIfDbEntryExists(
  tableName,
  primaryKeyvalue,
  primaryKeyColumnName
) {
  try {
    const response = await pool.query(
      `select ${primaryKeyColumnName} from ${tableName} where ${primaryKeyColumnName} = $1 `,
      [primaryKeyvalue]
    );
    if (response.rowCount > 0) {
      return true;
    } else return false;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export const updatePatientContactDetailsQuery = `update patients set first_name = $1, last_name = $2, contact_number = $3, email = $4 where id = $5`;

export const createMedicalAidQuery = `insert into medical_aid(medaid_name,medaid_scheme,medaid_number,gov_id,is_dependant,mainmem_name,mainmem_surname,mainmem_gov_id,patient_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) `;

export const updateMedicalAidQuery = `update medical_aid set medaid_name =$1,medaid_scheme = $2,medaid_number = $3,gov_id =$4,is_dependant =$5,mainmem_name = $6,mainmem_surname =$7,mainmem_gov_id  =$8 where patient_id =$9`;

export const createPtAddtionalInfoQuery = `insert into additional_patient_information (date_of_birth,initials,gender,title,patient_id)values($1,$2,$3,$4,$5)`;

export const updatePtAdditionalInfoQuery = `update additional_patient_information set date_of_birth = $1,initials =$2,gender = $3,title = $4 where patient_id =$5 `;
