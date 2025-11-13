//Last name: Sia (Lead), Sayat, Lim, Vanguardia Language: Javascript
//Paradigm(s): OOP 
//

const readlineSync = require('readline-sync');
//const fs = require("fs")
//const { parse } = require('csv-parse/sync');
//const { parseISO, isValid, differenceInDays, differenceInCalendarDays, min } = require('date-fns');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { parseISO, isValid, differenceInCalendarDays } = require('date-fns');

const { writeToPath } = require('@fast-csv/format');
const path = require('path');
const { error, clear } = require('console');
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

      // TODO - see if this fixes wrong data.
      // A project cannot finish before it starts.
      // Filter out this illogical data.
      if (differenceInCalendarDays(end, start) < 0) {
        invalidCount++;
        return false; // Exclude this row
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
      r.CompletionDelayDays = differenceInCalendarDays(end,start)
    }

    console.log("Derived fields computed");

    return records
  }

  // REQ-0005 
  cleanData(records) {
    // Map creates a new array with normalized versions of each record
    const cleaned = records.map(r => ({
      ...r, // Copy all existing properties

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
  // Generates Report 1: Regional Flood Mitigation Efficiency SUmmary
  generateEfficiencyReport(filteredData) {

    // === Step 1: Group projects by Region and MainIsland ===
    // TODO: maybe this should be GroupBy????
    const groupedByRegion = filteredData.reduce((acc, record) => {
      const key = `${record.MainIsland}|${record.Region}`;

      // if key doesnt exist in accumulator obj yet
      if (!acc[key]) {
        // ... then create it
        acc[key] = {
          MainIsland: record.MainIsland,
          Region: record.Region,
          projects: []
        }
      }

      // add the current record into the right group 
      acc[key].projects.push(record)

      return acc;

    }, {}) // start with an empty obj accumulator;

    // 2: Calculate Metrics for each group
    let processedData = Object.values(groupedByRegion).map(group => {
      const projects = group.projects;
      const totalProjects = projects.length

      const allSavings = projects.map(p => p.CostSavings);
      const allDelays = projects.map(p => p.CompletionDelayDays);

      // 0 is the starting value fo the sum accumulator
      // reduces all values in arr to a single value in accumulator (sum)
      const totalBudget = projects.reduce((sum, p) => sum + p.ApprovedBudgetForContract, 0)

      const medianSavings = this.getMedian(allSavings);
      const avgDelay = allDelays.reduce((sum, d) => sum + d, 0) / totalProjects;

      const delayedProjects = projects.filter(p => p.CompletionDelayDays > 30).length;
      const percentDelayed = (delayedProjects/totalProjects) * 100;

      // Calculate efficciency score
      let rawScore = 0;
      if (avgDelay <= 0) {
        rawScore = (medianSavings > 0) ? 99999999 : 0;
      } else if (medianSavings > 0) {
        rawScore = (medianSavings / avgDelay) * 100;
      }

      return {
        MainIsland: group.MainIsland,
        Region: group.Region,
        TotalApprovedBudget: totalBudget,
        MedianCostSavings: medianSavings,
        AverageCompletionDelayDays: avgDelay,
        PercentProjectsDelayedOver30Days: percentDelayed,
        rawScore: rawScore
      }
    })

    //Normalize Efficiency Score (0-100)
    const scores = processedData.map(r => r.rawScore);
    const minScore = Math.min(...scores);
    const maxScore= Math.max(...scores);
    const scoreRange = maxScore - minScore;

    let finalReport = processedData.map(r => {
      let efficiencyScore = 0;

      if (scoreRange > 0) {
        efficiencyScore = ((r.rawScore - minScore) / scoreRange) * 100;
      } else if (maxScore > 0) {
        efficiencyScore = 100;
      }

      delete r.rawScore;

      return {
        ...r,
        EfficiencyScore: efficiencyScore
      }
    })

    finalReport.sort((a, b) => b.EfficiencyScore - a.EfficiencyScore);
    console.log(`Report 1 generated with ${finalReport.length} regions.`);
    return finalReport;
  }

  // Get Median Function
  getMedian(numbers) {
    if (!numbers.length) return 0;
    
    const sorted = numbers.slice().sort((a,b) => a - b);
    const mid = Math.floor(sorted.length/2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }


  // REQ-0007 - Report 2: Top Contractors Performance Ranking
  //rank top 15 contractors by total Contract Cost
  // (Descending, filter >= 5 projects)
  // Needed columns: numProjects, AverageCompletionDelayDays, totalCostSavings, Reliability index
  generateContractorPerformanceRanking(filteredData) {
    // groupedByContractors???
    // use reduce not groupby (to aggregate.)
    // acc is the object we are building, proj current item in the array being processed
    const groupedByContractors = filteredData.reduce((acc, project) => {
      // this will be the key
      const contractorName = project.Contractor

      if (!acc[contractorName]) {
        acc[contractorName] = {
          NumProjects: 0,
          TotalContractCost: 0,
          TotalCostSavings: 0,
          TotalCompletionDelayDays: 0
        }
      } 
      
      // Update values for contractor
      acc[contractorName].NumProjects += 1;
      acc[contractorName].TotalContractCost += Number(project.ContractCost);
      acc[contractorName].TotalCostSavings += Number(project.CostSavings)
      acc[contractorName].TotalCompletionDelayDays += project.CompletionDelayDays;

      return acc;
    }, {})

    // 2017 contractors in the sheets, and 2017 here also
    //console.log(groupedByContractors);
    //console.log(Object.keys(groupedByContractors).length)
    
    // Generate Report
    // {
    //   "BuildCo": {
    //     NumProjects: 2,
    //     TotalContractCost: 250,
    //     TotalCostSavings: 15,
    //     TotalCompletionDelayDays: 15
    //   },
    //   "River Inc": {
    //     NumProjects: 1,
    //     TotalContractCost: 200,
    //     TotalCostSavings: 20,
    //     TotalCompletionDelayDays: -2
    //   }
    // }

    const processedData = Object.entries(groupedByContractors).map(([contractorName, group]) => {
      const avgDelay = group.TotalCompletionDelayDays / group.NumProjects;
      const totalCost = group.TotalContractCost;
      const totalSavings = group.TotalCostSavings;

      // Calculate Reliability Index: (1 - (avg delay / 90)) * (total savings / total cost) * 100
      const delayFactor = (1 - (avgDelay / 90));
      const savingsFactor = (totalCost === 0) ? 0 : (totalSavings / totalCost);

      let reliabilityIndex = delayFactor * savingsFactor * 100;

      reliabilityIndex = Math.min(reliabilityIndex, 100);

      return {
        Contractor: contractorName,
        NumProjects: group.NumProjects,
        TotalContractCost: group.TotalContractCost,
        AverageCompletionDelayDays: avgDelay,
        TotalCostSavings: totalSavings,
        TotalContractCost: totalCost,
        ReliabilityIndex: reliabilityIndex,
      }
    })
    // console.log(processedData)

    // Filter for contractors with >= 5 projects
    const filteredReport = processedData.filter((contractor) => contractor.NumProjects >= 5);


    // Sort by TotalContractCost (desc)
    const orderedReport = filteredReport.sort((a, b) => {
      b.TotalContractCost - a.TotalContractCost
    })

    
    // take top 15 using slice
    const top15Reports = orderedReport.slice(0, 15);
    
    const finalReport = top15Reports.map((contractor) => ({
      Contractor: contractor.Contractor,
      NumProjects: contractor.NumProjects,
      AverageCompletionDelayDays: contractor.AverageCompletionDelayDays,
      TotalCostSavings: contractor.TotalCostSavings,
      ReliabilityIndex: contractor.ReliabilityIndex,
      // Flag <50 as "High Risk"
      RiskFlag: contractor.ReliabilityIndex < 50 ? "High Risk" : contractor.ReliabilityIndex, 
    }));

    return finalReport;
    


  }



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
    console.log("[3] Exit Program")

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
        //await this.writeCsvFile(this.data)
        //console.log(this.data)
        //console.log(this.reportManager.generateEfficiencyReport(this.data))
        // make sure to call await when using the write csvFile
        await this.writeCsvFile(this.reportManager.generateEfficiencyReport(this.data), "report1.csv");
        //await this.writeCsvFile(this.data, "filteredData.csv");
        await this.writeCsvFile(this.reportManager.generateContractorPerformanceRanking(this.data), "report2.csv")
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
    //console.log(this.data)
  }


  // make sure to call await when using the write csvFile
  async writeCsvFile(data, fileName) {
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
            console.log(`Writing to CSV File: ${fileName} Successful!`)
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
app.start();
