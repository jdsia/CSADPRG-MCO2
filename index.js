//********************
//Last name: Sia (Lead), Sayat, Lim, Vanguardia Language: Javascript
//Paradigm(s): OOP 
//********************

const readlineSync = require('readline-sync');
const fs = require("fs")
const { parse } = require('csv-parse/sync');

class DataManager {
  // Loads data from the csv file
  loadData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true
    })
    console.log(`loaded ${records.length} records.`)
    return records;
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
        process.exit();
    }
  }

  handleReadCSV() {
    const filePath = './dpwh_flood_control_projects.csv';
    this.data = this.dataManager.loadData(filePath);
    console.log('file loaded!')
  }

  handleDisplayCSV() {
    console.log('sample record', this.data[0]);
  }


}

// start the app
const app = new App();
// entry point?
app.start()
