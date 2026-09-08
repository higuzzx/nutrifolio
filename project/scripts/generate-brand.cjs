const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1024,height:1024}});await page.setContent('<style>body{margin:0}</style>'+fs.readFileSync('assets/images/brand.svg','utf8'));await page.screenshot({path:'assets/images/icon.png'});await page.setViewportSize({width:64,height:64});await page.addStyleTag({content:'svg{width:64px;height:64px}'});await page.screenshot({path:'assets/images/favicon.png'});}finally{await browser.close();}})();
