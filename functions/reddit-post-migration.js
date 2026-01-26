const fs = require("fs");
const path = require("path");
const EditedRedditPost = require("../utils/EditedRedditPost");

function migrateRedditPost(newPosts, targetFile) {
  // File paths (adjust if your folder structure is different)
  // ← main flat array of all unique posts
  try {
    // Load new posts
    if (newPosts.length === 0) {
      console.log("No posts found in edit.json → nothing to add.");
      process.exit(0);
    }
    
    // Edit reddit posts
    const editedPosts = newPosts.map((post) => {
      const redditPost = post || {};
      return new EditedRedditPost(redditPost);
    });

    // Load existing data.json (flat array)
    let existingPosts = [];
    if (fs.existsSync(targetFile)) {
      const targetRaw = fs.readFileSync(targetFile, "utf-8").trim();
      if (targetRaw) {
        existingPosts = JSON.parse(targetRaw);

        if (!Array.isArray(existingPosts)) {
          console.warn(
            "data.json was not an array → starting fresh with empty array",
          );
          existingPosts = [];
        }
      }
    }

    // Create Set of existing post IDs for fast duplicate check
    const existingIds = new Set(
      existingPosts
        .map((post) => post?.data?.id)
        .filter((id) => typeof id === "string" && id.length > 0),
    );

    console.log(`Found ${existingIds.size} existing unique post IDs`);

    // Filter only new posts that don't exist yet
    const uniqueNewPosts = editedPosts.filter((post) => {
      const id = post?.data?.id;
      return id && typeof id === "string" && !existingIds.has(id);
    });

    if (uniqueNewPosts.length === 0) {
      console.log(
        "All posts in edit.json already exist in data.json → no changes.",
      );
      process.exit(0);
    }

    // Append only the new unique posts
    existingPosts.push(...uniqueNewPosts);

    // Save updated collection (pretty format)
    fs.writeFileSync(targetFile, JSON.stringify(existingPosts, null, 2));

    console.log(`Success! Added ${uniqueNewPosts.length} new unique posts.`);
    console.log(`Total posts in data.json now: ${existingPosts.length}`);
  } catch (error) {
    console.error("Error during merge:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

module.exports = migrateRedditPost;
