(async () => {
  try {
    const { chromium } = require("playwright-chromium");
    const { BROWSER, CALENDAR, MAIL } = require("./globals.js");

    const dotenv = require("dotenv");
    dotenv.config();
    const env = process.env;

    const transporterOptions = {
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: env.FROM_MAIL,
        pass: env.FROM_MAIL_PASS,
        clientId: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
        refreshToken: env.REFRESH_TOKEN,
      },
    };

    const mailer = require("nodemailer");
    const transporter = mailer.createTransport(transporterOptions);

    const sendEmail = (config) =>
      new Promise((resolve, reject) => {
        transporter.sendMail(config, function (error, info) {
          if (error) reject(error);
          resolve(info);
        });
      });

    const getAvailableDays = async () => {
      const availableDays = await page.$$(
        `.${CALENDAR.AVAILABLE_CLASS}:not(.${CALENDAR.BOUNDARY_MONTH})`
      );
      return Promise.all(availableDays.map(async (day) => day.innerText()));
    };

    const getCurrentMonth = async () => {
      const $currentMonth = await page.$(`.${CALENDAR.CURRENT_MONTH}`);
      const currentMonthText = await $currentMonth.innerText();
      return currentMonthText;
    };

    const getMonthData = async () => {
      const month = await getCurrentMonth();
      const availableDays = await getAvailableDays();
      return {
        month,
        availableDays,
      };
    };

    const getOnlyMonth = ({ month }) => month.split(",")[0];

    const retrieveNextMonth = async () => {
      // Get next month button
      const [, , $nextMonthBtn] = await page.$$(
        `.${CALENDAR.CALENDAR_TOOL} > .${CALENDAR.CALENDAR_BUTTON}`
      );

      // Wait for next month response
      return Promise.all([
        // Waits for the next response matching some conditions
        page.waitForResponse(
          (response) =>
            response.url().startsWith(BROWSER.POST_REQUEST) &&
            response.status() === 200
        ),
        // Triggers the response
        $nextMonthBtn.click(),
      ]);
    };

    const getNextYearAvailableDays = async () => {
      const months = [];
      let currentMonth = await getMonthData();
      months.push(currentMonth);

      const firstMonthText = getOnlyMonth(currentMonth);

      do {
        await retrieveNextMonth();
        currentMonth = await getMonthData();
        months.push(currentMonth);
      } while (firstMonthText !== getOnlyMonth(currentMonth));

      return months.filter((month) => month.availableDays.length > 0);
    };

    const generateAvailableDaysHtml = (months) => {
      let html = "";
      for (let month of months) {
        for (let day of month.availableDays) {
          html += `<li>${day} ${month.month}</li>`;
        }
      }

      return html;
    };

    // Create new chromium browser
    const browser = await chromium.launch({ chromiumSandbox: false });

    // Incognito browser instance
    const context = await browser.newContext();

    // Open a new page
    const page = await context.newPage();

    // Block not needed resources
    await page.route("**/*", (route) => {
      return BROWSER.EXCLUDED_RESOURCES.includes(route.request().resourceType())
        ? route.abort()
        : route.continue();
    });

    // Open the url
    await page.goto(BROWSER.URL);

    // Get next year data
    const availableMonths = await getNextYearAvailableDays();
    const hasAvailableMonth = availableMonths.length > 0;

    // Close the browser
    await browser.close();

    if (hasAvailableMonth) {
      const mailConfiguration = {
        from: MAIL.FROM,
        to: MAIL.FROM,
        bcc: env.MAIL_LIST,
        subject: MAIL.SUBJECT,
        html: MAIL.HTML.replace(
          MAIL.LIST_WILDCARD,
          generateAvailableDaysHtml(availableMonths)
        ),
      };

      // Send mail
      //   await sendEmail(mailConfiguration);
    }
  } catch (error) {
    console.log("Hubo un error");
    console.warn(error);
  }
})();
