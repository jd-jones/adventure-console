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


const isJsonFilename = (str) => path.extname(str) === 'json';


function constructGameContext (assets_directory) {
  const dir_contents = fs.readdirSync(assets_directory);
  const json_fns = _.filter(dir_contents, isJsonFilename);

  const jsonBasename = _.partialRight(path.basename, '.json');
  const obj_keys = _.map(jsonBasename, json_fns);

  const readAndParseJson = _.flow([fs.readFileSync, JSON.parse]);
  const obj_values = _.map(readAndParseJson, json_fns);

  const key_value_pairs = _.zip([obj_keys, obj_values]);
  const object = Object.fromEntries(key_value_pairs);
  return object;
}

class Location {
  constructor(name, rooms) {
    this.name = name;
    this.rooms = rooms;
  }
}

class Room {
  constructor(name, game_context) {

    this.name = name;

    this.items = undefined;
    this.occupants = undefined;
    this.doors = undefined;
    
    this.loadState(game_context);
  }

  loadState(game_context) {
    const state = game_context['players'][this.name];
    
    const contextualItem = _.partialRight(Item, game_context);
    this.items = _.map(contextualItem, state.items);

    // FIXME
    this.occupants = undefined;
    this.doors = undefined;
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


function initFromFile(json_file) {
  let json_doc = JSON.parse(fs.readFileSync(json_file));
  for(let property in json_doc) {
    this[property] = json_doc[property];
  }
}


class Item {
  constructor(name, game_context) {
    this.name = name;

    this.loadState(game_context);
  }

  loadState(game_context) {
    const state = game_context['items'][this.name];
    for(let property in state) {
      this[property] = state[property];
    }
  }

  useOn(user) {
    throw "useOn is not defined!"
  }
}


class Agent {
  constructor(name, current_room, game_context) {

    this.name = name;
    this.current_room = current_room;

    // These parameters are loaded from context 
    this.level = undefined;
    this.stats = undefined;
    this.equipment = undefined;
    this.inventory = undefined;

    this.loadState(game_context);
  }

  loadState(game_context) {
    const state = game_context['players'][this.name];
    
    this.level = state.level;
    this.stats = state.stats;

    const contextualItem = _.partialRight(Item, game_context);
    this.inventory = _.map(contextualItem, state.inventory);

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
const assets_dir = path.join('dist', 'assets');
const game_context = constructGameContext(assets_dir);


app.use(express.static('dist'))
app.get('/', serveHome);
io.on('connection', onConnect);
http.listen(port, _.partial(logPort, port));
