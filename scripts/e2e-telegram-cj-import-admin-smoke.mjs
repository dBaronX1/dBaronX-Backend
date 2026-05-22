import fs from 'node:fs';
const p='apps/telegram-bot/src/app/router.py';
const txt=fs.readFileSync(p,'utf8');
for (const cmd of ['cj_import_preview','cj_import_run','cj_import_status','cj_import_approve','cj_import_reject','cj_publish_approved']) if(!txt.includes(cmd)) throw new Error(`missing ${cmd}`);
console.log('ok telegram cj import admin smoke');
