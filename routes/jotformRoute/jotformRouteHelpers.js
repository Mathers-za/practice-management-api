import { da } from "date-fns/locale";
import pool from "../../config/dbconfig.js";

function replaceUnnecessaryCharactersFromJotFormWebHookData(jotFormData) {
  const cleanedObj = {};
  for (const key in jotFormData) {
    cleanedObj[key.toString().slice(key.indexOf("_") + 1)] = jotFormData[key];
  }
  return cleanedObj;
}

export function organiseDataFromWebHook(rawJotFormData) {
  let data = JSON.parse(rawJotFormData.rawRequest);
  data = replaceUnnecessaryCharactersFromJotFormWebHookData(data);
  console.log(data);
  const organisedData = {
    patientContactDetails: {
      firstName: data?.firstName || null,
      lastName: data?.lastName || null,
      contactNumber:
        data?.contactNumber?.full.replace(/[\(\)\-\s]/gi, "") || null,
      email: data?.patientEmail || null,
    },
    patientId: +data.patientId,
    medicalAidData: {
      medAidName: data?.medAidName || null,
      scheme: data?.medAidScheme || null,

      medAidNumber: data?.medAidNumber || null,
      idNumber: data?.idNumber || null,

      isDepedant: data.isDependant.toLowerCase() === "no" ? false : true,
      mainMemFirstName: data.mainMemFirstName,
      mainMemLastName: data?.mainMemLastName || null,
      mainMemId: data?.mainMemIdNumber || null,
    },
    ptAdditionalInfo: {
      dateOfBirth:
        data?.dob?.year && data?.dob?.month && data?.dob?.day
          ? data.dob.year + "" + data.dob.month + "" + data.dob.day
          : null,
      initials: data?.initials || null,
      gender: data?.gender || null,
      title: data?.title || null,
    },
  };
  console.log("web hook data is " + JSON.stringify(organisedData));

  return organisedData;
}

export async function checkIfDbEntryExists(
  tableName,
  value,
  columnNameWhereValueIsFound
) {
  try {
    const response = await pool.query(
      `select * from ${tableName} where ${columnNameWhereValueIsFound} = $1 `,
      [value]
    );
    console.log("the follwoing was found " + response.rowCount);
    if (response.rowCount > 0) {
      return true;
    } else {
      return false;
    }
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
