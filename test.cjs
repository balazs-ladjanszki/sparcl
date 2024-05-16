lat = 47;
lon = 19;

const url = 'https://esoptron.hu:8036/getPoints?lat=' + lat + '&lon=' + lon + '&lvl=24'

console.log(url)

fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("API response:", data);
    })
    .catch(error => {
      console.error("Error:", error);
    });