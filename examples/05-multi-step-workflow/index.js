/**
 * Example 05: Multi-Step Workflow
 * 
 * Demonstrates how to chain multiple browser actions into a workflow
 * that accomplishes a complex task end-to-end.
 * 
 * This example automates a research workflow:
 * 1. Search for a topic on GitHub
 * 2. Visit top results
 * 3. Extract structured data from each repo
 * 4. Compile a report
 * 
 * Extends to any multi-step automation:
 * - Price comparison across multiple sites
 * - Lead generation from LinkedIn -> enrichment -> CRM
 * - Content monitoring and alerting pipelines
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY;
const SEARCH_QUERY = process.env.SEARCH_QUERY || 'browser automation ai agents';
const MAX_RESULTS = parseInt(process.env.MAX_RESULTS || '5');

if (!ANCHOR_API_KEY) {
  console.error('❌ ANCHOR_API_KEY environment variable is required');
  process.exit(1);
}

async function createSession() {
  const res = await fetch('https://api.anchorbrowser.io/v1/sessions', {
    method: 'POST',
    headers: {
      'anchor-api-key': ANCHOR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fingerprint: {
        screen: { width: 1920, height: 1080 },
      },
      proxy: {
        type: 'residential',
        country: 'US',
      },
    }),
  });

  if (!res.ok) throw new Error(`Session creation failed: ${await res.text()}`);
  return res.json();
}

async function endSession(sessionId) {
  await fetch(`https://api.anchorbrowser.io/v1/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'anchor-api-key': ANCHOR_API_KEY },
  });
}

/**
 * Step 1: Search GitHub and get top repo URLs
 */
async function searchGitHub(page, query) {
  console.log(`\n🔍 Step 1: Searching GitHub for "${query}"...`);
  
  const searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories&sort=stars`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  const repos = await page.evaluate((max) => {
    const results = [];
    const items = document.querySelectorAll('[data-testid="results-list"] .search-title a, .repo-list-item .v-align-middle');
    
    for (let i = 0; i < Math.min(items.length, max); i++) {
      const el = items[i];
      results.push({
        name: el.textContent.trim(),
        url: el.href || `https://github.com${el.getAttribute('href')}`,
      });
    }
    return results;
  }, MAX_RESULTS);
  
  console.log(`   Found ${repos.length} repositories`);
  return repos;
}

/**
 * Step 2: Extract data from each repo
 */
async function extractRepoData(page, repoUrl) {
  console.log(`\n📂 Step 2: Extracting data from ${repoUrl}...`);
  
  await page.goto(repoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  const data = await page.evaluate(() => {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };
    
    const getCount = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return 0;
      const text = el.textContent.trim().replace(/,/g, '');
      return parseInt(text) || 0;
    };
    
    return {
      title: document.title,
      description: getText('[data-testid="repo-short-description"]') || 
                   getText('.f4.my-3'),
      stars: getCount('[data-testid="stargazers-count-chip"] strong, #repo-stars-counter-star'),
      forks: getCount('[data-testid="forks-count-chip"] strong, #repo-network-counter'),
      language: getText('[data-testid="repository-top-language"]') || 
                getText('.d-inline .color-fg-default'),
      lastUpdated: document.querySelector('[datetime]')?.getAttribute('datetime'),
      topics: Array.from(document.querySelectorAll('[data-testid="topic-tag"], .topic-tag'))
               .map(t => t.textContent.trim())
               .slice(0, 10),
    };
  });
  
  return { url: repoUrl, ...data };
}

/**
 * Step 3: Compile and save report
 */
async function generateReport(results) {
  console.log('\n📊 Step 3: Generating report...');
  
  const report = {
    query: SEARCH_QUERY,
    generated_at: new Date().toISOString(),
    total_repos: results.length,
    repositories: results.filter(r => !r.error),
    errors: results.filter(r => r.error),
  };
  
  // Save JSON report
  fs.writeFileSync('research-report.json', JSON.stringify(report, null, 2));
  
  // Generate Markdown summary
  let md = `# Research Report: ${SEARCH_QUERY}\n\n`;
  md += `Generated: ${report.generated_at}\n\n`;
  md += `## Repositories Found\n\n`;
  
  for (const repo of report.repositories) {
    md += `### [${repo.name || repo.url}](${repo.url})\n\n`;
    if (repo.description) md += `${repo.description}\n\n`;
    md += `- ⭐ Stars: ${repo.stars?.toLocaleString() || 'unknown'}\n`;
    md += `- 🍴 Forks: ${repo.forks?.toLocaleString() || 'unknown'}\n`;
    if (repo.language) md += `- 💻 Language: ${repo.language}\n`;
    if (repo.topics?.length) md += `- 🏷️ Topics: ${repo.topics.join(', ')}\n`;
    md += '\n';
  }
  
  fs.writeFileSync('research-report.md', md);
  
  console.log(`   ✅ Reports saved: research-report.json, research-report.md`);
  return report;
}

async function runWorkflow() {
  let sessionId = null;
  
  try {
    // Create browser session
    const session = await createSession();
    sessionId = session.id;
    console.log(`🚀 Session created: ${sessionId}`);
    console.log(`   Live view: https://live.anchorbrowser.io?sessionId=${sessionId}`);
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: session.cdp_url,
      defaultViewport: null,
    });
    
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // Execute workflow steps
    const repos = await searchGitHub(page, SEARCH_QUERY);
    
    const results = [];
    for (const repo of repos) {
      try {
        const data = await extractRepoData(page, repo.url);
        results.push(data);
        console.log(`   ✅ ${repo.name}: ${data.stars} stars, ${data.language}`);
        await new Promise(r => setTimeout(r, 1000)); // Polite delay
      } catch (err) {
        console.error(`   ❌ Error processing ${repo.url}: ${err.message}`);
        results.push({ url: repo.url, error: err.message });
      }
    }
    
    const report = await generateReport(results);
    
    console.log('\n✅ Workflow complete!');
    console.log(`   Total repos analyzed: ${report.total_repos}`);
    console.log(`   See: research-report.md`);
    
    await browser.disconnect();
    
  } finally {
    if (sessionId) {
      await endSession(sessionId);
      console.log(`\n🧹 Session ${sessionId} cleaned up`);
    }
  }
}

runWorkflow().catch((err) => {
  console.error('Workflow failed:', err.message);
  process.exit(1);
});
