@echo off
echo Starting Playwright test on Windows...

cd /d "C:\Users\JanHendrikRoth\Desktop\Claude Ergebnisse\Claude Ergebnisse\Foodsuite"

REM Install playwright if needed
call npm list playwright >nul 2>&1
if errorlevel 1 (
    echo Installing Playwright...
    call npm install playwright
)

REM Create test file
echo const { chromium } = require('playwright'); > test-windows-inventory.js
echo. >> test-windows-inventory.js
echo ^(async ^(^) =^> { >> test-windows-inventory.js
echo     const browser = await chromium.launch({ headless: false }); >> test-windows-inventory.js
echo     const page = await browser.newPage(); >> test-windows-inventory.js
echo     console.log('Opening FoodSuite...'); >> test-windows-inventory.js
echo     await page.goto('http://localhost:3003'); >> test-windows-inventory.js
echo     await page.fill('input[type="text"]', 'admin'); >> test-windows-inventory.js
echo     await page.fill('input[type="password"]', 'Demo123!'); >> test-windows-inventory.js
echo     await page.click('button:has-text("Anmelden")'); >> test-windows-inventory.js
echo     await page.waitForTimeout(2000); >> test-windows-inventory.js
echo     await page.click('a.dropdown-toggle:has-text("Mehr")'); >> test-windows-inventory.js
echo     await page.waitForTimeout(500); >> test-windows-inventory.js
echo     await page.click('a[data-tab="inventory"]'); >> test-windows-inventory.js
echo     await page.waitForTimeout(3000); >> test-windows-inventory.js
echo     const rows = await page.locator('#inventoryTable tbody tr').count(); >> test-windows-inventory.js
echo     console.log('Inventory rows found: ' + rows); >> test-windows-inventory.js
echo     await page.screenshot({ path: 'windows-inventory-test.png' }); >> test-windows-inventory.js
echo     await page.waitForTimeout(5000); >> test-windows-inventory.js
echo     await browser.close(); >> test-windows-inventory.js
echo }^)^(^); >> test-windows-inventory.js

REM Run the test
node test-windows-inventory.js

pause