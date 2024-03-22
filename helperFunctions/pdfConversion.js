import pool from "../config/dbconfig.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { v4 as uuidv4 } from "uuid";
import puppeteer from "puppeteer";
import { json } from "express";

async function convertToPdfAndStore(htmlContent) {
  const uniquePdfId = uuidv4().slice(0, 5);

  const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));

  const pdfStorePath = join(currentModuleDirectory, "../pdfStatmentStore");

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);

  const pdfPath = join(pdfStorePath, `${uniquePdfId}-statment.pdf`);

  await page.pdf({
    format: "A4",
    printBackground: true,
    path: pdfPath,
  });

  await browser.close();
  return uniquePdfId;
}

async function GenerateInvoiceStatment(
  invoice_id,
  profile_id,
  appointnment_id,
  patient_id
) {
  const { generalData, icdBillingData, medicalAidData } =
    await extractDataFromDB(
      invoice_id,
      profile_id,
      appointnment_id,
      patient_id
    );

  const htmlContent = generateHtmlTemplate(
    generalData,
    icdBillingData,
    medicalAidData
  );
  const uuid = await convertToPdfAndStore(htmlContent);
  return uuid;
}

async function extractDataFromDB(
  invoice_id,
  profile_id,
  appointment_id,
  patient_id
) {
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
	AND APPOINTMENTS.ID = $2 AND
     INVOICES.ID = $3
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
        pool.query(generalDataQuery, [profile_id, appointment_id, invoice_id]),
        pool.query(icd10DataQuery, [appointment_id]),
        pool.query(medicalAidDataQuery, [profile_id, patient_id]),
      ]);

    return {
      generalData: generalDataResult?.rows[0],
      icdBillingData: icdBillingDataResult?.rows,
      medicalAidData: medicalAidDataResult.rows[0],
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function generateHtmlTemplate(generalData, icd10Data, medicalAidData) {
  const htmlContent = ` <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      
  
      <style>
        body {
    box-sizing: border-box;
    margin: 0;
    font-size: 0.9rem;
  }
  
  body * {
    box-sizing: border-box;
  }
  
  .container {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 10px 15px;
  }
  
  .container p {
    margin: 0;
  }
  
  .top {
    display: flex;
    min-width: 100%;
    min-height: 40vh;
    
  }
  
  .top-right {
    min-width: 50%;
    
    padding: 2px 10px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-around;
    flex-grow: 1;
  }
  
  .top-left {
    min-width: 30%;
   
    padding: 10px 10px;
  }
  
  .table {
    min-width: 100%;
    min-height: 20vh;
   
  }
  
  .pricing {
    height: 20vh;
    
   
    align-self: end;
    
  }
  
  .bankingDetails {
    min-width: 50%;
  
  
    min-height: 20vh;
    align-self: start;
  }
  
  .paidFigure {
    border: 1px solid black;
    min-height: 18vh;
    display: flex;
    flex-direction: column;
    margin-top: 20px;
  
    align-items: center;
  }
  
  .paidFigure p:nth-child(3) {
    margin-top: auto;
    min-height: 2rem;
    background-color: blueviolet;
    min-width: 100%;
    text-align: center;
    line-height: 2rem;
  }
  
  .invNumber {
    height: fit-content;
    padding: 5px 5px;
    background-color: green;
  }
  
  table,
  th, tr,
  td {
    border: 1px solid black;
    border-collapse: collapse;
    height: 2rem;
  }
  
  
  
  
  table {
    min-width: 100%;
  } 
  
  td {
      text-align: center;
  }
  
  
  .subTotal{
      text-align:start;
      
      border-bottom: 1px solid black;
      width: 17%;
      
      
      
  }
  
  .table {
      padding: 10px 10px;
      display:flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid black;
      border-bottom: 1px solid black;
      
  
  }
  
  .table div:nth-child(2){
      align-self: flex-end;
  
      
      
  }
  
  .amount {
      display: flex;
      gap: 20px;
  
  }
  
  .bottom {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top: 10px;
  
  }
  
  .container .bottom {
      align-self: center;
  }
  
  .header{
      text-align: center;
      margin-bottom: 2px;
  }
  
  
      </style>
  </head>
  <body>
  
      <h1 class="header">Invoice Statment</h1>
      <div class="container">
          <div class="top">
            <div class="top-left">
              <p>${generalData?.practice_name || ""}</p>
              <p>Practice number: ${generalData?.practice_num || ""}</p>
              <p> Billing Address: ${generalData?.billing_address || ""}</p>
              <div class="paidFigure">
                <p> Amount due</p>
                <p> ${generalData?.amount_due || ""}</p>
                <p  id = "status"></p>
              </div>
            </div>
            <div class="top-right">
              <div class="invNumber">Inv number: ${
                generalData?.invoice_number || ""
              }</div>
              <div class="dates">
                <p> Date: "yyyy MM dd"</p>
                <p>Due Date: ${generalData?.invoice_end_date || ""}</p>
              </div>
              <div class="bill-to">
               
                <p>bill to :</p>
                <p> ${generalData?.patient_first_name || ""} ${
    generalData?.patient_last_name || ""
  }</p>
                <p>email: ${generalData?.patient_email || ""}</p>
                <p> contact: ${generalData?.patient_contact_number || ""}</p>
              </div>
              <div class="medicalAid-details">
                <p>Medical Aid</p>
                <p> ${medicalAidData?.medaid_name || ""} - ${
    medicalAidData?.medaid_scheme || ""
  }</p>
                <p> Membership #: ${medicalAidData?.medaid_number || ""}</p>
                <p> Patient: ${generalData?.patient_first_name || ""} ${
    generalData?.patient_last_name || ""
  }</p>
                <p>ID: ${medicalAidData?.gov_id || ""}</p>
                <p id="mainMem"></p>
              <p  id="mainmem_name_surname" ></p>
              <p  id="mainmem_govId" ></p>
                
              </div>
            </div>
          </div>
          <div  class="table">
           <div>
              <p ></p>
              <p>${generalData?.patient_first_name || ""} ${
    generalData?.patient_last_name || ""
  }. <span id= tableHeaderTime></span>  </p>
              <p>Treated by: ${generalData?.user_first_name || ""} ${
    generalData?.user_last_name || ""
  } (${generalData?.council_reg_num || ""}) at ${
    generalData?.practice_address || ""
  }</p>
           </div>
           <table id="table">
           <thead>
             
           </thead>
           <tbody>
            
         </tbody>
          </table>
            <div class="subTotal" >Sub-total: R${
              generalData?.total_amount || ""
            }</div>
          </div>
  
  <div  class="bottom" >
          <div class="bankingDetails">
              <p>Banking Details</p>
              <p>${generalData?.bank_details || ""}</p>
          </div>
    
          <div class="pricing">
              
              <p class="amount">Totals</p> 
              <div class="amount">
              <p class="amount">Invoice Total: </p>  <p> R${
                generalData?.total_amount || ""
              }</p>
          </div>
          <div class="amount">
              <p class="amount">Amount paid:  </p>R${
                generalData?.amount_paid || ""
              }</p>
          </div>
          <div class="amount"> 
              <p class="amount" >Amount due: 	 </p> <p> R${
                generalData?.amount_due || ""
              }</p>
              </div>
          </div>
      </div>
          
        </div>

        <script src="./scriptForPdfConversion.js"></script>
  </body>
  </html>`;

  return htmlContent;
}

export default GenerateInvoiceStatment;
