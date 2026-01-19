const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const { marked } = require('marked-cjs');
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const app = express();
const PORT = 3000;

// Security: DOMPurify setup
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Safe markdown rendering helper
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
    ADD_TAGS: ["iframe"], // optional - only if you really need embedded content
    ADD_ATTR: ["target", "rel"],
  });
};

const dataFile = path.join(__dirname, "./config/data.json");
console.log("dataFile", dataFile)
let posts = [];
if (fs.existsSync(dataFile)) {
  const raw = fs.readFileSync(dataFile, "utf-8");
  if (raw) posts = JSON.parse(raw);
}

app.get("/", (req, res) => {
  const { author, subreddit, flair, keyword, page = "1" } = req.query;

  let filteredPosts = posts;

  if (author) {
    filteredPosts = filteredPosts.filter((p) =>
      p.data.author?.toLowerCase().includes(author.toLowerCase())
    );
  }

  if (subreddit && subreddit.toLowerCase() !== 'all') {
    filteredPosts = filteredPosts.filter((p) =>
      p.data.subreddit?.toLowerCase() === subreddit.toLowerCase()
    );
  }

  if (flair) {
    filteredPosts = filteredPosts.filter((p) =>
      p.data.link_flair_text?.toLowerCase().includes(flair.toLowerCase())
    );
  }

  if (keyword) {
    filteredPosts = filteredPosts.filter(
      (p) =>
        p.data.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        p.data.selftext?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /* ===== PAGINATION ===== */
  const perPage = 10;
  const currentPage = parseInt(page) || 1;
  const totalPages = Math.ceil(filteredPosts.length / perPage);
  const totalResults = filteredPosts.length;

  const start = (currentPage - 1) * perPage;
  const paginatedPosts = filteredPosts.slice(start, start + perPage);

  res.render("index", {
    posts: paginatedPosts,
    filters: req.query,
    currentPage,
    totalPages,
    totalResults,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});