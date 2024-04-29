'use strict';

//https://www.npmjs.com/package/s2-geometry?activeTab=readme
 
const S2 = require('s2-geometry').S2;
//We are using level 24 because it is approximately 0.5m in sidelength
const S2_LEVEL = 24;


class Block{

    constructor(url, type, id, author,timestamp){
        this.url = url,
        this.type = type,
        this.id = id,
        this.author = author,
        this.timestamp = timestamp
    }
}


class Cell {

    //Creates the initial values for our cell, the id of the s2 cell, the height (number of blocks on top of each other, and the types of blocks used)
    constructor(id) {
        this.s2cell_id = id,
        this.height = 0,
        this.content = {
            height_offset: 0,
            blocks: []
        };
    }

    get_height() {
        return this.height;
    }

    //Increases the height of the blocks by one
    increase_height() {
        this.height++;
    }

    //returns the id of the s2 cell
    get_id() {
        return this.s2cell_id;
    }

    add_Block(minecraft_block) {
        this.blocks[this.blocks.length] = minecraft_block;
    }
}

let cells = []

function get_Cell(id) {
    for(let i = 0; cells.length; i++){
        if(cells[i].get_height() === id){
            return cells[i];
        }
    }
    return undefined;
}


//This function takes in the latitude and longitude of the place where we are looking at and adds a block to our dateset
function New_Block(latitude, longitude){

    //Get the id of the S2 cell on level 24 (S2_LEVEL)
    var key = S2.latLngToKey(latitude, longitude, S2_LEVEL);
    var id = S2.keyToId(key); 

    //Find the cell with the id
    current_cell = get_Cell(id);

    //if we doesn't have content in that cell yet we create one
    if(current_cell === undefined){
        current_cell = new Cell(id);
    }

    current_cell.add_Block(chosen_block); //chosen_block will come from user interaction
    current_cell.increase_height()

}

//idea: find the neighbouring 200x200 cells, convert the coordinates into h3 cells and use the existing h3 content load functions
//var neighbors = S2.latLngToNeighborKeys(lat, lng, level); 4 connectivity

//Idea, overpass api-> get geojson -> Three to visualize




for(let i = 0; i < cells.length; i++){
    cells[i].height = i;
    console.log(cells[i].height);
}
 

//47.47264394407884, 19.05937265571359
let lat1 = 47.47264089476975;
let lng1 = 19.05938926889718;
let lat2 = 47.47262570711014;
let lng2 = 19.05940261618721;
let lat3 = 47.47261194465591;
let lng3 = 19.05942227834729
var level = 24;

//47.473362839452115, 19.059253538030404

 
var key1 = S2.latLngToKey(lat1, lng1, level);
var key2 = S2.latLngToKey(lat2, lng2, level);
var key3 = S2.latLngToKey(lat3, lng3, level);
 
var id1 = S2.keyToId(key1);
var id2 = S2.keyToId(key2);
var id3 = S2.keyToId(key3);

var latlng = S2.idToLatLng(id1);
console.log(latlng)