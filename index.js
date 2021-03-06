const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const fs = require('fs');

const CHECKIN_URL = 'https://www.southwest.com/air/check-in/index.html';
const CONFIRMATION_FIELD_SELECTOR = '#confirmationNumber';
const FIRST_NAME_SELECTOR = '#passengerFirstName';
const LAST_NAME_SELECTOR = '#passengerLastName';
const CONFIRM_BUTTON_SELECTOR = '#form-mixin--submit-button';
const CHECKIN_BUTTON_SELECTOR = '.air-check-in-review-results--check-in-button';
const RUN_TEST_FLIGHT = true;

let jobs = [];

const flights = JSON.parse(fs.readFileSync('flights.json'));

const scheduleFlights = flights => {
  flights.forEach(flight => {
    scheduleConfirmation(flight);
  });
};

const scheduleConfirmation = flight => {
  // subtract 24 hours from the flight time
  departCheckInTime = new Date(
    new Date(flight.flightTime) - 1000 * 60 * 60 * 24
  );
  if (departCheckInTime > Date.now()) {
    console.log(
      'Check in departing flight at: ',
      departCheckInTime.toDateString(),
      departCheckInTime.toTimeString()
    );
    const departFl = schedule.scheduleJob(departCheckInTime, () => {
      confirmFlight(
        flight.firstName,
        flight.lastName,
        flight.confirmationNumber
      );
    });
    // console.log(departFl);
    jobs.push(departFl);
  }
  if (flight.returnFlightTime) {
    returnCheckInTime = new Date(
      new Date(flight.returnFlightTime) - 1000 * 60 * 60 * 24
    );
    if (returnCheckInTime > Date.now()) {
      console.log(
        'Check in returning flight at: ',
        returnCheckInTime.toDateString(),
        returnCheckInTime.toTimeString()
      );
      const returnFl = schedule.scheduleJob(returnCheckInTime, () => {
        confirmFlight(
          flight.firstName,
          flight.lastName,
          flight.confirmationNumber
        );
      });
      // console.log(returnFl);
      jobs.push(returnFl);
    }
  }
};

const confirmFlight = async (firstName, lastName, confirmationNumber) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({ width: 1920, height: 1080 });
  await page.goto(CHECKIN_URL);
  const [
    confirmationNumberInput,
    firstNameInput,
    lastNameInput,
    button,
  ] = await Promise.all([
    page.$(CONFIRMATION_FIELD_SELECTOR),
    page.$(FIRST_NAME_SELECTOR),
    page.$(LAST_NAME_SELECTOR),
    page.$(CONFIRM_BUTTON_SELECTOR),
  ]);
  await confirmationNumberInput.type(confirmationNumber);
  await firstNameInput.type(firstName);
  await lastNameInput.type(lastName);
  await button.click();
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  const checkinButton = await page.$(CHECKIN_BUTTON_SELECTOR);
  try {
    await checkinButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  } catch (error) {
    console.log('ERROR: Could not click second check-in button! :');
    console.log(error);
  }
  await page.screenshot({
    path: `${confirmationNumber}.png`,
  });
  await browser.close();
};

if (RUN_TEST_FLIGHT) confirmFlight('Test', 'Testerson', 'ABC123');
scheduleFlights(flights);

// Keep the script running while there are still jobs to do
while (jobs.length > 0) {
  jobs = jobs.filter(job => !job.nextInvocation());
}
