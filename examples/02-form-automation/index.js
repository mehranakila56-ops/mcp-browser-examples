/**
 * 02-form-automation — Fill and submit web forms
 * 
 * Demonstrates: field detection, typing, select dropdowns, checkbox, form submission
 * 
 * Usage:
 *   ANCHOR_API_KEY=your_key node index.js
 */

const puppeteer = require('puppeteer-core');

async function createSession(apiKey) {
  const res = await fetch('https://api.anchorbrowser.io/v1/sessions', {
    method: 'POST',
    headers: { 'anchor-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  return res.json();
}

async function fillForm(page, formData) {
  for (const [selector, value] of Object.entries(formData)) {
    const element = await page.$(selector);
    if (!element) {
      console.warn(`  Element not found: ${selector}`);
      continue;
    }
    
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const type = await element.evaluate(el => el.type || '');
    
    if (tagName === 'select') {
      await page.select(selector, value);
    } else if (type === 'checkbox') {
      const checked = await element.evaluate(el => el.checked);
      if (checked !== value) await element.click();
    } else {
      await element.click({ clickCount: 3 }); // select all
      await page.type(selector, value, { delay: 50 }); // human-like typing
    }
    
    console.log(`  Filled ${selector}: ${value}`);
  }
}

async function main() {
  const apiKey = process.env.ANCHOR_API_KEY;
  if (!apiKey) throw new Error('ANCHOR_API_KEY required');
  
  console.log('Creating browser session...');
  const session = await createSession(apiKey);
  
  const browser = await puppeteer.connect({ browserWSEndpoint: session.cdp_url });
  const page = await browser.newPage();
  
  try {
    // Example: fill a contact form
    await page.goto('https://httpbin.org/forms/post', { waitUntil: 'networkidle2' });
    
    await fillForm(page, {
      'input[name="custname"]': 'Test User',
      'input[name="custtel"]': '555-0100',
      'input[name="custemail"]': 'test@example.com',
      'select[name="size"]': 'large',
      'textarea[name="comments"]': 'This is an automated form submission example.',
    });
    
    console.log('Submitting form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Form submitted! Response preview:', bodyText.slice(0, 200));
    
  } finally {
    await browser.close();
    await fetch(`https://api.anchorbrowser.io/v1/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { 'anchor-api-key': apiKey }
    });
  }
}

main().catch(console.error);
