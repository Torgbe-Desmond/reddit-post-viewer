// reddit-paginated-fetcher.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const migrateRedditPost = require('./reddit-post-migration');

/**
 * Fetches all available posts from a subreddit's .json endpoint using pagination
 * @param {string} subreddit - Name of the subreddit (e.g. 'lpr')
 * @param {Object} [options] - Configuration options
 * @param {number} [options.maxPages=50] - Maximum number of pages to fetch (safety limit)
 * @param {number} [options.delayMs=2500] - Delay between requests in milliseconds (to be polite)
 * @param {string} [options.outputDir='./reddit-data'] - Where to save the fetched data
 * @param {boolean} [options.saveEachPage=true] - Whether to save each page separately
 * @param {boolean} [options.headless=true] - Run Puppeteer in headless mode
 * @returns {Promise<Object>} - { allPosts, totalFetched, lastAfter }
 */
async function fetchRedditSubredditPaginated(
  subreddit = 'lpr',
  options = {}
) {
  const {
    maxPages = 50,
    delayMs = 2500,
    outputDir = './reddit-data',
    saveEachPage = true,
    headless = true
  } = options;

  console.log(`Starting paginated fetch for r/${subreddit}...`);

  // Prepare output directory
  await fs.mkdir(outputDir, { recursive: true });

  const allPosts = [];
  let after = null;
  let pageCount = 0;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Set user-agent to look more like a browser (helps avoid blocks)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    do {
      pageCount++;
      const url = `https://www.reddit.com/r/${subreddit}/.json?limit=100${
        after ? `&after=${after}` : ''
      }`;

      console.log(`Fetching page ${pageCount}  →  ${url}`);

      // Go to the JSON URL
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()} - ${response.statusText()}`);
      }

      // Get the raw JSON content
      const jsonText = await page.evaluate(() => document.body.innerText);
      let data;

      try {
        data = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
        console.error('Response preview:', jsonText.substring(0, 300));
        throw e;
      }

      // Extract posts
      const posts = data.data?.children || [];
      const newAfter = data.data?.after;

      console.log(`  → Got ${posts.length} posts | next after: ${newAfter || '(end)'}`);

      // Add to collection
      allPosts.push(...posts);

      // Save individual page if requested
      if (saveEachPage) {
        const filename = path.join(outputDir, `page-${pageCount.toString().padStart(3, '0')}.json`);
        await fs.writeFile(filename, JSON.stringify(posts, null, 2));
        console.log(`  Saved: ${filename}`);
      }

      after = newAfter;

      // Safety limits
      if (pageCount >= maxPages) {
        console.warn(`Reached max pages limit (${maxPages}). Stopping.`);
        break;
      }

      if (after) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } while (after);

    // Save complete dataset
    const targetFile = path.join(__dirname, "../config/data.json");
    migrateRedditPost(allPosts, targetFile);

    return {
      allPosts,
      totalFetched: allPosts.length,
      lastAfter: after,
      pagesFetched: pageCount
    };

  } catch (error) {
    console.error('Error during fetch:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Example usage (run directly)
  (async () => {
    try {
      const subreddit_name = 'sibo'
      await fetchRedditSubredditPaginated(subreddit_name, {
        maxPages: 30,         
        delayMs: 3200,       
        outputDir: `./${subreddit_name}-data`,
        saveEachPage: false,
        headless: true
      });
    } catch (err) {
      console.error('Fatal error:', err);
      process.exit(1);
    }
  })();
