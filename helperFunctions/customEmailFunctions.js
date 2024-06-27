import handlebars from "handlebars";
import nodemailer from "nodemailer";
import { format } from "date-fns";

const defaultTestForEmailTemplateCompiling = {
  user_first_name: "tester",
  user_last_name: "test",
  patient_first_name: "test",
  patient_last_name: "test",
  practice_name: "test",
  practice_address: "test",
  appointment_date: "test",
  start_time: "test",
  appointment_type_name: "test",
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "danielmathers97@gmail.com",
    pass: "qfvi vooe ksmi tcpp",
  },
});

function compileEmailTemplate(source, data) {
  //source = string/utf8string that contains the html or text template. data:object with data you wish to insert into template
  try {
    const template = handlebars.compile(source);
    handlebars.registerHelper("defaultValue", (value) => {
      if (!value) {
        return "";
      } else {
        return value;
      }
    });

    handlebars.registerHelper("formatDate", (value) => {
      return format(new Date(value), "PPPP");
    });

    handlebars.registerHelper("formatTimeDefault", (value) => {
      return value.slice(0, value.lastIndexOf(":"));
    });

    const compiledText = template(data);
    return compiledText;
  } catch (error) {
    console.error("error in compileEmailTemplate fn ", error.message);

    throw error;
  }
}

async function sendNotificationEmail(
  emailSubject,
  emailBody,
  recieptEmailAddress,
  version = "text", //input text or html as a string
  attachments = []
) {
  await transporter.sendMail({
    from: "danielmathers97@gmail.com",
    to: recieptEmailAddress,
    subject: emailSubject,
    [version]: emailBody,
    attachments: attachments,
  });
}

async function sendBulkEmailsInParallel(arrayOfObjectsData) {
  //object should have properties subject,body and to (recipient email address)
  await Promise.all(
    arrayOfObjectsData.map((element) =>
      sendNotificationEmail(element.subject, element.body, element.to, "html")
    )
  );
}

function insertIntoWord(word, insertValue) {
  const letterArr = word.split("");

  letterArr.splice(letterArr.lastIndexOf("{") + 1, 0, insertValue, " ");
  const newWord = letterArr.join("");
  return newWord;
}

function processDataForHbsCompatibilty(dataObj, columnName) {
  const wordArr = dataObj[columnName].split(" ");
  let formattedSentence = "";

  const constructedArray = wordArr.map((word) => {
    if (word.includes("{{") && word.includes("}}")) {
      if (word.includes("appointment_date")) {
        return insertIntoWord(word, "formatDate");
      } else if (word.includes("start_time")) {
        return insertIntoWord(word, "formatTimeDefault");
      } else {
        return insertIntoWord(word, "defaultValue");
      }
    } else {
      return word;
    }
  });

  if (columnName === "reminder_body" || columnName === "confirmation_body") {
    constructedArray.push("</p>");
    constructedArray.unshift("<p>");
    formattedSentence = constructedArray.join(" ");

    formattedSentence = formattedSentence.replaceAll("\n", "<br>");

    formattedSentence = constructedArray.join(" "); //FIXME not kaing into if block hence not relace \ns with </br> also simply return . just rteurn value straight

    formattedSentence = formattedSentence.replaceAll("\n", "<br>");

    return { [columnName]: formattedSentence };
  } else {
    formattedSentence = constructedArray.join(" ");
    return { [columnName]: formattedSentence };
  }
}

async function sendBulkEmailInChunks(
  emails,
  chunk = 20,
  delayInMillSeconds = 4000
) {
  //emails:ArrarOfObjects {subject, body, to} properties // chunk: integer (number of emails you want to send per round) // delayInseconds:Integer (the delay inebtwene seding chunks)

  for (let i = 0; i < emails.length; i += chunk) {
    await sendBulkEmailsInParallel(emails.slice(i, i + chunk));

    await delay(delayInMillSeconds);
  }

  async function delay(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export {
  compileEmailTemplate,
  sendNotificationEmail,
  processDataForHbsCompatibilty,
  sendBulkEmailsInParallel,
  sendBulkEmailInChunks,
  defaultTestForEmailTemplateCompiling,
};
