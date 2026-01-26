const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const bodyParser = require("body-parser");
const { marked } = require("marked-cjs");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security: DOMPurify setup ───────────────────────────────────────
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// ─── View engine & middleware ────────────────────────────────────────
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
// app.set("view options", { async: true });

// ─── Helpers attached to locals ──────────────────────────────────────
app.locals.renderMarkdown = (text) => {
  if (!text?.trim()) return "";
  const dirty = marked.parse(text, {
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false,
    smartypants: true,
  });
  return DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["target", "rel"],
  });
};


// ─── Data caching ────────────────────────────────────────────────────
const dataFile = path.join(__dirname, "./config/data.json");
let cachedPosts = [];
let lastLoaded = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getPosts() {
  const now = Date.now();

  // Reload only if cache is old or empty
  if (cachedPosts.length === 0 || now - lastLoaded > CACHE_DURATION) {
    try {
      const raw = await fs.readFile(dataFile, "utf-8");
      const posts = raw.trim() ? JSON.parse(raw) : [];

      // Sort by newest first (most common expectation)
      cachedPosts = posts.sort((a, b) =>
        (b.data.created_utc || 0) - (a.data.created_utc || 0)
      );

      lastLoaded = now;
      console.log(`Loaded & sorted ${cachedPosts.length} posts from data.json`);
    } catch (err) {
      console.error("Failed to load data.json:", err.message);
      // Keep using old cache if available, or empty array
    }
  }

  return cachedPosts;
}

// ─── Main route ──────────────────────────────────────────────────────
app.get("/", async (req, res) => {
  try {
    let posts = [...await getPosts()];

    const { author, subreddit, flair, keyword, page = "1" } = req.query;

    // Filtering
    if (author) {
      posts = posts.filter(p =>
        p.data.author?.toLowerCase().includes(author.toLowerCase())
      );
    }

    if (subreddit && subreddit.toLowerCase() !== "all") {
      posts = posts.filter(p =>
        p.data.subreddit?.toLowerCase() === subreddit.toLowerCase()
      );
    }

    if (flair) {
      posts = posts.filter(p =>
        p.data.link_flair_text?.toLowerCase().includes(flair.toLowerCase())
      );
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      posts = posts.filter(p =>
        p.data.title?.toLowerCase().includes(kw) ||
        p.data.selftext?.toLowerCase().includes(kw)
      );
    }

    // Pagination
    const perPage = 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const totalResults = posts.length;
    const totalPages = Math.ceil(totalResults / perPage);

    const start = (currentPage - 1) * perPage;
    const paginatedPosts = posts.slice(start, start + perPage);

    res.render("app", {
      posts: paginatedPosts,
      filters: req.query,
      currentPage,
      totalPages,
      totalResults,
    });
  } catch (err) {
    console.error("Route error:", err);
    res.status(500).send("Something went wrong while loading posts.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});