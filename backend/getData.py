import os
import nltk
import gspread
from dotenv import load_dotenv
import pandas as pd
from google.oauth2.service_account import Credentials

load_dotenv()

# Initialize gspread client (will be set up when function is called)
user = None


def get_gspread_client():
    """Initialize and return gspread client with proper credentials."""
    print("Initializing gspread client...", flush=True)
    global user
    if user is None:
        # Path to your credentials JSON file from .env
        creds_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
        print(f"Credentials path from .env: {creds_path}", flush=True)
        
        # If path is relative, make it absolute from project root
        if creds_path and not os.path.isabs(creds_path):
            creds_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), creds_path)
        
        print(f"Loading credentials from: {creds_path}", flush=True)
        
        if not os.path.exists(creds_path):
            raise FileNotFoundError(f"Credentials file not found at: {creds_path}")
        
        # Define the required scopes
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        
        # Load credentials from JSON file
        creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
        user = gspread.authorize(creds)    
    return user


def fetch_google_sheet_data():
    #Fetches data from Google Sheets using the sheet ID from .env file.
    #Returns the sheet data or None if there's an error.
    
    try:
        gs_id = os.getenv("gs_id")  # gets google sheet id from .env file
        print(f"Fetching Google Sheet with ID: {gs_id}", flush=True)
        client = get_gspread_client()
        # Get authenticated client
        sheet = client.open_by_url('https://docs.google.com/spreadsheets/d/1jQ8LGrgSR2HyI_fq4aVBe3SwW6gZ8DeveB4uo0QY69Q/edit?gid=161013737#gid=161013737')
        worksheet = sheet.get_worksheet_by_id(161013737) 
        try:
            # Get all values (raw data) to avoid duplicate header issues
            all_values = worksheet.get_all_values()
            
            if len(all_values) < 2:
                print("Sheet is empty or has no data rows.", flush=True)
                return None
            
            # Use first row as headers, rest as data
            headers = all_values[0]
            data_rows = all_values[1:]
            
            print(f"Fetched {len(data_rows)} records from the sheet.", flush=True)
            
            # Create DataFrame with explicit headers
            dataframe = pd.DataFrame(data_rows, columns=headers)

        except Exception as e:
            print(f"Error fetching records: {str(e)}", flush=True)
            return None
        


        # Save CSV to backend/Data directory
        csv_path = os.path.join(os.path.dirname(__file__), 'Data', 'toursGrabbed.csv')
        dataframe.to_csv(csv_path, index=True)
        print(f"Saved tour data to: {csv_path}", flush=True)

        return {
            'sheet_id': gs_id,
            'data': dataframe.to_dict('records')  # Convert to serializable format
        }
    
    except Exception as e:
        print(f"Error fetching sheet data: {str(e)}", flush=True)
        return None
    
