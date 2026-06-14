// Minimal Playwright test: verify GitHub + arXiv accessibility
import { chromium } from 'playwright';

const TESTS = [
  {
    name: 'GitHub',
    url: 'https://github.com/microsoft/autogen',
    extract: async (page) => {
      const stars = await page.textContent('#repo-stars-counter-star') ||
                    await page.textContent('[aria-label*="star"]');
      const about = await page.textContent('.f4.my-3');
      return { stars, about: about?.slice(0, 200) };
    }
  },
  {
    name: 'arXiv',
    url: 'https://arxiv.org/abs/2506.04565',
    extract: async (page) => {
      const title = await page.textContent('h1.title.mathjax');
      const authors = await page.textContent('.authors');
      const abstract = await page.textContent('blockquote.abstract');
      return { title: title?.replace('Title:', '').trim(), authors: authors?.slice(0, 200), abstract: abstract?.slice(0, 300) };
    }
  },
  {
    name: 'HuggingFace',
    url: 'https://huggingface.co/papers',
    extract: async (page) => {
      const firstPaper = await page.textContent('article:first-child h3');
      return { firstPaper };
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
    console.log(`✅ ${test.name}: ${elapsed}ms —`, JSON.stringify(data).slice(0, 200));
    await page.close();
  } catch (e) {
    const elapsed = Date.now() - start;
    results[test.name] = { status: `❌ FAIL`, elapsed_ms: elapsed, error: e.message };
    console.log(`❌ ${test.name}: ${elapsed}ms — ${e.message}`);
  }
}

await browser.close();
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(results, null, 2));
