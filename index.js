//********************
//Last name: Sia (Lead), Sayat, Lim, Vanguardia Language: Javascript
//Paradigm(s): OOP 
//********************

const readlineSync = require('readline-sync')
const fs = require("fs")
const csvParser = require("csv-parse");


class App {
  constructor() {
    this.isRunning = true;
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
        break;
      case '3':
        console.log("Process Terminated");
        process.exit();
    }
  }

  // handle csv parser?
  handleReadCSV() {
    const result = [];

    fs.createReadStream("./dpwh_flood_control_projects.csv")
      .pipe(csvParser())
      .on("data", (data) => {
        result.push(data);
      })
      .on("end", () => {
        console.log(result);
      })

  }
}

// start the app
const app = new App();
app.start()
