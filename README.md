# TODO List — Flood Control Data Analysis Pipeline

## Managing Data Ingestion

### ✅ REQ-0001
- [X] Implement CSV ingestion (`loadData` method)
- [X] Confirm dataset reads successfully (≈9,800+ rows)
- [X] Log total record count to console

### REQ-0002
- [X] Implement data validation function
  - [X] Detect missing or invalid fields (e.g., blank date, null lat/long)
  - [X] Log count of invalid entries
  - [X] Skip or correct malformed rows

###  REQ-0003
- [X] Implement filtering for projects from **2021–2023**
  - [X] Exclude 2024 and beyond
  - [X] Verify correct date parsing from CSV

###  REQ-0004
- [X] Compute derived fields
  - [X] `CostSavings = ApprovedBudgetForContract - ContractCost`
  - [X] `CompletionDelayDays = days between StartDate and ActualCompletionDate`
  - [X] Store derived values back into each record

###  REQ-0005
- [X] Clean and standardize data
  - [X] Convert financial fields to float (PHP)
  - [X] Parse date fields into date objects
  - [X] Impute or remove rows with incomplete data (e.g., missing lat/long)

---

## Managing Report Generation

- maybe do one class for report generation, and have a helper function method for each report.

###  REQ-0006
- [ ] Generate **Report 1: Regional Flood Mitigation Efficiency Summary**
  - [ ] Aggregate totals by Region and MainIsland
  - [ ] Compute median CostSavings, average CompletionDelayDays
  - [ ] Compute % of projects delayed >30 days
  - [ ] Compute EfficiencyScore = `(median savings / average delay) * 100`, normalized 0–100
  - [ ] Output as sorted CSV (descending by EfficiencyScore)

###  REQ-0007
- [ ] Generate **Report 2: Top Contractors Performance Ranking**
  - [ ] Rank top 15 contractors (≥5 projects)
  - [ ] Compute:
    - [ ] Total ContractCost
    - [ ] Number of projects
    - [ ] Average CompletionDelayDays
    - [ ] Total CostSavings
    - [ ] ReliabilityIndex = `(1 - (avg delay / 90)) * (total savings / total cost) * 100`
  - [ ] Flag contractors with ReliabilityIndex <50 as “High Risk”
  - [ ] Output as sorted CSV

###  REQ-0008
- [ ] Generate **Report 3: Annual Project Type Cost Overrun Trends**
  - [ ] Group by FundingYear and TypeOfWork
  - [ ] Compute:
    - [ ] Total projects
    - [ ] Average CostSavings
    - [ ] Overrun rate (% with negative savings)
    - [ ] Year-over-year % change in average savings (baseline 2021)
  - [ ] Output as sorted CSV (ascending by year, descending by AvgSavings)

###  REQ-0009
- [ ] Generate **summary.json**
  - [ ] Include total projects, contractors, provinces
  - [ ] Global average delay, total savings
  - [ ] Aggregate key statistics across all reports

---

## Technical Specifications

###  REQ-0010
- [ ] Implement in **JavaScript**
- [ ] Ensure equivalent outputs in R, Kotlin, and Rust (if required for submission)

###  REQ-0011
- [ ] Standardize all report outputs
  - [ ] CSV formatting: comma-separated, rounded to 2 decimals
  - [ ] Single run command: `node index.js`
  - [ ] Consistent report schema across languages

