import fs from "node:fs";

const profile = fs.readFileSync("apps/web/src/components/dbx/CustomerAccountPanel.tsx", "utf8");
const forbidden = ["email_verified", "phone_verified", "source", "sub", "password", "Additional Info"];
const required = [
  'type="file"',
  'accept="image/jpeg,image/jpg,image/png,image/webp"',
  "Profile photo preview",
  "Male",
  "Female",
  "Prefer not to say",
  "He",
  "She",
  "dbx-profile-country",
  "dbx-profile-phone-code",
  "dbx-profile-language",
];
const missing = required.filter((item) => !profile.includes(item));
const leaked = forbidden.filter((item) => profile.includes(item));
if (missing.length || leaked.length) {
  console.error(JSON.stringify({ success: false, missing, leaked }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success: true }, null, 2));
