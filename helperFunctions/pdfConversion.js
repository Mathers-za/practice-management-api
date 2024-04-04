import pool from "../config/dbconfig.js";

import handlebars from "handlebars";
import fs from "fs";

import puppeteer from "puppeteer";

import { format } from "date-fns";

function compileHtmlContent(templatePath, data) {
  // compiles passed data and html template and retruns html content //pass in absolute path to file you want to read
  try {
    const source = fs.readFileSync(templatePath, "utf-8");
    const template = handlebars.compile(source);
    handlebars.registerHelper("formatDate", (date, desiredFormat) => {
      return format(new Date(date), desiredFormat);
    });

    handlebars.registerHelper("compareAmountDue", (amountDue) => {
      return parseFloat(amountDue) <= 0;
    });

    handlebars.registerHelper("defaultValue", (value, defaultValue) => {
      //default value is the value you input that will show if the inputted data does not exist
      return value ? value : defaultValue;
    });
    const html = template(data);

    return html;
  } catch (error) {
    console.error("Error compiling the html document,");
    throw error;
  }
}

async function convertToPdfAndStore(htmlContent) {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();
    return buffer;
  } catch (error) {
    console.error("Error converting HTML to PDF:", error);
    throw error;
  }
}

async function extractDataFromDB(profile_id, appointment_id, patient_id) {
  const generalDataQuery = `SELECT INVOICE_NUMBER,
	APPOINTMENTS.ID AS APPID,
	INVOICE_START_DATE,
	INVOICE_END_DATE,
	INVOICE_TITLE,
	APPOINTMENT_DATE,
	START_TIME,
	APPOINTMENT_NAME AS APPOINTMENT_TYPE_NAME,
	PRICE AS APPOINTMENT_TYPE_PRICE,
	TOTAL_AMOUNT,
	AMOUNT_DUE,
	AMOUNT_PAID,
	DISCOUNT,
	PATIENTS.FIRST_NAME AS PATIENT_FIRST_NAME,
	PATIENTS.LAST_NAME AS PATIENT_LAST_NAME,
	PATIENTS.EMAIL AS PATIENT_EMAIL,
	PATIENTS.CONTACT_NUMBER AS PATIENT_CONTACT_NUMBER,
	USER_PROFILE.FIRST_NAME AS USER_FIRST_NAME,
	USER_PROFILE.LAST_NAME AS USER_LAST_NAME,
	USER_PROFILE.PROFILE_EMAIL AS USER_EMAIL,
	USER_PROFILE.CONTACT_NUM AS USER_CONTACT_NUMBER,
	COUNCIL_REG_NUM,
	PRACTICE_NAME,
	PRACTICE_NUM,
	PRACTICE_ADDRESS,
	BILLING_ADDRESS AS PRACTICE_BILLING_ADDRESS,
	BANK_DETAILS
FROM INVOICES
JOIN APPOINTMENTS ON APPOINTMENTS.ID = INVOICES.APPOINTMENT_ID
JOIN APPOINTMENT_TYPE ON APPOINTMENT_TYPE.ID = APPOINTMENTS.APPOINTMENT_TYPE_ID
JOIN FINANCIALS ON FINANCIALS.APPOINTMENT_ID = APPOINTMENTS.ID
JOIN PATIENTS ON PATIENTS.ID = APPOINTMENTS.PATIENT_ID
JOIN USER_PROFILE ON USER_PROFILE.ID = PATIENTS.PROFILE_ID
JOIN PRACTICE_DETAILS ON PRACTICE_DETAILS.PROFILE_ID = USER_PROFILE.ID
WHERE USER_PROFILE.ID = $1
	AND APPOINTMENTS.ID = $2
   
         `;

  const icd10DataQuery = `select * from icd_10_codes
        where appointment_id = $1`;

  const medicalAidDataQuery = `SELECT *
        FROM MEDICAL_AID
        JOIN PATIENTS ON PATIENTS.ID = MEDICAL_AID.PATIENT_ID
        WHERE PROFILE_ID = $1
          AND PATIENT_ID = $2`;

  try {
    const [generalDataResult, icdBillingDataResult, medicalAidDataResult] =
      await Promise.all([
        pool.query(generalDataQuery, [profile_id, appointment_id]),
        pool.query(icd10DataQuery, [appointment_id]),
        pool.query(medicalAidDataQuery, [profile_id, patient_id]),
      ]);

    return {
      generalData: generalDataResult?.rows[0],
      icd10Data: icdBillingDataResult?.rows,
      medicalAidData: medicalAidDataResult.rows[0],
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export { compileHtmlContent, convertToPdfAndStore, extractDataFromDB };
