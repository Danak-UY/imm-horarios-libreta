(async () => {
  const { chromium } = require("playwright");
  const { URL, EXCLUDED_RESOURCES, AVAILABLE_CLASS } = require("./globals.js");

  // Create new chromium browser
  const browser = await chromium.launch();

  // Incognito browser instance
  const context = await browser.newContext();

  // Open a new page
  const page = await context.newPage();

  // Block not needed resources
  await page.route("**/*", (route) => {
    return EXCLUDED_RESOURCES.includes(route.request().resourceType())
      ? route.abort()
      : route.continue();
  });

  // Open the url
  await page.goto(URL);

  // Get all available days
  const availableDays = await page.$$(`.${AVAILABLE_CLASS}`);
  console.log("Available", availableDays.length);

  //Take screenshot and save it
  await page.screenshot({ path: `example.png` });

  // Close the browser
  await browser.close();
})();
