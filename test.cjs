const s2 = require('s2-geometry').S2;

function getCellIdFromLatLng(lat, lng, level = 15) {
    const cell = s2.CellId.fromLatLng(new s2.LatLng(lat, lng));
    return cell.parent(level).toString();
}

// Example coordinates (latitude, longitude)
const latitude = 37.7749;
const longitude = -122.4194;

// Get the S2 cell ID from the coordinates
const cellId = getCellIdFromLatLng(latitude, longitude);

console.log("S2 Cell ID:", cellId);