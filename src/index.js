(async () => {
  const { chromium } = require("playwright");
  const {
    URL,
    EXCLUDED_RESOURCES,
    AVAILABLE_CLASS,
    BOUNDARY_MONTH,
    CURRENT_MONTH,
    CALENDAR_TOOL,
    CALENDAR_BUTTON,
    POST_REQUEST,
  } = require("./globals.js");

  const getAvailableDays = async () => {
    const availableDays = await page.$$(
      `.${AVAILABLE_CLASS}:not(.${BOUNDARY_MONTH})`
    );
    return Promise.all(availableDays.map(async (day) => day.innerText()));
  };

  const getCurrentMonth = async () => {
    const $currentMonth = await page.$(`.${CURRENT_MONTH}`);
    const $currentMonthText = await $currentMonth.innerText();
    const [currentMonth] = $currentMonthText.split(",");
    return currentMonth;
  };

  const getMonthData = async () => {
    const currentMonth = await getCurrentMonth();
    const availableDays = await getAvailableDays();
    return {
      [currentMonth]: availableDays,
    };
  };

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
  const currentMonthData = await getMonthData();
  console.log(currentMonthData);

  // Get next month button
  const [, , $nextMonthBtn] = await page.$$(
    `.${CALENDAR_TOOL} > .${CALENDAR_BUTTON}`
  );

  // Wait for next month response
  const [response] = await Promise.all([
    // Waits for the next response matching some conditions
    page.waitForResponse(
      (response) =>
        response.url().startsWith(POST_REQUEST) && response.status() === 200
    ),
    // Triggers the response
    $nextMonthBtn.click(),
  ]);

  const nextMonthData = await getMonthData();
  console.log(nextMonthData);

  const availableDays = [
    ...Object.values(currentMonthData),
    ...Object.values(nextMonthData),
  ].flat();
  const hasAvailableDays = availableDays.length > 0;

  if (hasAvailableDays) {
    console.log(availableDays);
  }

  //Take screenshot and save it
  await page.screenshot({ path: `example.png` });

  // Close the browser
  await browser.close();
})();
