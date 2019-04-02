var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');


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


function computeResult (command) {
  let result;
  let hint;
  if(command === 'walk toward mountains') {
    result = 'A <span class="enemy">dragon</span> appears out of nowhere and '
      + '<span class="action">incinerates</span> you. You die instantly.';
    hint = "(That's it for this game! You can start over using "
      + '<span class="action">reload</span>)';
  } else if(command === 'login' || command === 'reload') {
    result = 'You get up and survey your surroundings. '
      + 'A stern and unfamiliar landscape greets you. '
      + 'The wind whistles quietly as a pair of grey, barren '
      + '<span class="location">mountains</span> looms in the distance.<br/><br/>'
      + 'Your head hurts.';
    hint = '(Enter a command in the prompt and press '
      + '<span class="action">[RETURN]</span> to send it)';
  } else {
    result = 'Nothing happens.';
    hint = '(Try <span class="action">walking</span> toward the '
      + '<span class="location">mountains</span>.)';
  }
  return [breakWrap(result), breakWrap(hint)]
}


function sendResponse (command) {
  let command_monitor = makeMonitorStr(command);
  let [result, hint] = computeResult(command)
  let response = command_monitor + result + hint;
  io.emit('console_output', response);
}


function onConnect (socket) {
  logConnect();
  sendResponse('login');
  socket.on('prompt_input', sendResponse);
  socket.on('disconnect', logDisconnect);
}


const port = 3000;
let logThisPort = _.partial(logPort, port);

app.use(express.static('dist'))

app.get('/', serveHome);

io.on('connection', onConnect);

http.listen(port, logThisPort);
