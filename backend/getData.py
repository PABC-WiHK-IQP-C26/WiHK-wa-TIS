import os
import nltk
import gspread
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from google.oauth2.service_account import Credentials
from decimal import Decimal
import re
from collections import defaultdict

load_dotenv()

# Initialize gspread client (will be set up when function is called)
user = None


class fetchTour:
    def __init__(self):
        self.data = fetchTour.getTourData()
        print(f"Fetched {len(self.data)} tours from Google Sheets.", flush=True)

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
            client = fetchTour.get_gspread_client()
            # Get authenticated client
            

            data = client.open_by_url('https://docs.google.com/spreadsheets/d/1jQ8LGrgSR2HyI_fq4aVBe3SwW6gZ8DeveB4uo0QY69Q/edit?gid=161013737#gid=161013737')
            
            worksheet = data.get_worksheet_by_id(161013737) #pricing master

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
                dataframe = pd.DataFrame(data_rows, columns=headers)
                
            except Exception as e:
                print(f"Error fetching records: {str(e)}", flush=True)
                return None
            
            # Save CSV to backend/Data directory
            
            csv_path = os.path.join(os.path.dirname(__file__), 'Data', 'toursgrabbed.csv')
            dataframe.to_csv(csv_path, index=True)



            print(f"Saved tour data to: {csv_path}", flush=True)

            return {
                'sheet_id': gs_id,
                'data': dataframe.to_dict('records'),  # Convert to serializable format
            }
        
        except Exception as e:
            print(f"Error fetching sheet data: {str(e)}", flush=True)
            return None
        
    """
    Data that is needed:

    Tour name (Column B (Canto), Column C (Eng)), Tour description (Column T (Canto), Column U (Eng)), Tour price, Tour duration (Column P (Canto), Column Q (Eng)), Tour itinerary (Column X (Canto), Column Y (Eng))

    Date is chosen by staff later based on the availability of the client.
    """

    def _parse_tour_record(record):
        """Parse a single tour record from Google Sheets with proper type conversions."""
        def safe_str(value):
            """Convert to string and strip whitespace, return None if empty."""
            return (str(value).strip() if value else None)
        
        def safe_decimal(value):
            """Convert to Decimal for price, return None if invalid."""
            if not value:
                return None
            try:
                return Decimal(str(value))
            except Exception as e:
                print(f"Warning: Could not parse price '{value}' as Decimal: {str(e)}", flush=True)
                return None
        
        def safe_int(value):
            """Convert to int for duration, return None if invalid."""
            if not value:
                return None
            try:
                return int(float(str(value)))
            except Exception as e:
                print(f"Warning: Could not parse duration '{value}' as int: {str(e)}", flush=True)
                return None
        
        tour = {
            'tour_code': safe_str(record.get("Tour Code")),
            'name_canto': safe_str(record.get("主題式導賞團")),
            'name_eng': safe_str(record.get("Thematic Tour")),
            'ov_canto': safe_str(record.get("簡介")),
            'ov_eng': safe_str(record.get("Overview")),
            'dur_canto': safe_str(record.get("時長")),
            'dur_eng': safe_str(record.get("Duration")),
            #'price': safe_decimal(record.get("")),  
            'itn_canto': safe_str(record.get("實體行程")),
            'itn_eng': safe_str(record.get("In-person Itinerary")), # needs to be split into individual locations -- split by regex -
            'type_private': safe_str(record.get("Tour Cat")), #Regular or Special
            'type_edu': safe_str(record.get("Tour Type")), #Types for Educational 
        }

        itinerary = tour['itn_eng']
        
        # Ensure itinerary is a string before processing
        if itinerary and isinstance(itinerary, str):
            location = re.split(r'-|>', itinerary)
            tour['locations'] = [loc.strip() for loc in location if loc.strip()]  # Store cleaned locations in tour dict
        else:
            tour['locations'] = []
        
        return tour

    def getTourData():
        data = fetchTour.fetch_google_sheet_data()
        if data is None:
            print("No data fetched from Google Sheets.", flush=True)
            return []
        
        records = data['data']
        
        # DEBUG: Print available keys from first record
        if records:
            print(f"DEBUG - Available keys in record: {list(records[0].keys())}", flush=True)
        
        tour_list = []
        all_locations = []  # Collect all locations from all tours
        
        for record in records:
            tour = fetchTour._parse_tour_record(record)
            
            print(f"Tour: {tour['name_eng']}", flush=True)
            print(f"Overview: {tour['ov_eng']}", flush=True)
            print(f"Duration: {tour['dur_eng']}", flush=True)
            print(f"Itinerary: {tour['itn_eng']}", flush=True)
            print(f"Type (Private): {tour['type_private']}", flush=True)
            
            # Add tour locations to the master list
            for i, loc in enumerate(tour['locations']):
                print(f"Location {i+1}: {loc}", flush=True)
                all_locations.append({
                    'tour_code': tour['tour_code'],
                    'tour_name': tour['name_eng'],
                    'location': loc
                })
            print("-----\n", flush=True)
            
            tour_list.append(tour)
        
        # Save all locations to CSV after processing all tours
        if all_locations:
            locations_df = pd.DataFrame(all_locations)
            locCSVPath = os.path.join(os.path.dirname(__file__), 'Data', 'locations.csv')
            locations_df.to_csv(locCSVPath, index=True)
            print(f"Saved {len(all_locations)} locations from {len(tour_list)} tours to: {locCSVPath}", flush=True)
        
        print(f"Extracted {len(tour_list)} tours from the data.", flush=True)

        return tour_list



class tourIndexer:
    def __init__(self):
        self.tours = fetchTour.getTourData()
        print(f"Tour indexer initialized with {len(self.tours)} tours.", flush=True)

        """
        Indexing by:
        - Tour Location
        - Tour Duration (Most tours fall into 2hrs)
        - Tour Type (Regular v. Special)
        
        """

        self.by_location = defaultdict(list)
        self.by_duration = defaultdict(list)
        self.by_type = defaultdict(list)

        def by_location(self, tour, tour_code):
            locations = tour['location']
            for loc in locations:
                if loc:
                    self.indexes['location'][loc.strip().lower()].append(tour_code)

                    #if loc in ['']
            



    
   