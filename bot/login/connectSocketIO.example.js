const { io } = require('socket.io-client');
const socket = io('http://localhost:3001' , {
	query: {
		verifyToken: "Fn96OxLwWEfENTPYPAiXqwdieaIsn4Y5OH2APP0O"
	}
});

const channel = "uptime";
socket.on(channel, data => {
	console.log(data);
});

socket.on('disconnect', (e) => {
	console.log('Disconnect', e);
	});

socket.on('connect', () => {
	console.log('Connect to socket successfully');
	});

socket.on('connect_error', err => {
	console.log('Connect error', err);
	});