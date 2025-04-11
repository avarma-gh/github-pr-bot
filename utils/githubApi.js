const axios = require("axios");
const { retryWithBackoff } = require("./retry");

// Fetch all PR files with pagination
async function fetchAllPRFiles(prFilesUrl) {
  const allFiles = [];
  let page = 1;
  const perPage = 100; // GitHub API supports up to 100 items per page

  try {
    while (true) {
      const response = await retryWithBackoff(async () => {
        return await axios.get(prFilesUrl, {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
          params: {
            page,
            per_page: perPage,
          },
        });
      });

      const files = response.data;
      if (files.length === 0) break; // No more files to fetch

      allFiles.push(...files);
      page++;
    }
  } catch (error) {
    console.error("Error fetching PR files:", error.message);
    throw error;
  }

  return allFiles;
}

// Post a comment on the PR
async function postComment(prNumber, comment) {
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`;

  await retryWithBackoff(async () => {
    await axios.post(
      url,
      { body: comment },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
  });
}

// Fetch JSON file from GitHub for a given repo, SHA, and path
async function fetchFileContentFromGitHub(repo, sha, path) {
  try {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${sha}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw",
      },
    });
    // No need to parse, GitHub returns actual JSON
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${path} at ${sha}:`, error.message);
    return null;
  }
}

module.exports = { fetchAllPRFiles, postComment, fetchFileContentFromGitHub };
