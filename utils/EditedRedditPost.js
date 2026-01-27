class EditedRedditPost {
  constructor(redditPost) {
    this.kind = redditPost.kind ?? 't3'; // default to link/post kind if missing

    this.data = {
      id: redditPost.data?.id ?? '',
      title: redditPost.data?.title ?? '',
      url: redditPost.data?.url ?? '',
      gallery_data: redditPost.data?.gallery_data ?? null,
      media_metadata: redditPost.data?.media_metadata ?? null,
      selftext: redditPost.data?.selftext ?? '',
      permalink: redditPost.data?.permalink ?? '',
      author: redditPost.data?.author ?? '[deleted]',
      subreddit: redditPost.data?.subreddit ?? '',
      num_comments: redditPost.data?.num_comments ?? 0,
      subreddit_name_prefixed: redditPost.data?.subreddit_name_prefixed ?? '',
      media: redditPost.data?.media ?? null,
      link_flair_text: redditPost.data?.link_flair_text ?? null,
    };
  }
}

module.exports = EditedRedditPost;