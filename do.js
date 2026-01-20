const fs = require("fs");
const path = require("path");

// File paths
const inputPath = path.join(__dirname, "./config/data.json");
const outputPath = path.join(__dirname, "output.json");
console.log("inputPath", inputPath)

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
const posts = newPosts.map(post => {
  const d = post.data || {};

  return {
    data: {
      title: d.title ?? "",
      url: d.url ?? "",
      gallery_data: d.gallery_data?? null,
      media_metadata:d.media_metadata?? null,
      selftext: d.selftext ?? "",
      permalink:d.permalink??"",
      author: d.author ?? "[deleted]",
      subreddit: d.subreddit ?? "",
      num_comments: d.num_comments ?? 0,
      media:d.media??null,
      link_flair_text: d.link_flair_text ?? null
    }
  };
});

// Write output JSON
fs.writeFileSync(
  outputPath,
  JSON.stringify( posts , null, 2),
  "utf8"
);

console.log("✅ Transformation complete. Output written to output.json");
