//********************
//Last name: Sia (Lead), Sayat, Lim, Vanguardia Language: Javascript
//Paradigm(s): OOP 
//********************
//

const readlineSync = require('readline-sync');
const fs = require("fs")
const { parse } = require('csv-parse/sync');
const { parseISO, isValid, differenceInDays } = require('date-fns');


class DataManager {
  // Loads data from the csv file
  // REQ 0001
  loadData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const records = parse(content, {
      columns: true, // uses first row as header keys for objs
      skip_empty_lines: true // ignores blank lines
    })
    console.log(`loaded ${records.length} records.`)
    return records;
  }

  // REQ 0002
  // Validate and clean fields
  validateData(records) {
    // Counter to keep track of how many invalid records are found
    let invalidCount = 0;

    // Defines which columns must be present and valid in each record
    const required = [
      'StartDate',
      'ActualCompletionDate',
      'ApprovedBudgetForContract',
      'ContractCost',
      'Region',
      'FundingYear'
    ];

    // Filters out invalid rows, keeping only valid ones
    const valid = records.filter(row => {
      // Check if any required field is missing or empty
      for (const field of required) {
        if (!row[field] || row[field].trim() === '') {
          invalidCount++;
          return false; // exclude this row
        }
      }

      // Convert financial fields to numbers for validation
      const budget = Number(row.ApprovedBudgetForContract);
      const cost = Number(row.ContractCost);

      // Reject if either conversion fails (NaN)
      if (isNaN(budget) || isNaN(cost)) {
        invalidCount++;
        return false;
      }

      // Parse date strings into Date objects for validation
      const start = parseISO(row.StartDate);
      const end = parseISO(row.ActualCompletionDate);

      // Reject if either date is invalid
      if (!isValid(start) || !isValid(end)) {
        invalidCount++;
        return false;
      }

      // If all checks passed, keep this record
      return true;
    });

    // Print summary of valid vs invalid entries
    console.log(`Validated ${valid.length} valid records.`);
    console.log(`Removed ${invalidCount} invalid records.`);

    // Return the filtered list of valid rows
    return valid;
  }

  // REQ-0003
  filterByYear(records, startYear = 2021, endYear = 2023) {
    const filtered = records.filter(r => {
      const year = Number(r.FundingYear)
      return year >= startYear && year <= endYear;
    });

    console.log(`Filtered records (FundingYear ${startYear}-${endYear}): ${filtered.length}`);

    return filtered;
  }

  // REQ-0004 
  // Provision to compute CostSavings, CompletionDelayDays
  computeDerivedFields(records) {
    
  }

}

class App {
  constructor() {
    this.isRunning = true;
    this.dataManager = new DataManager();
    this.data = [];
  }


  start() {
    while (this.isRunning) {
      this.displayMainMenu()
      let choice = readlineSync.question("Please choose from Options [1] -> [2]: ");
      if (choice < '1' || choice > '7') {
        console.log("Invalid choice. Please choose a number from 1 to 2");
        choice = readlineSync.question("Please choose from Options [1] -> [2]: ");
      }
      this.handleMainMenuChoice(choice);
    }
  }

  displayMainMenu() {
    console.log("Flood Control App");
    console.log("[1] Load the File");
    console.log("[2] Generate Reports")
    
  }

  handleMainMenuChoice(choice) {
    switch(choice) {
      case '1':
        console.log("choice 1");
        this.handleReadCSV();
        break;
      case '2':
        console.log("choice 2");
        this.handleDisplayCSV()
        break;
      case '3':
        console.log("Process Terminated");
        this.isRunning = false;
        process.exit();
    }
  }

  handleReadCSV() {
    const filePath = './dpwh_flood_control_projects.csv';
    this.data = this.dataManager.loadData(filePath);
    console.log('file loaded!')
  }

  handleDisplayCSV() {
    // Right now just loads the first entry form the data.
    console.log('sample record', this.data[0]);
  }


}

// start the app
const app = new App();
// entry point?
app.start()
