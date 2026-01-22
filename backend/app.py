
import os
from flask import Flask, request, jsonify, render_template, send_from_directory
import datetime
from dotenv import load_dotenv
import gspread
from getData import fetch_google_sheet_data

# in-project dependencies
from processInput import *  # accesses processInput.py
from getData import *  # accesses getData.py

load_dotenv()


# Get the base directory (project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

app = Flask(__name__, 
            template_folder=FRONTEND_DIR,
            static_folder=FRONTEND_DIR)


processed_requests = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)

# Check if API is running
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'data-processor-api',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

@app.route('/getAuth', methods=['GET'])
def get_auth():
    try:
        g_id = os.getenv("gs_id")  # gets google sheet id from .env file
        print(f"Providing Google Sheet ID: {g_id}", flush=True)

        
        return jsonify({
            'status': 'success',
            'sheet_id': g_id
        })
    
    except Exception as e:
        print(f"Error in get_auth: {str(e)}", flush=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/grabSheet', methods=['POST'])
def grab_sheet():
    try:
        data = fetch_google_sheet_data()
        
        if data is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to fetch sheet data'
            }), 500
        
        return jsonify({
            'status': 'success',
            'message': 'Sheet fetch completed',
            'data': data
        })
    except Exception as e:
        print(f"Error in grab_sheet: {str(e)}", flush=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/process', methods=['POST'])
def process_data():
    try:
        content = request.json
        client_input = content.get('input', '')

        # Placeholder processing logic
        processed_output = process_text(client_input)

        processed_requests.append({
            'input': client_input,
            'output': processed_output,
            'timestamp': datetime.datetime.utcnow().isoformat()
        })

        return jsonify({
            'status': 'success',
            'input': client_input,
            'output': processed_output
        })
    except Exception as e:
        print(f"Error in process_data: {str(e)}", flush=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500



if __name__ == '__main__':
    app.run()