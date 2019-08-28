const puppeteer = require('puppeteer');
const schedule = require('node-schedule');

const CHECKIN_URL = 'https://www.southwest.com/air/check-in/index.html';
const CONFIRMATION_FIELD_SELECTOR = '#confirmationNumber';
const FIRST_NAME_SELECTOR = '#passengerFirstName';
const LAST_NAME_SELECTOR = '#passengerLastName';
const CONFIRM_BUTTON_SELECTOR = '#form-mixin--submit-button';

let jobs = [];

const flights = [
  // {
  //   firstName: 'Test',
  //   lastName: 'Testerson',
  //   confirmationNumber: 'A1BCDE',
  //   flightTime: new Date(Date.UTC(2019, 7, 18, 17, 23)),
  //   returnFlightTime: new Date(Date.UTC(2019, 7, 18, 17, 25)),
  // },
  {
  firstName: 'Ryan',
  lastName: 'Haack',
  confirmationNumber: 'R5DNAZ',
  flightTime: new Date(Date.UTC(2019, 8, 22, 16, 15)),
  returnFlightTime: new Date(Date.UTC(2019, 8, 27, 17, 05)),
  },
];

const scheduleFlights = (flights) => {
  flights.forEach(flight => {scheduleConfirmation(flight)});
}

const scheduleConfirmation = (flight) => {
  // subtract 24 hours from the flight time
  departCheckInTime = new Date(flight.flightTime - 1000 * 60 * 60 * 24);
  console.log('Check in departing flight at: ', departCheckInTime.toDateString(), departCheckInTime.toTimeString());
  const departFl = schedule.scheduleJob(departCheckInTime, () => {confirmFlight(flight.firstName, flight.lastName, flight.confirmationNumber)});
  // console.log(departFl);
  jobs.push(departFl);
  if(flight.returnFlightTime) {
    returnCheckInTime = new Date(flight.returnFlightTime - 1000 * 60 * 60 * 24);
    console.log('Check in returning flight at: ', returnCheckInTime.toDateString(), returnCheckInTime.toTimeString());
    const returnFl = schedule.scheduleJob(returnCheckInTime, () => {confirmFlight(flight.firstName, flight.lastName, flight.confirmationNumber)});
    // console.log(returnFl);
    jobs.push(returnFl);
  }
}

const confirmFlight = async (firstName, lastName, confirmationNumber) => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(CHECKIN_URL);
  const [confirmationNumberInput, firstNameInput, lastNameInput, button] = await Promise.all([
    page.$(CONFIRMATION_FIELD_SELECTOR),
    page.$(FIRST_NAME_SELECTOR),
    page.$(LAST_NAME_SELECTOR),
    page.$(CONFIRM_BUTTON_SELECTOR),
  ]);
  await confirmationNumberInput.type(confirmationNumber);
  await firstNameInput.type(firstName);
  await lastNameInput.type(lastName);
  await button.click();
  await page.waitFor(5000);
  // await page.screenshot({ path: 'example.png' });
  await browser.close();
};

scheduleFlights(flights);

// Keep the script running while there are still jobs to do
while (jobs.length > 0) {
  jobs = jobs.filter(job => !job.nextInvocation());
}