var S2 = require('s2-geometry').S2;

let lat = 47.47264089476975;
let lng = 19.05938926889718;
let level = 24;

var key = S2.latLngToKey(lat, lng, level);

var id = S2.keyToId(key);
console.log(id);

var latlng = S2.idToLatLng(id);
console.log(latlng);