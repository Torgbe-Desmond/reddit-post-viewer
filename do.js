const fs = require("fs");
const path = require("path");
const EditedRedditPost = require("./utils/EditedRedditPost");

// File paths
const inputPath = path.join(__dirname, "./config/data.json");
const outputPath = path.join(__dirname, "output.json");
console.log("inputPath", inputPath);

// Read input JSON
const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

// Extract posts (Reddit format)
const rawPosts = raw?.data?.children ?? [];
let newPosts = [];
if (fs.existsSync(inputPath)) {
  const sourceRaw = fs.readFileSync(inputPath, "utf-8").trim();
  if (sourceRaw) {
    newPosts = JSON.parse(sourceRaw);

    // Safety: ensure it's an array
    if (!Array.isArray(newPosts)) {
      throw new Error("edit.json does not contain an array of posts");
    }

    console.log(`Loaded ${newPosts.length} posts from edit.json`);
  }
}

// Transform
const posts = newPosts.map((post) => {
  const redditPost = post || {};
  return new EditedRedditPost(redditPost);
});

// Write output JSON
fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), "utf8");

console.log("✅ Transformation complete. Output written to output.json");
