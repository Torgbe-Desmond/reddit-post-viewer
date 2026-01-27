// reddit-paginated-fetcher.js
const fs = require("fs").promises;
const path = require("path");
const migrateRedditPost = require("./reddit-post-migration");

/**
 * Fetches all available posts from a subreddit's .json endpoint using pagination
 * @param {string} subreddit
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function fetchRedditSubredditPaginated(subreddit = "lpr", options = {}) {
  const {
    maxPages = 50,
    delayMs = 2500,
    outputDir = "./reddit-data",
    saveEachPage = true,
  } = options;

  console.log(`Starting paginated fetch for r/${subreddit}...`);

  await fs.mkdir(outputDir, { recursive: true });

  const allPosts = [];
  let after = null;
  let pageCount = 0;

  try {
    do {
      pageCount++;

      const url = `https://www.reddit.com/r/${subreddit}/.json?limit=100${
        after ? `&after=${after}` : ""
      }`;

      console.log(`Fetching page ${pageCount} → ${url}`);

      const response = await fetch(url, {
        headers: {
          // Reddit strongly prefers a clear User-Agent
          "User-Agent": "reddit-paginated-fetcher/1.0 (by u/yourusername)",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.data?.children) {
        throw new Error("Invalid response format (possible rate limit or block)");
      }

      const posts = data.data.children;
      const newAfter = data.data.after;

      console.log(
        `  → Got ${posts.length} posts | next after: ${newAfter || "(end)"}`
      );

      allPosts.push(...posts);

      if (saveEachPage) {
        const filename = path.join(
          outputDir,
          `page-${pageCount.toString().padStart(3, "0")}.json`
        );

        await fs.writeFile(filename, JSON.stringify(posts, null, 2));
        console.log(`  Saved: ${filename}`);
      }

      after = newAfter;

      if (pageCount >= maxPages) {
        console.warn(`Reached maxPages limit (${maxPages}). Stopping.`);
        break;
      }

      if (after) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

    } while (after);

    // Final migration
    const targetFile = path.join(__dirname, "../config/data.json");
    await migrateRedditPost(allPosts, targetFile);

    return {
      allPosts,
      totalFetched: allPosts.length,
      lastAfter: after,
      pagesFetched: pageCount,
    };

  } catch (err) {
    console.error("Error during fetch:", err.message);
    throw err;
  }
}

module.exports = fetchRedditSubredditPaginated;

// ──────────────────────────────────────────────────────────────────────────────
// Example usage (run directly)
if (require.main === module) {
  (async () => {
    try {
      const subreddit_names_list = ["sibo","lpr","gerd"];

      for (const subreddit of subreddit_names_list) {
        await fetchRedditSubredditPaginated(subreddit, {
          maxPages: 50,
          delayMs: 3200,
          outputDir: `./${subreddit}-data`,
          saveEachPage: false,
        });
      }
    } catch (err) {
      console.error("Fatal error:", err);
      process.exit(1);
    }
  })();
}
