/**
 * 01-basic-screenshot — Take a screenshot of any URL
 * 
 * Usage:
 *   ANCHOR_API_KEY=your_key node index.js https://example.com
 *   BROWSER=local node index.js https://example.com
 */

const puppeteer = require(process.env.BROWSER === 'local' ? 'puppeteer' : 'puppeteer-core');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'https://example.com';

async function createBrowser() {
  if (process.env.BROWSER === 'local') {
    return puppeteer.launch({ headless: true });
  }
  
  // Use AnchorBrowser cloud session
  const apiKey = process.env.ANCHOR_API_KEY;
  if (!apiKey) throw new Error('ANCHOR_API_KEY env var required');
  
  const response = await fetch('https://api.anchorbrowser.io/v1/sessions', {
    method: 'POST',
    headers: { 
      'anchor-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      headless: false  // visible for debugging
    })
  });
  
  const session = await response.json();
  if (!session.id) throw new Error(`Session creation failed: ${JSON.stringify(session)}`);
  
  console.log(`Browser session created: ${session.id}`);
  
  const browser = await puppeteer.connect({ 
    browserWSEndpoint: session.cdp_url 
  });
  
  // Store session ID for cleanup
  browser._anchorSessionId = session.id;
  browser._anchorApiKey = apiKey;
  
  return browser;
}

async function main() {
  console.log(`Taking screenshot of: ${url}`);
  
  const browser = await createBrowser();
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const filename = `screenshot-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    
    console.log(`Screenshot saved: ${filename}`);
    console.log(`Page title: ${await page.title()}`);
    
  } finally {
    await browser.close();
    
    // Clean up AnchorBrowser session
    if (browser._anchorSessionId) {
      await fetch(`https://api.anchorbrowser.io/v1/sessions/${browser._anchorSessionId}`, {
        method: 'DELETE',
        headers: { 'anchor-api-key': browser._anchorApiKey }
      });
      console.log('Browser session cleaned up');
    }
  }
}

main().catch(console.error);
