//app.js -- main front end javascript file

function handleKeyDown(event) {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    const textarea = document.getElementById('client-text-input');
    const start = textarea.selectionStart;
    textarea.value = textarea.value.substring(0, start) + '\n' + textarea.value.substring(start);
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  }
}

function processClientMessage() {
  // Show loading message
  document.getElementById('output-text').value = "Processing your request...";
  
  // request data from google sheets NEEDS IMPLEMENTATION
  getTourInfo();
  // Get the value from the textarea
  var clientInput = document.getElementById('client-text-input').value;
  console.log("Sending client input to server");
  
  fetch("/process",{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({input: clientInput})
  })
  .then(response => {
    console.log("Response status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("Processing response received:", data);
    setOutputText(data);
  })
  .catch((error) => {
    console.error('Error processing request:', error);
    document.getElementById('output-text').value = `Error: ${error.message}\n\nPlease check the console for more details.`;
  });

  console.log("Client Input:", clientInput);
  console.log("processClientMessage called");
}

function setOutputText(data) {
  console.log("setOutputText called with data:", data);
  
  let output = `Dear Client,\n\nThank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.\n\nBased on what you have given us as information, we recommend these tours:\n\n`;
  
  if (data && data.output && data.output.all_matches && data.output.all_matches.length > 0) {
    // Use the actual matched tours from backend
    const matches = data.output.all_matches.slice(0, 4); // Get up to 4 tours
    console.log("Found matches:", matches.length);
    
    matches.forEach((tour, index) => {
      output += `========================================\n`;
      output += `TOUR ${index + 1}\n`;
      output += `========================================\n`;
      output += `Tour Code: ${tour.tour_code || 'N/A'}\n`;
      output += `Name: ${tour.name || 'N/A'}\n\n`;
      output += `Duration: ${tour.duration || 'N/A'}\n\n`;
      output += `Overview:\n${tour.overview || 'N/A'}\n\n`;
      output += `Itinerary:\n${tour.itinerary || 'N/A'}\n\n`;
      output += `Locations Covered: ${(tour.locations && tour.locations.length > 0) ? tour.locations.join(', ') : 'N/A'}\n\n`;
    });
    
    output += `========================================\n\n`;
  } else {
    console.log("No matches found in data");
    output += `No matching tours found at this time. Please provide more details about your preferences.\n\n`;
  }
  
  output += `We hope that these recommendations are to your liking. Please let us know if you have any questions or would like to proceed with booking.`;
  
  console.log("Setting output text to textarea");
  const outputTextarea = document.getElementById('output-text');
  if (outputTextarea) {
    outputTextarea.value = output;
    console.log("Output text set successfully");
  } else {
    console.error("output-text textarea not found!");
  }
}

// function to get tour info from google sheets -- tied to getData.py
function getTourInfo() {
  console.log("getTourInfo called");

  fetch("/grabSheet",{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({request: "getTourInfo"})
  })
  .then(response => response.json())
  .then(data => {
    console.log("Tour Info Received:", data);
    // Process the received data as needed
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

function copyOutputText() {

  var outputTextarea = document.getElementById('output-text');
  outputTextarea.select();
  outputTextarea.setSelectionRange(0, 99999); // For mobile devices 
  navigator.clipboard.writeText(outputTextarea.value);
  alert("Copied the text: " + outputTextarea.value);


}

function formatAsEmail() {
  // Get the output data from the textarea
  var outputText = document.getElementById('output-text').value;
  
  // Parse the tour data to extract structured information
  const tours = parseTourData(outputText);
  
  // Generate HTML content based on email.html template
  const htmlContent = generateEmailHTML(tours, outputText);
  
  // Create a new window with the formatted content
  var emailWindow = window.open('', '_blank');
  emailWindow.document.write(htmlContent);
  emailWindow.document.close();
  
  // Trigger print dialog after a short delay to ensure content is loaded
  setTimeout(() => {
    emailWindow.print();
  }, 500);
}

function parseTourData(outputText) {
  const tours = [];
  const tourSections = outputText.split('========================================');
  
  tourSections.forEach(section => {
    if (section.includes('TOUR')) {
      const tour = {};
      
      // Extract tour code
      const codeMatch = section.match(/Tour Code:\s*(.+?)\n/);
      if (codeMatch) tour.code = codeMatch[1].trim();
      
      // Extract name
      const nameMatch = section.match(/Name:\s*(.+?)\n/);
      if (nameMatch) tour.name = nameMatch[1].trim();
      
      // Extract duration
      const durationMatch = section.match(/Duration:\s*(.+?)\n/);
      if (durationMatch) tour.duration = durationMatch[1].trim();
      
      // Extract overview
      const overviewMatch = section.match(/Overview:\n([\s\S]*?)(?=\n\nItinerary:|\n\nLocations Covered:|$)/);
      if (overviewMatch) tour.overview = overviewMatch[1].trim();
      
      // Extract itinerary
      const itineraryMatch = section.match(/Itinerary:\n([\s\S]*?)(?=\n\nLocations Covered:|$)/);
      if (itineraryMatch) tour.itinerary = itineraryMatch[1].trim();
      
      // Extract locations
      const locationsMatch = section.match(/Locations Covered:\s*(.+?)(?=\n|$)/);
      if (locationsMatch) tour.locations = locationsMatch[1].trim();
      
      if (tour.code || tour.name) {
        tours.push(tour);
      }
    }
  });
  
  return tours;
}

function generateEmailHTML(tours, outputText) {
  let tourRows = '';
  
  tours.forEach((tour, index) => {
    tourRows += `
      <tr>
        <td colspan="4" style="background-color: #f0f0f0; padding: 15px; font-weight: bold; color: #ec0c74; border-top: 2px solid #61c3ab;">
          TOUR ${index + 1}
        </td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; width: 20%; vertical-align: top;">Tour Code:</td>
        <td colspan="3" style="padding: 10px;">${tour.code || 'N/A'}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top;">Name:</td>
        <td colspan="3" style="padding: 10px;">${tour.name || 'N/A'}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top;">Duration:</td>
        <td colspan="3" style="padding: 10px;">${tour.duration || 'N/A'}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top;">Overview:</td>
        <td colspan="3" style="padding: 10px; white-space: pre-wrap;">${tour.overview || 'N/A'}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top;">Itinerary:</td>
        <td colspan="3" style="padding: 10px; white-space: pre-wrap;">${tour.itinerary || 'N/A'}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top;">Locations:</td>
        <td colspan="3" style="padding: 10px;">${tour.locations || 'N/A'}</td>
      </tr>
    `;
  });
  
  // Add the raw output text section
  const rawTextSection = outputText ? `
    <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #61c3ab;">
      <h3 style="color: #ec0c74; margin-top: 0;">Complete Message Text:</h3>
      <pre style="white-space: pre-wrap; font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px; line-height: 1.6; color: #333;">${outputText}</pre>
    </div>
  ` : '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Walk in Hong Kong - Tour Recommendations</title>
        <style>
          body {
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            margin: 0;
            padding: 0;
          }
          .page-header {
            background-color: #ec0c74;
            text-align: center;
            color: white;
            padding: 50px;
            font-size: 20px;
          }
          .page-footer {
            background-color: #ec0c74;
            text-align: center;
            color: white;
            padding: 50px;
            font-size: 20px;
            margin-top: 30px;
          }
          .content {
            padding: 30px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: auto;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .data-table thead {
            background-color: #61c3ab;
          }
          .data-table thead th {
            color: white;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            font-size: 20px;
          }
          .data-table tbody td {
            padding: 10px;
          }
          .intro-text {
            padding: 20px;
            background-color: #fafafa;
            line-height: 1.6;
          }
          @media print {
            .page-header, .page-footer {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <header class="page-header">
          <h2>Walk in Hong Kong - Tour Recommendations</h2>
        </header>
        <main class="content">
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4">Tour Recommendations</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="intro-text">
                  <strong>Dear Client,</strong><br><br>
                  Thank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.<br><br>
                  Based on what you have given us as information, we found ${tours.length} matching tour${tours.length !== 1 ? 's' : ''} and recommend the following:
                </td>
              </tr>
              ${tourRows}
              <tr>
                <td colspan="4" class="intro-text">
                  We hope that these recommendations are to your liking. Please let us know if you have any questions or would like to proceed with booking.<br><br>
                  <strong>Best regards,<br>
                  Walk in Hong Kong Team</strong>
                </td>
              </tr>
            </tbody>
          </table>
          ${rawTextSection}
        </main>
        <footer class="page-footer">
          <h2>Walk in Hong Kong</h2>
        </footer>
      </body>
    </html>
  `;
}

function copyAsEmailHTML() {
  // Get the output data from the textarea
  var outputText = document.getElementById('output-text').value;
  
  // Parse the tour data to extract structured information
  const tours = parseTourData(outputText);
  
  // Generate email-compatible HTML with inline styles
  const emailHTML = generateInlineEmailHTML(tours, outputText);
  
  // Copy to clipboard
  navigator.clipboard.writeText(emailHTML).then(() => {
    alert("Email HTML copied to clipboard!\n\nYou can now paste this directly into your email client (Gmail, Outlook, etc.).\n\nTip: Use Ctrl+V or Cmd+V to paste.");
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert("Failed to copy to clipboard. Please try again.");
  });
}

function generateInlineEmailHTML(tours, outputText) {
  let tourRows = '';
  
  tours.forEach((tour, index) => {
    tourRows += `
      <tr>
        <td colspan="4" style="background-color: #f0f0f0; padding: 15px; font-weight: bold; color: #ec0c74; border-top: 2px solid #61c3ab; font-family: Verdana, Geneva, Tahoma, sans-serif;">
          TOUR ${index + 1}
        </td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; width: 20%; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Tour Code:</td>
        <td colspan="3" style="padding: 10px; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.code || 'N/A')}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Name:</td>
        <td colspan="3" style="padding: 10px; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.name || 'N/A')}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Duration:</td>
        <td colspan="3" style="padding: 10px; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.duration || 'N/A')}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Overview:</td>
        <td colspan="3" style="padding: 10px; white-space: pre-wrap; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.overview || 'N/A')}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Itinerary:</td>
        <td colspan="3" style="padding: 10px; white-space: pre-wrap; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.itinerary || 'N/A')}</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #61c3ab; padding: 10px; vertical-align: top; font-family: Verdana, Geneva, Tahoma, sans-serif;">Locations:</td>
        <td colspan="3" style="padding: 10px; font-family: Verdana, Geneva, Tahoma, sans-serif;">${escapeHTML(tour.locations || 'N/A')}</td>
      </tr>
    `;
  });
  
  // Return email-compatible HTML with all inline styles (no external CSS)
  return `
<div style="font-family: Verdana, Geneva, Tahoma, sans-serif; margin: 0; padding: 0;">
  <div style="background-color: #ec0c74; text-align: center; color: white; padding: 30px 20px; font-size: 18px;">
    <h2 style="margin: 0; color: white; font-size: 24px;">Walk in Hong Kong - Tour Recommendations</h2>
  </div>
  
  <div style="padding: 20px;">
    <table style="width: 100%; border-collapse: collapse; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th colspan="4" style="background-color: #61c3ab; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 18px; font-family: Verdana, Geneva, Tahoma, sans-serif;">
            Tour Recommendations
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="4" style="padding: 20px; background-color: #fafafa; line-height: 1.6; font-family: Verdana, Geneva, Tahoma, sans-serif;">
            <strong>Dear Client,</strong><br><br>
            Thank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.<br><br>
            Based on what you have given us as information, we found ${tours.length} matching tour${tours.length !== 1 ? 's' : ''} and recommend the following:
          </td>
        </tr>
        ${tourRows}
        <tr>
          <td colspan="4" style="padding: 20px; background-color: #fafafa; line-height: 1.6; font-family: Verdana, Geneva, Tahoma, sans-serif;">
            We hope that these recommendations are to your liking. Please let us know if you have any questions or would like to proceed with booking.<br><br>
            <strong>Best regards,<br>
            Walk in Hong Kong Team</strong>
          </td>
        </tr>
      </tbody>
    </table>
    
    ${outputText ? `
    <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #61c3ab; max-width: 800px; margin-left: auto; margin-right: auto;">
      <h3 style="color: #ec0c74; margin-top: 0; font-family: Verdana, Geneva, Tahoma, sans-serif;">Complete Message Text:</h3>
      <pre style="white-space: pre-wrap; font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px; line-height: 1.6; color: #333; margin: 0;">${escapeHTML(outputText)}</pre>
    </div>
    ` : ''}
  </div>
  
  <div style="background-color: #ec0c74; text-align: center; color: white; padding: 30px 20px; font-size: 18px; margin-top: 20px;">
    <h2 style="margin: 0; color: white; font-size: 22px;">Walk in Hong Kong</h2>
  </div>
</div>
  `;
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
