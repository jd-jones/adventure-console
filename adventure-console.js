var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
const fs = require('fs');


// Global vars --- maybe these should be attributes in an object
var handleClientResponse;

var all_inputs;
var all_outputs;
var hints;
var state_machine;
var cur_state;


const logPort = (port) => console.log(`Listening on port ${port}`);


const logConnect = () => console.log("A user connected.");


const logDisconnect = () => console.log("A user disconnected.");


const logMessage = (message) => console.log('message: ' + message);


const makeMonitorStr = (command) => '<span class="input">' + '> ' + command + '</span>' + '<br/>';


const isEmpty = (str) => str === '';


const breakWrap = (str) => isEmpty(str) ? str : '<br/>' + str + '<br/>';


function serveHome (req, res) {
  let file_name = "console.html";
  let local_path = __dirname;
  let file_path = local_path + '/dist/' + file_name;
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
    Object.keys(state_machine[cur_state]),
    (idx_str) => all_inputs[idx_str]
  )

  let command_monitor = makeMonitorStr(input);
  output = breakWrap(output);
  hint = breakWrap(hint);
  let actions_str = breakWrap(makeActionsStr(possible_actions))
  let response = command_monitor + output + actions_str + hint
  io.emit('console_output', response);
}


function selectChapter (string) {
  let json_doc = JSON.parse(fs.readFileSync(base_dir + '/' + string + '.json'));
  all_inputs = json_doc.input;
  all_outputs = json_doc.output;
  hints = json_doc.hint;
  state_machine = json_doc.state_machine;
  cur_state = "0";
  handleClientResponse = sendResponse;
  socket.on('prompt_input', handleClientResponse);
  handleClientResponse('login');
}


function listDirs (string) {
  let dir_contents = fs.readdirSync(base_dir);
  const makeStr = (file_name) => '* ' + file_name.split('.')[0];
  let dir_str = _.map(dir_contents, makeStr).join('<br/>');
  let instructions = 'Choose a chapter:<br/>';
  let out_str = instructions + dir_str;
  handleClientResponse = selectChapter;
  io.emit('console_output', out_str);
}


function onConnect (socket) {
  logConnect();
  listDirs();
  socket.on('prompt_input', handleClientResponse);
  socket.on('disconnect', logDisconnect);
}


const base_dir = 'dist/chapters';
const port = 3000;
let logThisPort = _.partial(logPort, port);
handleClientResponse = listDirs;


app.use(express.static('dist'))

app.get('/', serveHome);

io.on('connection', onConnect);

http.listen(port, logThisPort);
