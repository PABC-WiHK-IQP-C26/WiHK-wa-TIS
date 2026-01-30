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
