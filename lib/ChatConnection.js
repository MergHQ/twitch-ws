'use strict';

const WebSocket = require('ws');
const EventEmitter = require('events');
var self = null;

class ChatConnection extends EventEmitter {
	constructor(token, username, host) {
		super();
		self = this;
		this.connect(token, username, host);
	}

	connect(token, username, host) {
		this.ws = new WebSocket(host);
		this.ws.on('open', () => {
			// Identify
			self.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
			self.ws.send('PASS ' + token);
			self.ws.send('NICK ' + username);
			self.emit('ready');
		});

		this.ws.on('message', (data, flags) => {
			if(data.indexOf('PING :tmi.twitch.tv') !== -1) {
					self.ws.send('PONG');
				self.ws.send('PING');
				return;
			}
			var obj = {};
			var params = data.split(';');
			try {
				for (var i = 0; i < params.length - 1; ++i) {
					let param = params[i].split('=');
					obj[param[0].replace('-', '')] = param[1];
				}

				var message = params[params.length - 1];
				var parsedMsg = message.split(' ');
				if (parsedMsg.length >= 5) {
					var content = parsedMsg.slice(4, parsedMsg.length).join(' ')
					var msgObj = {
						type: parsedMsg[2],
						channel: parsedMsg[3].substr(1, parsedMsg[3].length),
						content: content.substr(1, content.length - 2)
					};

					obj.message = msgObj;
				}
			} catch (e) {
				console.log(e);
			}

			self.emit('message', obj);
		});

		this.ws.on('closed', (code, message) => {
			console.log('Closed. Reconnecting...');
			self.emit('closed', code, message);
			setTimeout(() => { self.connect(token, username, host) }, 5000);
		});

		this.ws.on('error', (e) => {
			console.log('Error: ' + e);
			self.emit('error', e);
		});
	}

	joinChannel(channel) {
		if (!this.ws) return;
		this.ws.send('JOIN #' + channel);
	}
}


module.exports = ChatConnection;