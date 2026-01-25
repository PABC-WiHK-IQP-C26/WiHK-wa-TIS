# Tour info Scraper for IQP Sponsor WiHK

## /frontend
- app.js : makes necessary calls to helper scripts. MAIN
## /backend
- app.py : Runs flask app and receives the calls from app.js to all supporting python scripts
- getData.py : To process the data form the .csv / spreadsheet [Not fully implemented]
- processInput.py : processes client input, tokenizes etc. [WIP]


## To run:

Activate venv:
````
python -m venv .venv
.\.venv\Scripts\Activate.ps1
````

backend dependencies:
````
pip install -r backend\requirements.txt
pip install "gspread>=6.0.0"
````

Setting flask env variables for session:

````
$env:FLASK_APP = "backend.app"
$env:FLASK_ENV = "development"   # optional auto-reload
````

Running:
````
python backend\app.py
````
