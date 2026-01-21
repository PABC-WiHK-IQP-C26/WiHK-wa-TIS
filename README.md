# Tour info Scraper for IQP Sponsor WiHK

## /frontend
- app.js : makes necessary calls to helper scripts. MAIN
## /backend
- app.py : Runs flask app and receives the calls from app.js to all supporting python scripts
- getData.py : To process the data form the .csv / spreadsheet [Not fully implemented]
- processInput.py : processes client input, tokenizes etc. [WIP]
