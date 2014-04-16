// Load modules

var Ws = require('ws');
var Hoek = require('hoek');


// Declare internals

var internals = {};


internals.defaults = {
    endpoint: '/',
    host: 'localhost',
    port: 0,
    data: {}
};


exports.register = function (plugin, options, next) {

    var settings = Hoek.applyToDefaults(internals.defaults, options || {});
    var server = new plugin.hapi.Server(settings.host, settings.port);
    server.start(function () {

        var subscribers = [];
        var template = internals.template(server.info.host, server.info.port);

        plugin.route({
            method: 'GET',
            path: settings.endpoint,
            handler: internals.handler(template)
        });

        plugin.route({
            method: 'GET',
            path: '/client.js',
            handler: {
                file:  __dirname + '/../client.js'
            }
        });

        plugin.route({
            method: 'GET',
            path: '/socket.io.min.js',
            handler: {
                file:  __dirname + '/../socket.io.min.js'
            }
        });

        var ws = new Ws.Server({ server: server.listener });
        ws.on('connection', function (socket) {

            subscribers.push(socket);
            socket.send('Welcome');
            socket.on('message', internals.message(socket));
        });

        internals.transmit = function (data) {

            for (var i = 0, il = subscribers.length; i < il; ++i) {
                try {
                    if (subscribers[i].readyState === Ws.OPEN) {
                        subscribers[i].send(data.toString());
                    }
                }
                catch (err) {}
            }
        };

        return next();
    });
};


internals.message = function (socket) {

    return function (data) {

        internals.transmit(data);
    };
};


internals.handler = function (template) {

    return function (request, reply) {

        reply(template);
    };
};


internals.template = function (host, port) {

    return '<!DOCTYPE html><html lang="en"><head><title>Debug Terminal</title>' +
        '<meta http-equiv="Content-Language" content="en-us">' +
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' +
        '<script type="application/json" src="/socket.io.min.js"></script>' +
        '<script type="application/json" src="/client.js"></script>' +
        '</head><body>' +
        '<script language="javascript">' +
        'var ws = new WebSocket("ws://' + host + ':' + port + '");' +
        'ws.onmessage = function (event) { console.log(event.data); };' +
        '</script>' +
        '</body></html>';
};
