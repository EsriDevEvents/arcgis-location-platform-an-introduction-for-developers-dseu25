const view = document.querySelector("arcgis-map");
const Graphic = await $arcgis.import("@arcgis/core/Graphic.js");

// Form inputs
const accountForm = document.getElementById("create--account");
const switchAddress = document.getElementById("switch--address");
const inputAddress = document.getElementById("input--address");
const inputAddressSuggestions = document.getElementById(
  "input--address--suggestions"
);
const inputPostal = document.getElementById("input--postal");
const inputCity = document.getElementById("input--city");
const inputState = document.getElementById("input--state");
const labelAddress = document.getElementById("label--address");
const labelPostal = document.getElementById("label--postal");
const labelCity = document.getElementById("label--city");
const labelState = document.getElementById("label--state");
const alertUsAddress = document.getElementById("alert--us--address");

// Prevent form from submitting on enter
accountForm.addEventListener("submit", (e) => {
  e.preventDefault();
});

const container = document.getElementById("create--account");

// Control visibility and values of address input based on the address switch
switchAddress.addEventListener("calciteSwitchChange", (e) => {
  // List of each label for the inputs. The input is a child of the label, so
  // togling the disabed key on each disables the address inputs.
  const addressLabels = [labelAddress, labelPostal, labelCity, labelState];
  const checked = e.target.checked;
  
  if (checked) {
    container.classList.remove("map-disabled");
    container.classList.add("map-enabled");
  } else {
    container.classList.remove("map-enabled");
    container.classList.add("map-disabled");
  }
  
  addressLabels.forEach((addressLabel) => {
    // Set the disabled attribute based on the switch for address input
    if (e.target.checked) addressLabel.removeAttribute("disabled");
    else addressLabel.setAttribute("disabled", "");
  });
  inputAddressSuggestions.innerHTML = "";
});

// Use the REST JS to suggest and geocode the user input

// Authenticate
const restJSKey = arcgisRest.ApiKeyManager.fromKey(ARCGIS_APIKEY);

// Get a suggested address based on the user input. Update on each keystroke
inputAddress.addEventListener("calciteInputTextInput", (e) =>
  showSuggestions(e.target.value)
);

// Callback for the address input field
const showSuggestions = (userInput) => {
  if (userInput) {
    // If the input for addresses is populated, provide a list of up to 5 suggestions
    arcgisRest
    .suggest(userInput, {
      authentication: restJSKey,
      params: { maxSuggestions: 5 },
    })
    .then((response) => {
      // Create a calcite-list-item for each suggested address
      const suggested = response.suggestions
      .map(
        (suggestion) =>
          `<calcite-list-item label="${suggestion.text}" value=${suggestion.magicKey} ></calcite-list-item>`
      )
      .join("");
      // Put the joined array of calcite-list-items into the calcite-list
      inputAddressSuggestions.innerHTML = suggested;
    });
  } else {
    // If the input for address is not populated, empty the suggestion list
    inputAddressSuggestions.innerHTML = "";
  }
};

// Geocode when either:
//   1. User hits enter on the address - use user input string
//   2. User clicks on a suggestion - use suggestion magic key
//   3. User hits enter on a suggestion - use suggestion magic key

// Geocode with user input for enter on search bar
inputAddress.addEventListener("keyup", (e) => {
  // On enter key, geocode the input
  if (e.key === "Enter") {
    geocodeAddress({ address: e.target.value });
  }
});

// Geocode with magic key for suggested address
inputAddressSuggestions.addEventListener("click", (e) => {
  geocodeAddress({ magicKey: e.target.value });
});
inputAddressSuggestions.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    geocodeAddress({ magicKey: e.target.value });
  }
});

// Geocode the input.
const geocodeAddress = (input) => {
  input["authentication"] = restJSKey;
  input["params"] = {
    maxLocations: 1,
    outFields: ["City", "Postal", "Region", "StAddr", "Country"],
  };
  
  // Using the response, update the form
  arcgisRest.geocode(input).then((response) => {
    const matchLocation = response.candidates[0];
    
    // If the country code is USA , update the form
    inputPostal.value = matchLocation.attributes.Postal;
    inputCity.value = matchLocation.attributes.City;
    inputState.value = matchLocation.attributes.Region;
    inputAddress.value = matchLocation.attributes.StAddr;;
    
    // Create a graphic and add the geometry and symbol to it
    const { x, y } = matchLocation.location
    const graphic = createGraphic(x, y)
    const pointGraphic = new Graphic(graphic);
    
    view.center = [matchLocation.location.x, matchLocation.location.y];
    view.graphics.removeAll();
    view.graphics.addMany([pointGraphic]);
  });
  inputAddressSuggestions.innerHTML = "";
};
