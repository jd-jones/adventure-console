function sendCommand(e, socket) {
  // Prevent page from reloading
  e.preventDefault();

  // Sent command prompt contents to the server
  socket.emit('prompt_input', $('#cmd_prompt').val());

  // Reset command prompt contents
  $('#cmd_prompt').val('');

  return false;
}

function writeToConsoleEmulator(msg) {
  $('#console_out').empty();
  $('#console_out').append(msg);
}

$(function () {
  var socket = io();
  const sendCommandToSocket = (e) => sendCommand(e, socket);
  $('form').submit(sendCommandToSocket);

  socket.on('console_output', writeToConsoleEmulator);
});
