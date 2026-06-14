// Fixed Playwright test for GitHub DOM structure
import { chromium } from 'playwright';

const TESTS = [
  {
    name: 'GitHub Repo',
    url: 'https://github.com/microsoft/autogen',
    extract: async (page) => {
      // Wait for page to fully render
      await page.waitForTimeout(3000);
      // Try multiple selector strategies for GitHub's dynamic DOM
      const title = await page.title();
      // GitHub uses various star counter patterns
      const starBtn = await page.$('[aria-label*="star" i]');
      const starText = starBtn ? await starBtn.textContent() : null;
      // Get about section
      const about = await page.$('[data-testid="readme"]') || await page.$('article');
      const aboutText = about ? (await about.textContent()).slice(0, 300) : null;
      // Try to find the star count via URL bar approach
      const allText = await page.textContent('body');
      const starMatch = allText.match(/(\d+[\d,]*)\s*stars?/i);
      return { title, starText: starText?.trim(), starMatch: starMatch?.[0], aboutSnippet: aboutText };
    }
  },
  {
    name: 'GitHub Search',
    url: 'https://github.com/search?q=AI+agent+framework&type=repositories&s=stars&o=desc',
    extract: async (page) => {
      await page.waitForSelector('[data-testid="results-list"]', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const items = await page.$$('[data-testid="results-list"] > div');
      const repos = [];
      for (let i = 0; i < Math.min(5, items.length); i++) {
        const text = (await items[i].textContent()).slice(0, 150);
        repos.push(text);
      }
      return { repoCount: items.length, topRepos: repos };
    }
  },
  {
    name: 'PapersWithCode',
    url: 'https://paperswithcode.com/search?q=LLM+agent',
    extract: async (page) => {
      await page.waitForTimeout(3000);
      const items = await page.$$('.paper-title');
      const titles = [];
      for (let i = 0; i < Math.min(5, items.length); i++) {
        titles.push((await items[i].textContent()).trim());
      }
      return { paperCount: items.length, topTitles: titles };
    }
  },
  {
    name: 'NPM Registry',
    url: 'https://www.npmjs.com/search?q=ai-agent',
    extract: async (page) => {
      await page.waitForTimeout(3000);
      const items = await page.$$('section a[href*="/package/"] h3');
      const pkgNames = [];
      for (let i = 0; i < Math.min(5, items.length); i++) {
        pkgNames.push((await items[i].textContent()).trim());
      }
      return { pkgCount: items.length, topPackages: pkgNames };
    }
  }
];

const browser = await chromium.launch({ headless: true });
const results = {};

for (const test of TESTS) {
  const start = Date.now();
  try {
    const page = await browser.newPage();
    await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const data = await test.extract(page);
    const elapsed = Date.now() - start;
    results[test.name] = { status: '✅ OK', elapsed_ms: elapsed, data };
    console.log(`✅ ${test.name}: ${elapsed}ms —`, JSON.stringify(data).slice(0, 300));
    await page.close();
  } catch (e) {
    const elapsed = Date.now() - start;
    results[test.name] = { status: `❌ FAIL`, elapsed_ms: elapsed, error: e.message.slice(0, 200) };
    console.log(`❌ ${test.name}: ${elapsed}ms — ${e.message.slice(0, 200)}`);
  }
}

await browser.close();
console.log('\n=== SUMMARY ===');
for (const [name, r] of Object.entries(results)) {
  console.log(`${r.status} ${name} (${r.elapsed_ms}ms)`);
}
