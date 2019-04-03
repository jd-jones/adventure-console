var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
const fs = require('fs');


var possible_actions;


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
  let keys = Object.keys(actions);
  let key_strs = _.map(keys, makeStr)
  return key_strs.join('<br/>');
}


function sendResponseBase (results, command) {
  let result_key = possible_actions[command];
  let result_value = results[result_key];

  let result = result_value.result;
  let hint = result_value.hint;
  possible_actions = result_value.actions;

  let command_monitor = makeMonitorStr(command);
  result = breakWrap(result);
  hint = breakWrap(hint);
  let actions_str = breakWrap(makeActionsStr(possible_actions))
  let response = command_monitor + result + actions_str + hint
  io.emit('console_output', response);
}


function onConnect (socket) {
  logConnect();
  sendResponse('login');
  socket.on('prompt_input', sendResponse);
  socket.on('disconnect', logDisconnect);
}


possible_actions = {'login': '1'};

const results = JSON.parse(fs.readFileSync('dist/chapters/demo.json'));

const sendResponse = _.partial(sendResponseBase, results);

const port = 3000;
let logThisPort = _.partial(logPort, port);

app.use(express.static('dist'))

app.get('/', serveHome);

io.on('connection', onConnect);

http.listen(port, logThisPort);
