let express = require('express');
let app = express();
let http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('lodash');
const fs = require('fs');
const path = require('path');


// Global vars --- maybe these should be attributes in an object
let all_inputs;
let all_outputs;
let hints;
let state_machine;
let cur_state;
let connected_sockets = [];

// Global constants
const base_dir = 'dist/chapters';
const port = 3000;


// Function definitions
const logPort = (port) => console.log(`Listening on port ${port}`);

const logConnect = () => console.log("A user connected.");

const logDisconnect = () => console.log("A user disconnected.");

const makeMonitorStr = (command) => '<span class="input">' + '> ' + command + '</span>' + '<br/>';

const isEmpty = (str) => str === '';

const breakWrap = (str) => isEmpty(str) ? str : '<br/>' + str + '<br/>';

const setHandler = (message, handler, socket) => {
  socket.removeAllListeners(message);
  socket.on(message, handler);
}


function encounter(players, enemies) {
  while (!_.isEmpty(players) || !_.isEmpty(enemies)) {
    // TODO: sort agents by speed to determine turn order
    let agents = players.concat(enemies);
    for (let agent of agents) {
      agent.takeTurn();
    }
  }
}


function hasEnemies(occupants) {
  // TODO
  return false
}


class World {
  constructor(name, rooms) {
    this.name = name;
    this.rooms = rooms;
  }
}

// TODO: Load a Room from file
class Room {
  constructor(name, items, occupants, doors) {
    this.name = name;
    // Treasure, important objects and stuff
    this.items = items;
    // Occupants can be players, enemies, or NPCs
    this.occupants = occupants;
    // Door maps a direction to a Room (or room_name.json?)
    this.doors = doors;
  }

  enter(agent) {
    // display items
    // display occupants
    this.occupants.push(agent);
    if(hasEnemies(this.occupants)) {
      encounter(this.occupants);
    }
  }

  go(direction) {
    let new_room = this.doors[direction];
    if(new_room === undefined) {
      let err_mesg = '';
      console.log(err_mesg);
      new_room = this
    }
    return new_room
  }

  get(item_name) {
    return this.items[item_name];
  }
}


class Agent {
  constructor(name, current_room) {
    this.name = name;

    this.current_room = current_room;

    // For now, everything has 10 HP, 5 ATK, 3 DEF
    this.health = 10;
    this.attack = 5;
    this.defence = 3;

    this.inventory = [];
    this.equipment = undefined;
  }

  go(direction) {
    let new_room = this.current_room.go(direction);
    this.current_room = new_room;
  }

  take(item_name) {
    let item = this.current_room.get(item_name)
    this.inventory.push(item);
  }

  attack(agent) {
    agent.takeHit(this.attack);
  }

  takeHit(attack) {
    let corrected_attack = Math.min(attack - this.defence, 0);
    self.health -= corrected_attack;
  }

  takeTurn() {
    return undefined
  }
}


class Enemy extends Agent {
  takeTurn() {
    // TODO: prompt AI for input
    return undefined
  }
}


class Player extends Agent {
  takeTurn() {
    // TODO: Prompt user for input
    // write to console output
    // wait for console input
    return undefined
  }
}


const setInputHandler = _.partial(setHandler, 'prompt_input');

const setInputHandlerForAllSockets = (handler) => {
  const setThisHandler = _.partial(setInputHandler, handler);
  connected_sockets.forEach(setThisHandler);
}

function serveHome (req, res) {
  let file_name = "console.html";
  let local_path = __dirname;
  let file_path = path.join(local_path, 'dist', file_name);
  res.sendFile(file_path);
}

function makeActionsStr(actions) {
  const makeStr = (action_name) => '> ' + action_name;
  let act_strs = _.map(actions, makeStr)
  return act_strs.join('<br/>');
}

function sendResponse (input) {
  let input_idx_as_str = String(all_inputs.indexOf(input));
  let value = state_machine[cur_state][input_idx_as_str];
  if (value === undefined)
    value = state_machine[cur_state]["undefined"];

  let output = all_outputs[value.output];
  cur_state = value.next_state;
  let hint = hints[value.hint];

  let possible_actions = _.map(
    _.filter(Object.keys(state_machine[cur_state]), (x) => x !== "undefined"),
    (idx_str) => all_inputs[idx_str]
  );

  let command_monitor = makeMonitorStr(input);
  output = breakWrap(output);
  hint = breakWrap(hint);
  let actions_str = breakWrap(makeActionsStr(possible_actions))
  let response = command_monitor + output + actions_str + hint
  io.emit('console_output', response);
}


function selectChapter (string) {
  const json_path = path.join(base_dir, string + '.json');
  let json_doc = JSON.parse(fs.readFileSync(json_path));
  all_inputs = json_doc.input;
  all_outputs = json_doc.output;
  hints = json_doc.hint;
  state_machine = json_doc.state_machine;
  cur_state = "0";

  setInputHandlerForAllSockets(sendResponse);
  sendResponse('login');
}

function listDirs () {
  let dir_contents = fs.readdirSync(base_dir);

  const makeStr = (file_name) => '* ' + file_name.split('.')[0];
  let dir_str = _.map(dir_contents, makeStr).join('<br/>');
  let instructions = 'Choose a chapter:<br/>';
  let out_str = instructions + dir_str;

  setInputHandlerForAllSockets(selectChapter);
  io.emit('console_output', out_str);
}

function onConnect (socket) {
  logConnect();
  connected_sockets.push(socket);
  listDirs();
  socket.on('disconnect', logDisconnect);
}


// Main script
app.use(express.static('dist'))
app.get('/', serveHome);
io.on('connection', onConnect);
http.listen(port, _.partial(logPort, port));
