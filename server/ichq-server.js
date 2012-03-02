/**
 * Created by JetBrains PhpStorm.
 * User: Calle
 * Date: 2012-02-18
 * Time: 14:33
 * To change this template use File | Settings | File Templates.
 */
var app = require('http').createServer(handler)
    ,io = require('socket.io').listen(app)
    ,fs = require("fs")
    ,url = require("url")
    ,path = require("path");

app.listen(1337);

function handler(req, res) {
    var uri = url.parse(req.url).pathname;
    console.log('uri', uri);
    var filename = path.join(process.cwd(), uri);
    path.exists(filename, function(exists) {
        if (!exists) {
            res.writeHeader(404, {"Content-Type": "text/plain"});
            res.write("404 Not Found\n");
            res.end();
            return;
        }

        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                res.writeHeader(500, {"Content-Type": "text/plain"});
                res.write(err + "\n");
                res.end();
                return;
            }

            extension = filename.substr(filename.lastIndexOf('.')+1);
            switch(extension) {
                case 'js': mime = 'text/javascript'; break;
                case 'css': mime = 'text/css'; break;
                case 'html': mime = 'text/html'; break;
                default: mime = 'text/plain';
            }
            res.writeHeader(200, {"Content-Type": mime});
            res.write(file, "binary");
            res.end();
        });
    });
}

function error_res(res) {
    res.writeHead(500);
    return res.end('Dont do that!');
}

function spotify_img_to_url(img) {
    var pattern = /.*:image:(.*)$/;
    if (img != null) {
        var match = pattern.exec(img);
        if (match) {
            return 'http://o.scdn.co/image/' + match[1];
        }
        return null;
    }
    return null;
}

io.sockets.on('connection', function (socket) {
    socket.emit('onConnection', { rooms: io.sockets.manager.rooms })

    socket.on('createQuiz', function(data) {
        console.log('createQuiz', data);
        socket.join(data.quiz.name);
        io.sockets.emit('onCreateQuiz', data);
    });

    socket.on('joinQuiz', function(data) {
        console.log('joinQuiz', data);
        socket.join(data.quiz.name);
        io.sockets.in(data.quiz.name).emit('onJoinQuiz', data);
    });

    socket.on('startQuiz', function(data) {
        io.sockets.in(data.quiz.name).emit('onStartQuiz', data);
    });

    socket.on('nextQuestion', function(data) {
        io.sockets.in(data.quiz.name).emit('onNextQuestion', data);
    });

    socket.on('answerQuestion', function(data) {
        io.sockets.in(data.quiz.name).emit('onAnswerQuestion', data);
    });

    socket.on('endQuestion', function(data) {
        io.sockets.in(data.quiz.name).emit('onEndQuestion', data);
    });

    socket.on('endQuiz', function(data) {
        io.sockets.in(data.quiz.name).emit('onEndQuiz', data);
    });

    socket.on('disconnect', function(data) {
        console.log('disconnect', data);
    });
});

function current_track(socket, data) {
    data.track.image = spotify_img_to_url(data.track.album.cover);
    socket.broadcast.to('testing client').emit('current-track', data);
}