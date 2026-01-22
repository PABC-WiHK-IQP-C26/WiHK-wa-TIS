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
    body: JSON.stringify({input: clientInput})}
  );
    

  console.log("Client Input:", clientInput);
  // send to server or process as needed
  console.log("processClientMessage called");
  setOutputText();
}

function setOutputText() {
  const tourName1 = "Victoria Peak Sunset Tour"; 
  const tourDate1 = "2026-01-25";
  const tourTime1 = "5:00 PM";
  const itinerary1 = "Peak tram ride, scenic views, dinner";
  const tourFee1 = "$85";
  const tourName2 = "Star Ferry Harbor Cruise";
  const tourDate2 = "2026-01-26";
  const tourTime2 = "7:00 PM";
  const itinerary2 = "Harbor cruise, light show, refreshments";
  const tourFee2 = "$45";
  const tourName3 = "Star Ferry Harbor Cruise";
  const tourDate3 = "2026-01-26";
  const tourTime3 = "7:00 PM";
  const itinerary3 = "Harbor cruise, light show, refreshments";
  const tourFee3 = "$45";
  
  const output = `Dear Client, \nThank you for reaching out to us. We are happy to offer you our services as Walk in Hong Kong.\nBased on what you have given us as information, we recommend these tours.\nTour 1: \nName: ${tourName1} \nDate: ${tourDate1} \nTime: ${tourTime1} \nItinerary: ${itinerary1} \nFee: ${tourFee1} \n\nTour 2: \nName: ${tourName2} \nDate: ${tourDate2} \nTime: ${tourTime2} \nItinerary: ${itinerary2} \nFee: ${tourFee2} \n\nWe hope that these recommendations are to your liking.`;
  document.getElementById('output-text').value = output;
  console.log(output);
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
