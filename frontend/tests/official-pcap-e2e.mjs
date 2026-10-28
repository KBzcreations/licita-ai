import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const pdfPath=process.env.PCAP_PATH||'/tmp/licita-pcap-junta.pdf';
const pdf=await fs.readFile(pdfPath);
assert.equal(pdf.subarray(0,5).toString(),'%PDF-','The official PCAP download must be a real PDF');
assert.ok(pdf.length>10_000&&pdf.length<20_000_000,'PDF must fit product limits');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/track',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await page.goto('https://www.licita-ai.com/?official-pcap-e2e=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#documents').setInputFiles({name:'PCAP-Junta-Andalucia-V6.pdf',mimeType:'application/pdf',buffer:pdf});
 await page.locator('#analyze').click();
 await page.waitForFunction(()=>document.querySelector('#results')?.hidden===false,null,{timeout:120000});
 const summary=await page.locator('#summary').innerText();
 const table=await page.locator('#resultrows').innerText();
 assert.match(summary,/52 páginas leídas/,'The full 52-page official PCAP must be read');
 for(const area of ['Solvencia económica','Solvencia técnica','Garantías','Documentación y sobres']){
   assert.match(table,new RegExp(area),'The area '+area+' must be included in matrix');
 }
 assert.match(table,/PCAP-Junta-Andalucia-V6\.pdf · pág\. [0-9]+/,'Evidence must cite a real PDF page');
 assert.match(table,/Encontrado/,'At least one area must be located');
 const downloading=page.waitForEvent('download',{timeout:30000});
 await page.locator('#csv').click();
 const file=await downloading;
 const csv=await fs.readFile(await file.path(),'utf8');
 assert.match(csv,/PCAP-Junta-Andalucia-V6\.pdf/);
 assert.match(csv,/Solvencia económica/);
 assert.equal(errors.length,0,'JavaScript errors: '+errors.join('; '));
 console.log('PASS official Junta de Andalucía PCAP (52 pages): complete extraction, area matrix, PDF page evidence, CSV download, no JS errors.');
}finally{await browser.close();}
