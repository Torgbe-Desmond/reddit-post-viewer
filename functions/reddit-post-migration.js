const fs = require("fs").promises;
const path = require("path");
const EditedRedditPost = require("../utils/EditedRedditPost");

async function migrateRedditPost(newPosts, targetFile) {
  if (!Array.isArray(newPosts) || newPosts.length === 0) {
    console.log("No new posts provided → nothing to migrate.");
    return { added: 0, total: 0 };
  }

  try {
    // Transform posts
    const editedPosts = newPosts.map((post) => new EditedRedditPost(post));

    // Load existing data
    let existingPosts = [];
    try {
      const raw = await fs.readFile(targetFile, "utf-8");
      existingPosts = JSON.parse(raw);

      if (!Array.isArray(existingPosts)) {
        console.warn("data.json was not an array → starting fresh");
        existingPosts = [];
      }
    } catch (err) {
      if (err.code !== "ENOENT") throw err; // real error
    }

    // Deduplication
    const existingIds = new Set(
      existingPosts
        .map((post) => post?.data?.id)
        .filter((id) => typeof id === "string")
    );

    const uniqueNewPosts = editedPosts.filter((post) => {
      const id = post?.data?.id;
      return id && !existingIds.has(id);
    });

    if (uniqueNewPosts.length === 0) {
      console.log("No new unique posts to add.");
      return { added: 0, total: existingPosts.length };
    }

    const merged = existingPosts.concat(uniqueNewPosts);

    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, JSON.stringify(merged, null, 2));

    console.log(`Added ${uniqueNewPosts.length} new posts.`);
    console.log(`Total posts: ${merged.length}`);

    return {
      added: uniqueNewPosts.length,
      total: merged.length,
    };
  } catch (error) {
    console.error("Error during Reddit post migration:", error);
    throw error;
  }
}

module.exports = migrateRedditPost;
