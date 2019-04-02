var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
const fetch = require('node-fetch');


var possible_actions = {'login': 1};
var results;


const returnJson = (response) => response.json();

const file_name = "demo.json";
const local_path = 'http://localhost:3000'
const chapters_url = local_path + '/chapters/' + file_name;
fetch(chapters_url)
    .then(returnJson)
    .then(function(json_obj){results = json_obj});


function serveHome (req, res) {
  let file_name = "console.html";
  let local_path = __dirname;
  let file_path = local_path + '/dist/' + file_name;
  res.sendFile(file_path);
}


const logPort = (port) => console.log(`Listening on port ${port}`);


const logConnect = () => console.log("A user connected.");


const logDisconnect = () => console.log("A user disconnected.");


const logMessage = (message) => console.log('message: ' + message);


const makeMonitorStr = (command) => '<span class="input">' + '> ' + command + '</span>' + '<br/>';


const isEmpty = (str) => str === '';


const breakWrap = (str) => isEmpty(str) ? str : '<br/>' + str + '<br/>';


function computeResult (results, possible_actions, command) {
  let result_key = possible_actions[command];
  return results[result_key];
}


function sendResponseBase (results, possible_actions, command) {
  let result;
  let hint;
  let result_key = possible_actions[command];
  [result, hint, possible_actions] = results[result_key];

  let command_monitor = makeMonitorStr(command);
  result = breakWrap(result);
  hint = breakWrap('(' + hint + ')');
  let response = command_monitor + result + hint;
  io.emit('console_output', response);
}


function onConnect (socket) {
  logConnect();
  sendResponse('login');
  socket.on('prompt_input', sendResponse);
  socket.on('disconnect', logDisconnect);
}

const sendResponse = _.partial(sendResponseBase, results, possible_actions);

const port = 3000;
let logThisPort = _.partial(logPort, port);

app.use(express.static('dist'))

app.get('/', serveHome);

io.on('connection', onConnect);

http.listen(port, logThisPort);
