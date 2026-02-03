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

// Store all tours data globally for reference
let allTours = [];
let matchedTours = []; // Store tours matched from backend processing

function processClientMessage() {
  // Show loading message
  document.getElementById('output-text').value = "Processing your request...";
  
  // request data from google sheets NEEDS IMPLEMENTATION
  getTourInfo();
  // Get the value from the textarea
  var clientInput = document.getElementById('client-text-input').value;
  console.log("Sending client input to server");
  
  fetch("http://127.0.0.1:5000/process",{
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
    
    // Store matched tours globally for email generation
    matchedTours = matches.map(tour => ({
      code: tour.tour_code || 'N/A',
      name: tour.name || 'N/A',
      duration: tour.duration || 'N/A',
      overview: tour.overview || 'N/A',
      itinerary: tour.itinerary || 'N/A',
      locations: (tour.locations && tour.locations.length > 0) ? tour.locations.join(', ') : 'N/A'
    }));
    
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
    matchedTours = []; // Clear matched tours
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

  fetch("http://127.0.0.1:5000/grabSheet",{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({request: "getTourInfo"})
  })
  .then(response => {
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text(); // Get as text first to see what we're receiving
  })
  .then(text => {
    console.log("Raw response:", text);
    try {
      const data = JSON.parse(text);
      console.log("Tour Info Received:", data);
      // Process the received data and populate dropdown
      if (data && data.status === 'success' && data.data) {
        populateTourDropdown(data.data);
      } else if (data && data.status === 'error') {
        console.error('Server error:', data.message);
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.error('Response was:', text);
    }
  })
  .catch((error) => {
    console.error('Error fetching tour info:', error);
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
  // Use the stored matched tours directly
  const tours = matchedTours.length > 0 ? matchedTours : [];
  
  console.log('Using matched tours for PDF:', tours.length);
  console.log('Matched tours data:', matchedTours);
  
  if (tours.length === 0) {
    alert('No tours to display. Please generate tour recommendations first by processing a client message.');
    return;
  }
  
  // Generate HTML content based on email.html template
  const htmlContent = generateEmailHTML(tours);
  
  console.log('Generated HTML length:', htmlContent.length);
  
  // Create a new window with the formatted content
  var emailWindow = window.open('', '_blank');
  emailWindow.document.write(htmlContent);
  emailWindow.document.close();
  
  // Trigger print dialog after a short delay to ensure content is loaded
  setTimeout(() => {
    emailWindow.print();
  }, 500);
}

function generateEmailHTML(tours) {
  let tourCards = '';
  
  tours.forEach((tour, index) => {
    tourCards += `
    <div style="margin-bottom: 25px; border: 2px solid #61c3ab; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
      <div style="background: linear-gradient(135deg, #61c3ab 0%, #4fb39a 100%); padding: 15px 20px; color: white;">
        <h3 style="margin: 0; font-size: 20px;">
          <span style="background-color: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; margin-right: 10px; font-size: 14px;">${tour.code || 'N/A'}</span>
          ${tour.name || 'Tour Name'}
        </h3>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <span style="display: inline-block; width: 100px; color: #61c3ab; font-weight: bold;">⏱️ Duration:</span>
              <span>${tour.duration || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <span style="display: inline-block; width: 100px; color: #61c3ab; font-weight: bold;">📍 Locations:</span>
              <span>${tour.locations || 'N/A'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <div style="color: #61c3ab; font-weight: bold; margin-bottom: 8px;">📋 Overview:</div>
              <div style="color: #555; line-height: 1.8; white-space: pre-wrap;">${tour.overview || 'N/A'}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-top: 1px solid #f0f0f0;">
              <div style="color: #61c3ab; font-weight: bold; margin-bottom: 8px;">🗺️ Itinerary:</div>
              <div style="color: #555; line-height: 1.8; white-space: pre-wrap;">${tour.itinerary || 'N/A'}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
    `;
  });
  
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
            background-color: #f5f5f5;
          }
          .page-header {
            background: linear-gradient(135deg, #ec0c74 0%, #d10a65 100%);
            text-align: center;
            color: white;
            padding: 40px 20px;
          }
          .page-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .page-header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .page-footer {
            background-color: #2d2d2d;
            text-align: center;
            color: white;
            padding: 30px 20px;
            margin-top: 30px;
          }
          .page-footer h2 {
            margin: 0 0 10px 0;
            font-size: 22px;
          }
          .page-footer p {
            margin: 0;
            font-size: 13px;
            opacity: 0.8;
          }
          .content {
            padding: 30px 20px;
            max-width: 900px;
            margin: 0 auto;
          }
          .intro-box, .closing-box {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            margin-bottom: 25px;
          }
          .intro-box p, .closing-box p {
            color: #555;
            line-height: 1.8;
            font-size: 15px;
            margin: 0 0 15px 0;
          }
          .intro-box p:last-child, .closing-box p:last-child {
            margin-bottom: 0;
          }
          @media print {
            body {
              background-color: white;
            }
            .page-header, .page-footer {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <header class="page-header">
          <h1>Walk in Hong Kong</h1>
          <p>Tour Recommendations</p>
        </header>
        <main class="content">
          <div class="intro-box">
            <p><strong style="color: #ec0c74;">Dear Client,</strong></p>
            <p>Thank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.</p>
            <p>Based on the information you have provided, we found <strong style="color: #61c3ab;">${tours.length} matching tour${tours.length !== 1 ? 's' : ''}</strong> and recommend the following:</p>
          </div>
          
          ${tourCards}
          
          <div class="closing-box">
            <p>We hope that these recommendations are to your liking. Please let us know if you have any questions or would like to proceed with booking.</p>
            <p><strong>Best regards,</strong><br>
            <span style="color: #ec0c74; font-weight: 600;">Walk in Hong Kong Team</span></p>
          </div>
        </main>
        <footer class="page-footer">
          <h2>Walk in Hong Kong</h2>
          <p>Discover Hong Kong with us</p>
        </footer>
      </body>
    </html>
  `;
}

function copyAsEmailHTML() {
  // Use the stored matched tours directly
  const tours = matchedTours.length > 0 ? matchedTours : [];
  
  console.log('Using matched tours for email HTML:', tours.length);
  console.log('Matched tours data:', matchedTours);
  
  if (tours.length === 0) {
    alert('No tours to display. Please generate tour recommendations first by processing a client message.');
    return;
  }
  
  // Generate email-compatible HTML with inline styles
  const emailHTML = generateInlineEmailHTML(tours);
  
  // Copy to clipboard
  navigator.clipboard.writeText(emailHTML).then(() => {
    alert("Email HTML copied to clipboard!\n\nYou can now paste this directly into your email client (Gmail, Outlook, etc.).\n\nTip: Use Ctrl+V or Cmd+V to paste.");
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert("Failed to copy to clipboard. Please try again.");
  });
}

function generateInlineEmailHTML(tours) {
  let tourCards = '';
  
  tours.forEach((tour, index) => {
    tourCards += `
    <div style="margin-bottom: 25px; border: 2px solid #61c3ab; border-radius: 8px; overflow: hidden; max-width: 800px; margin-left: auto; margin-right: auto; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, #61c3ab 0%, #4fb39a 100%); padding: 15px 20px; color: white;">
        <h3 style="margin: 0; font-size: 20px; font-family: Verdana, Geneva, Tahoma, sans-serif;">
          <span style="background-color: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; margin-right: 10px; font-size: 14px;">${escapeHTML(tour.code || 'N/A')}</span>
          ${escapeHTML(tour.name || 'Tour Name')}
        </h3>
      </div>
      
      <div style="padding: 20px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="font-family: Verdana, Geneva, Tahoma, sans-serif;">
                <span style="display: inline-block; width: 100px; color: #61c3ab; font-weight: bold; vertical-align: top;">⏱️ Duration:</span>
                <span style="color: #333;">${escapeHTML(tour.duration || 'N/A')}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="font-family: Verdana, Geneva, Tahoma, sans-serif;">
                <span style="display: inline-block; width: 100px; color: #61c3ab; font-weight: bold; vertical-align: top;">📍 Locations:</span>
                <span style="color: #333;">${escapeHTML(tour.locations || 'N/A')}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <div style="font-family: Verdana, Geneva, Tahoma, sans-serif;">
                <div style="color: #61c3ab; font-weight: bold; margin-bottom: 8px;">📋 Overview:</div>
                <div style="color: #555; line-height: 1.8; white-space: pre-wrap;">${escapeHTML(tour.overview || 'N/A')}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-top: 1px solid #f0f0f0;">
              <div style="font-family: Verdana, Geneva, Tahoma, sans-serif;">
                <div style="color: #61c3ab; font-weight: bold; margin-bottom: 8px;">🗺️ Itinerary:</div>
                <div style="color: #555; line-height: 1.8; white-space: pre-wrap;">${escapeHTML(tour.itinerary || 'N/A')}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
    `;
  });
  
  // Return email-compatible HTML with all inline styles (no external CSS)
  return `
<div style="font-family: Verdana, Geneva, Tahoma, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #ec0c74 0%, #d10a65 100%); text-align: center; color: white; padding: 40px 20px;">
    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">Walk in Hong Kong</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Tour Recommendations</p>
  </div>
  
  <div style="padding: 30px 20px;">
    <div style="max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); margin-bottom: 25px;">
      <p style="color: #333; line-height: 1.8; font-size: 15px; margin: 0 0 15px 0;">
        <strong style="color: #ec0c74;">Dear Client,</strong>
      </p>
      <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0 0 15px 0;">
        Thank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.
      </p>
      <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0;">
        Based on the information you have provided, we found <strong style="color: #61c3ab;">${tours.length} matching tour${tours.length !== 1 ? 's' : ''}</strong> and recommend the following:
      </p>
    </div>
    
    ${tourCards}
    
    <div style="max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);">
      <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0 0 20px 0;">
        We hope that these recommendations are to your liking. Please let us know if you have any questions or would like to proceed with booking.
      </p>
      <p style="color: #333; line-height: 1.8; font-size: 15px; margin: 0;">
        <strong>Best regards,</strong><br>
        <span style="color: #ec0c74; font-weight: 600;">Walk in Hong Kong Team</span>
      </p>
    </div>
  </div>
  
  <div style="background-color: #2d2d2d; text-align: center; color: white; padding: 30px 20px;">
    <h2 style="margin: 0 0 10px 0; color: white; font-size: 22px;">Walk in Hong Kong</h2>
    <p style="margin: 0; font-size: 13px; opacity: 0.8;">Discover Hong Kong with us</p>
  </div>
</div>
  `;
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function populateTourDropdown(tours) {
  const dropdown = document.getElementById('tours-dropdown');
  if (!dropdown) {
    console.error('Tour dropdown not found!');
    return;
  }
  
  // Store tours globally for later reference
  allTours = tours;
  
  dropdown.innerHTML = ''; // Clear existing options
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a tour...';
  dropdown.appendChild(defaultOption);
  
  // Add tour options
  tours.forEach(tour => {
    const option = document.createElement('option');
    option.value = tour.tour_code;
    option.textContent = `${tour.tour_code} - ${tour.name_eng || tour.name}`;
    dropdown.appendChild(option);
  });
  
  console.log(`Populated dropdown with ${tours.length} tours`);
}

// Load tours when the page loads
window.addEventListener('DOMContentLoaded', function() {
  console.log('Page loaded, fetching tours...');
  getTourInfo();
  
  // Add event listeners for dropdowns
  const tourDropdown = document.getElementById('tours-dropdown');
  const tourTypeDropdown = document.getElementById('tour-type-dropdown');
  
  if (tourDropdown) {
    tourDropdown.addEventListener('change', updateGroupSizeDropdown);
  }
  
  if (tourTypeDropdown) {
    tourTypeDropdown.addEventListener('change', updateGroupSizeDropdown);
  }
});

function updateGroupSizeDropdown() {
  const tourCode = document.getElementById('tours-dropdown').value;
  const tourType = document.getElementById('tour-type-dropdown').value;
  const groupSizeDropdown = document.getElementById('group-size-dropdown');
  const priceDisplay = document.getElementById('price-display');
  
  console.log('updateGroupSizeDropdown called');
  console.log('Tour Code:', tourCode);
  console.log('Tour Type:', tourType);
  console.log('All Tours:', allTours);
  
  if (!tourCode || !tourType || tourType === 'None') {
    groupSizeDropdown.innerHTML = '<option value="">Select tour and type first</option>';
    priceDisplay.textContent = 'Price: ';
    return;
  }
  
  // Find the selected tour
  const selectedTour = allTours.find(tour => tour.tour_code === tourCode);
  console.log('Selected Tour:', selectedTour);
  
  if (!selectedTour) {
    console.error('Tour not found:', tourCode);
    groupSizeDropdown.innerHTML = '<option value="">Tour not found</option>';
    return;
  }
  
  // Validate tour type matches the tour's available types
  if (tourType === 'Educational') {
    // Check if tour has educational pricing or type_edu is "Educational"
    if (!selectedTour.edu_prices || Object.keys(selectedTour.edu_prices).length === 0) {
      groupSizeDropdown.innerHTML = '<option value="">This tour does not offer Educational pricing</option>';
      priceDisplay.textContent = 'Price: N/A';
      console.warn('Tour does not have educational prices');
      return;
    }
  } else if (tourType === 'Private') {
    // Check if tour has private/regular pricing
    if (!selectedTour.regular_prices || Object.keys(selectedTour.regular_prices).length === 0) {
      groupSizeDropdown.innerHTML = '<option value="">This tour does not offer Private pricing</option>';
      priceDisplay.textContent = 'Price: N/A';
      console.warn('Tour does not have private/regular prices');
      return;
    }
  }
  
  // Get the appropriate prices based on tour type
  const prices = tourType === 'Educational' ? selectedTour.edu_prices : selectedTour.regular_prices;
  console.log('Prices for', tourType, ':', prices);
  
  if (!prices || Object.keys(prices).length === 0) {
    groupSizeDropdown.innerHTML = '<option value="">No prices available for this type</option>';
    priceDisplay.textContent = 'Price: N/A';
    return;
  }
  
  // Populate group size dropdown with prices
  groupSizeDropdown.innerHTML = '<option value="">Select group size...</option>';
  
  // Sort by group size
  const sortedSizes = Object.keys(prices).sort((a, b) => parseInt(a) - parseInt(b));
  
  sortedSizes.forEach(size => {
    const option = document.createElement('option');
    option.value = size;
    option.dataset.price = prices[size];
    option.textContent = `${size} people - HK$${prices[size].toFixed(2)}`;
    groupSizeDropdown.appendChild(option);
  });
  
  // Add event listener to update price display
  groupSizeDropdown.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption.dataset.price) {
      priceDisplay.textContent = `Price: HK$${parseFloat(selectedOption.dataset.price).toFixed(2)}`;
    } else {
      priceDisplay.textContent = 'Price: ';
    }
  });
  
  // Reset price display
  priceDisplay.textContent = 'Price: ';
}

