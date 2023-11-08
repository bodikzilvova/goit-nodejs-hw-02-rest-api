const nodemailer = require("nodemailer");
require("dotenv").config();

const { MAIL_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.meta.ua",
  port: 465,
  secure: true,
  auth: {
    user: "bodikzilvova@meta.ua",
    pass: MAIL_PASSWORD,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

const sendMail = async (data) => {
  const email = { ...data, from: "bodikzilvova@meta.ua" };
  await transport.sendMail(email);
  return true;
};
module.exports = sendMail;
