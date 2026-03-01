/**
 * 03-data-extraction — Extract structured data from web pages
 *
 * Uses Puppeteer's page.evaluate() to run extraction code in the browser context.
 *
 * Usage:
 *   ANCHOR_API_KEY=your_key node index.js https://news.ycombinator.com
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

/**
 * Extract structured data using CSS selectors
 * @param {Page} page - Puppeteer page
 * @param {Object} schema - { fieldName: cssSelector }
 * @returns {Object[]} array of extracted records
 */
async function extractTable(page, rowSelector, schema) {
  return page.evaluate((rowSelector, schema) => {
    const rows = Array.from(document.querySelectorAll(rowSelector));
    return rows.map(row => {
      const record = {};
      for (const [field, selector] of Object.entries(schema)) {
        const el = row.querySelector(selector);
        record[field] = el ? el.textContent.trim() : null;
        if (el && el.href) record[`${field}_url`] = el.href;
      }
      return record;
    });
  }, rowSelector, schema);
}

async function main() {
  const url = process.argv[2] || 'https://news.ycombinator.com';
  const apiKey = process.env.ANCHOR_API_KEY;
  if (!apiKey) throw new Error('ANCHOR_API_KEY required');
  
  console.log(`Extracting data from: ${url}`);
  const session = await createSession(apiKey);
  
  const browser = await puppeteer.connect({ browserWSEndpoint: session.cdp_url });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Example: extract HN stories
    const stories = await extractTable(page, 'tr.athing', {
      rank: '.rank',
      title: '.titleline > a',
      site: '.sitebit',
    });
    
    console.log(`Extracted ${stories.length} items:`);
    stories.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.title} ${item.title_url ? '(' + item.title_url + ')' : ''}`);
    });
    
    // Output as JSON
    const output = { url, extracted_at: new Date().toISOString(), count: stories.length, items: stories };
    require('fs').writeFileSync('output.json', JSON.stringify(output, null, 2));
    console.log(`\nFull results saved to output.json`);
    
  } finally {
    await browser.close();
    await fetch(`https://api.anchorbrowser.io/v1/sessions/${session.id}`, {
      method: 'DELETE',
      headers: { 'anchor-api-key': apiKey }
    });
  }
}

main().catch(console.error);
