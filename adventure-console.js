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


function initWorld () {
	let command_monitor = '> login\n';
	let result = '\nYou get up and survey your surroundings. '
		+ 'A stern and unfamiliar landscape greets you. '
		+ 'The wind whistles quietly as a pair of grey, barren '
		+ 'mountains looms in the distance.\n\nYour head hurts.\n';
	let hint = '\n(Enter a command in the prompt and press [RETURN] to send it)\n'
	let response = command_monitor + result + hint;
	io.emit('console_output', response);
}


function computeResult (command) {
	if(command != 'walk toward mountains')
		return 'Nothing happens. Try walking toward the mountains.'
	return 'A dragon appears out of nowhere and incinerates you. You die instantly.'
}


function sendResponse (command) {
	let command_monitor = '> ' + command + '\n';
	let result = '\n' + computeResult(command) + '\n';
	let hint = '';
	let response = command_monitor + result + hint;
	io.emit('console_output', response);
}


function onConnect (socket) {
	logConnect();
	initWorld();
	socket.on('prompt_input', sendResponse);
	socket.on('disconnect', logDisconnect);
}


const port = 3000;
let logThisPort = _.partial(logPort, port);

app.use(express.static('dist'))

app.get('/', serveHome);

io.on('connection', onConnect);

http.listen(port, logThisPort);
