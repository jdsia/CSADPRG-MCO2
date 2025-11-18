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
    const orderedReport = filteredReport.sort((a, b) => b.TotalContractCost - a.TotalContractCost)


    
    // take top 15 using slice
    const top15Reports = orderedReport.slice(0, 15);
    
    const finalReport = top15Reports.map((contractor) => ({
      Contractor: contractor.Contractor,
      NumProjects: contractor.NumProjects,
      AverageCompletionDelayDays: contractor.AverageCompletionDelayDays,
      //TotalContractCost: contractor.TotalContractCost,
      TotalCostSavings: contractor.TotalCostSavings,
      ReliabilityIndex: contractor.ReliabilityIndex,
      // Flag <50 as "High Risk"
      RiskFlag: contractor.ReliabilityIndex < 50 ? "High Risk" : contractor.ReliabilityIndex, 
    }));

    return finalReport;
  }

//   Provision to generate Report 3: Annual Project Type Cost Overrun Trends. Group by
// FundingYear and TypeOfWork, computing the following:
// ● total projects
// ● average CostSavings (negative if overrun)
// ● overrun rate (% with negative savings)
// ● yeagenerateContractorPerformanceRankingr-over-year % change in average savings (2021 baseline).
  generateAnnualOverrunTrends(filteredData) {
    // const groupedByRegion = filteredData.reduce((acc, record) => {
    //   const key = `${record.MainIsland}|${record.Region}`;
    //
    //   // if key doesnt exist in accumulator obj yet
    //   if (!acc[key]) {
    //     // ... then create it
    //     acc[key] = {
    //       MainIsland: record.MainIsland,
    //       Region: record.Region,
    //       projects: []
    //     }
    //   }
    //
    //   // add the current record into the right group 
    //   acc[key].projects.push(record)
    //
    //   return acc;
    //
    // }, {}) // start with an empty obj accumulator;

    const groupedData = filteredData.reduce((acc, record) => {
      const key = `${record.FundingYear}|${record.TypeOfWork}`;

      if(!acc[key]){
       acc[key]  = {
          FundingYear: record.FundingYear,
          TypeOfWork: record.TypeOfWork,
          projects: []
        }
      }

      acc[key].projects.push(record)
      return acc;
    }, {})

    // process and aggregate data
    const aggregatedData = Object.values(groupedData).map(group => {
      const totalProjects = group.projects.length

      const stats = group.projects.reduce((projectAcc, project) => {
        const savings = parseFloat(project.CostSavings) || 0; // ensure CostSavings is a num
        projectAcc.sumCostSavings += savings;
        if (savings < 0) {
          projectAcc.overrunCount++
        }
        return projectAcc;
      }, {
          // initialize the accumulator
          sumCostSavings: 0,
          overrunCount: 0
        });

      // calc averages and rates for the group
      const averageCostSavings = (stats.sumCostSavings / totalProjects) || 0;
      const overrunRate = (stats.overrunCount / totalProjects) * 100 || 0; 

      return {
        FundingYear: group.FundingYear,
        TypeOfWork: group.TypeOfWork,
        TotalProjects: totalProjects,
        AverageCostSavings: averageCostSavings,
        OverrunRate: overrunRate
      };
    })

    // calculate YoY change vs 2021
    // create lookup map for 2021 baseline avg savings
    const baselineMap = new Map();
    aggregatedData
      .filter(d => d.FundingYear == 2021)
      .forEach(d => {
        // set (key, val)
        baselineMap.set(d.TypeOfWork, d.AverageCostSavings);
      })

    const finalData = aggregatedData.map(d => {
      //const baselineSavings = baselineMap.get(d.AverageCostSavings);
      const baselineSavings = baselineMap.get(d.TypeOfWork);
      let yoyChange = null; 

      if (d.FundingYear == 2021) {
        yoyChange = 0;
      } else if (baselineSavings != null) {
        if (baselineSavings === 0) {
          yoyChange = (d.AverageCostSavings === 0) ? 0 : null
        } else {
          yoyChange = ((d.AverageCostSavings - baselineSavings) / Math.abs(baselineSavings)) * 100;
        }
      }

      return {
        ...d,
        'YoY % Change (vs 2021)': yoyChange
      };
    })
    
    // return final data
    return finalData.sort((a,b) => {
      if (a.FundingYear !== b.FundingYear) {
        return a.FundingYear - b.FundingYear;
      }
      return a.TypeOfWork.localeCompare(b.TypeOfWork);
    });

  }


  generateSummaryJSON(allRecords) {
    const totalProjects = allRecords.length;

    // total num of unique contractors
    const contractorSet = new Set(allRecords.map(r => r.Contractor));
    const totalContractors = contractorSet.size;

    // total num of unique provinces
    const provinceField = allRecords[0].Province ? "Province" : "District";
    const provinceSet = new Set(allRecords.map(r => r[provinceField]));
    const totalProvinces = provinceSet.size;

    const globalAvgDelay = allRecords.reduce((sum, r) => sum + r.CompletionDelayDays, 0) / totalProjects;
    
    // sum = accumulator
    const totalSavings = allRecords.reduce((sum, r) => sum + r.CostSavings, 0);

    return {
      totalProjects,
      totalContractors,
      totalProvinces,
      globalAvgDelay,
      totalSavings
    }
  }

  pad(v, w) {
    v = String(v);
    return v.length >= w ? v.slice(0, w) : v + " ".repeat(w - v.length);
  }

    
  printReport1(data) {
    console.log("\nReport 1: Regional Flood Mitigation Efficiency Summary");
    const cols = [
      ["Region", 20],
      ["MainIsland", 12],
      ["TotalBudget", 15],
      ["MedianSavings", 15],
      ["AvgDelay", 10],
      ["HighDelayPct", 14],
      ["EfficiencyScore", 16],
    ];
    const header = "| " + cols.map(([n,w]) => this.pad(n, w)).join(" | ") + " |";
    const line   = "|-" + cols.map(([_,w]) => "-".repeat(w)).join("-|-") + "-|";
    console.log(header);
    console.log(line);
    data.slice(0,2).forEach(r => {
      const row = [
        r.Region,
        r.MainIsland,
        r.TotalApprovedBudget,
        r.MedianCostSavings,
        r.AverageCompletionDelayDays,
        r.PercentProjectsDelayedOver30Days,
        r.EfficiencyScore
      ];
      console.log("| " + row.map((v,i) => this.pad(v, cols[i][1])).join(" | ") + " |");
    });
    console.log("\n(Full table is in report1.csv)\n");
  }

  printReport2(data) {
    console.log("\nReport 2: Top Contractors Performance Ranking");
    const cols = [
      ["Rank", 4],
      ["Contractor", 30],
      ["TotalCost", 15],
      ["NumProj", 8],
      ["AvgDelay", 10],
      ["TotalSavings", 15],
      ["Reliability", 12],
      ["RiskFlag", 10],
    ];
    const header = "| " + cols.map(([n,w]) => this.pad(n, w)).join(" | ") + " |";
    const line   = "|-" + cols.map(([_,w]) => "-".repeat(w)).join("-|-") + "-|";
    console.log(header);
    console.log(line);
    data.slice(0,2).forEach((c, i) => {
      const row = [
        i + 1,
        c.Contractor,
        c.TotalContractCost,
        c.NumProjects,
        c.AverageCompletionDelayDays,
        c.TotalCostSavings,
        c.ReliabilityIndex,
        c.RiskFlag
      ];
  
      console.log("| " + row.map((v,i) => this.pad(v, cols[i][1])).join(" | ") + " |");
    });
  
    console.log("\n(Full table is in report2.csv)\n");
  }

  printReport3(data) {
  console.log("\nReport 3: Annual Project Type Cost Overrun Trends");
    const cols = [
      ["Year", 6],
      ["TypeOfWork", 35],
      ["TotalProj", 10],
      ["AvgSavings", 12],
      ["OverrunRate", 12],
      ["YoYChange", 12],
    ];

    const header = "| " + cols.map(([n,w]) => this.pad(n, w)).join(" | ") + " |";
    const line   = "|-" + cols.map(([_,w]) => "-".repeat(w)).join("-|-") + "-|";

    console.log(header);
    console.log(line);

    data.slice(0,2).forEach(r => {
      const row = [
        r.FundingYear,
        r.TypeOfWork,
        r.TotalProjects,
        r.AverageCostSavings.toFixed(2),
        r.OverrunRate.toFixed(2),
        r["YoY % Change (vs 2021)"]
      ];
      console.log("| " + row.map((v,i) => this.pad(v, cols[i][1])).join(" | ") + " |");
    });

    console.log("\n(Full table is in report3.csv)\n");
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

        const report1 = this.reportManager.generateEfficiencyReport(this.data)
        const report2 = this.reportManager.generateContractorPerformanceRanking(this.data)
        const report3 =this.reportManager.generateAnnualOverrunTrends(this.data)
        const summary = this.reportManager.generateSummaryJSON(this.data);


        await this.writeCsvFile(report1, "report1.csv");
        this.reportManager.printReport1(report1);

        await this.writeCsvFile(report2, "report2.csv")
        this.reportManager.printReport2(report2);

        await this.writeCsvFile(report3, "report3.csv")
        this.reportManager.printReport3(report3);
        // generate summary.json
        fs.writeFileSync("summary.json", JSON.stringify(summary, null, 2));
        console.log("summary.json generated");
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
