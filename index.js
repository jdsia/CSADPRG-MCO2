!/********************
//Last name: Sia (Lead), Sayat, Lim, Vanguardia Language: Javascript
//Paradigm(s): OOP 
//********************
//

const readlineSync = require('readline-sync');
const fs = require("fs")
const { parse } = require('csv-parse/sync');
const { parseISO, isValid, differenceInDays } = require('date-fns');


const { writeToPath } = require('@fast-csv/format');
const path = require('path');
const { error } = require('console');
const { finished } = require('stream');



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
    // 2 variables, budget and cost
    for (const r of records) {
      const budget = Number(r.ApprovedBudgetForContract);
      const cost = Number(r.ContractCost);

      // parse dates
      const start = parseISO(r.StartDate);
      const end = parseISO(r.ActualCompletionDate);

      r.CostSavings = budget - cost;
      r.CompletionDelayDays = differenceInDays(end, start)
    }

    console.log("Derived fields computed");

    return records
  }

  // REQ-0005 
  cleanData(records) {
    // Map creates a new array with normalized versions of each record
    const cleaned = records.map(r => ({
      ...r, // Copy all existing properties first

      // Convert financial fields and derived fields to consistent numeric type
      ApprovedBudgetForContract: Number(r.ApprovedBudgetForContract),
      ContractCost: Number(r.ContractCost),
      CostSavings: Number(r.CostSavings),
      CompletionDelayDays: Number(r.CompletionDelayDays),

      // Convert date strings to Date objects for consistent processing later
      StartDate: parseISO(r.StartDate),
      ActualCompletionDate: parseISO(r.ActualCompletionDate)
    }));

    // Inform the user that normalization is done
    console.log('Data cleaned and normalized.');

    // Return the cleaned dataset
    return cleaned;
  }

  // helper function to clean data
  processData(filePath) {
    let data = this.loadData(filePath);
    data = this.validateData(data);
    data = this.filterByYear(data);
    data = this.computeDerivedFields(data);
    data = this.cleanData(data);
    console.log('Data has been processed!')

    return data;
  }


}

// Class
// Contains logic for generating reports
class ReportManager {

}




// App Class
class App {
  constructor() {
    this.isRunning = true;
    this.dataManager = new DataManager();
    this.reportManager = new ReportManager();
    this.data = [];
  }


  async start() {
    while (this.isRunning) {
      this.displayMainMenu()
      let choice = readlineSync.question("Please choose from Options [1] -> [2]: ");
      if (choice < '1' || choice > '7') {
        console.log("Invalid choice. Please choose a number from 1 to 2");
        choice = readlineSync.question("Please choose from Options [1] -> [2]: ");
      }
      await this.handleMainMenuChoice(choice);
    }
  }

  displayMainMenu() {
    console.log("Flood Control App");
    console.log("[1] Load the File");
    console.log("[2] Generate Reports")

  }

  async handleMainMenuChoice(choice) {
    switch (choice) {
      case '1':
        console.log("choice 1");
        this.handleReadCSV();
        break;
      case '2':
        console.log("choice 2");
        //this.handleDisplayCSV();
        await this.writeCsvFile(this.data)
        break;
      case '3':
        console.log("Process Terminated");
        this.isRunning = false;
        process.exit();
    }
  }

  handleReadCSV() {
    const filePath = './dpwh_flood_control_projects.csv';
    this.data = this.dataManager.processData(filePath);
    console.log('file loaded!')
  }

  // Generate records. Have helper class to handle the display of records, and just call it.
  handleDisplayCSV() {
    // Right now just loads the first entry form the data.
    //for (let j = 0; j <= 2; j++) {
    //console.log('sample record', this.data[j]);
    //}
    console.log(this.data)
  }

  async writeCsvFile(data, fileName = "test.csv") {
    if (!data || data.length === 0) {
      console.log('Error: the "data" array is empty. Nothing to write')
      return;
    }
    const outputPath = path.resolve(__dirname, fileName);
    console.log(`Data has ${data.length} items. Writing to file!`)

    // wrap the write in a promise. await for the promise to resovle
    try {
      await new Promise((resolve, reject) => {
        writeToPath(outputPath, data, {headers: true})
        .on('error', (err) => {
            // if fails, reject the promise
            reject(err)
          })
        .on('finish', () =>{
            console.log("CSV Write Successful!")
            resolve();
          });
      });


    } catch (err) {
      console.log('CSV Write Failed')
      console.error(err)
    }
  }


}

// start the app
const app = new App();
// entry point?
app.start()
