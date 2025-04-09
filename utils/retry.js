async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Attempt the function call
      const response = await fn();

      // Check for rate-limiting headers
      if (
        response &&
        response.headers &&
        response.headers["x-ratelimit-remaining"] === "0"
      ) {
        const resetTime = parseInt(response.headers["x-ratelimit-reset"], 10);
        const currentTime = Math.floor(Date.now() / 1000);
        const waitTime = Math.max(resetTime - currentTime, 0) * 1000 + 1000; // Add a buffer

        console.warn(`Rate limit exceeded. Waiting for ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue; // Retry after waiting
      }

      return response;
    } catch (error) {
      retries++;
      const delay = initialDelay * Math.pow(2, retries - 1); // Exponential backoff

      console.warn(
        `Attempt ${retries} failed. Retrying in ${delay}ms... Error:`,
        error.message
      );

      if (retries >= maxRetries) {
        console.error("Max retries reached. Throwing error.");
        throw error; // Rethrow the error after max retries
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
