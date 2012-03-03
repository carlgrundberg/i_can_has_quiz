var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var library = models.library;
var statusCodes = { NOT_STARTED:0, STARTED:1, FINISHED:2 };
var quiz = {
    name:'',
    playlist:null,
    status:statusCodes.NOT_STARTED,
    players: {}
};

var NEXT_QUESTION_DELAY = 1000;

var socket;

exports.quiz = quiz;
exports.models = models;

function current_track() {
    return { track:sp.trackPlayer.getNowPlayingTrack().track }
}

function getArtistSuggestions(artist, cb) {
    var baseUrl = 'http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&autocorrect=1&limit=3';
    var apiKey = 'b25b959554ed76058ac220b7b2e0a026';
    $.ajax({
        dataType:'xml',
        timeout:900,
        url:baseUrl + '&artist=' + artist + '&api_key=' + apiKey,
        success:function (xml) {
            var suggestions = new Array();
            var xdoc = $(xml);
            xdoc.find('artist').each(function () {
                suggestions.push($('name', this).text());
            });
            cb(suggestions);
        },
        error:function (jqXHR, textStatus, errorThrown) {
            alert('debug: Error loading artistsuggestions ' + jqXHR + ' ' + textStatus + ' ' + errorThrown);
        }
    });
}

function playerCount() {
    var count = 0;
    for (var i in quiz.players) {
        if (quiz.players.hasOwnProperty(i)) {
            count++;
        }
    }
    return count;
}

function shuffle(o) {
    for (var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function nextQuestion() {
    setTimeout(function () {
        var i = Math.round(Math.random() * quiz.playlist.tracks.length);
        var track = quiz.playlist.tracks[i];
        quiz.currentQuestion = { name:'Who\'s the artist?', id: i, track: track, alternatives: [], correctAlternative: track.album.artist.name };
        getArtistSuggestions(track.album.artist.name, function (suggestions) {
            suggestions.push(quiz.currentQuestion.correctAlternative);
            $.each(shuffle(suggestions), function(i, v) {
                quiz.currentQuestion.alternatives.push({id: i, name: v});
                if(v == quiz.currentQuestion.correctAlternative) {
                    quiz.currentQuestion.correctAlternative = {id: i, name: v};
                }
            });

            player.play(track);
            $('#currenttrack').html(track.name + ' - ' + track.album.artist.name);
            $('#answers').empty();
            socket.emit('question', {quiz:quiz });
        });
    }, NEXT_QUESTION_DELAY);
}

function playerList() {
    var c = $('#players').empty();
    $.each(quiz.players, function (i, v) {
        c.append('<li>' + v.name + ': ' + v.score + '</li>');
    });
}

function answerList() {
    var c = $('#answers').append();
    $.each(quiz.currentQuestion.answers, function(i, v) {
        c.append($('<li>'+v.player.name+': '+v.answer.name+'</li>'));
    });
}

exports.init = function () {
    socket = io.connect('http://ichq.com:1337');
    var name;
    var playlistUri = 'http://open.spotify.com/user/ohlle/playlist/1qRUv1wcVvEL9eaovMlhby';

    socket.on('connect', function () {
        $('#connectionstatus').html('Connected!');
    });

    socket.on('onCreateQuiz', function () {

    });

    socket.on('onJoinQuiz', function (data) {
        quiz.players[data.player.id] = { name:data.player.name, score:0};
        playerList();
        $('#start-quiz').show();
    });

    socket.on('onAnswerQuestion', function (data) {
        if(data.player && data.answer.question == quiz.currentQuestion.id) {
            if(!quiz.currentQuestion.answers) {
                quiz.currentQuestion.answers = [];
            }
            quiz.currentQuestion.answers.push({player: data.player, answer: data.answer});
            if(quiz.currentQuestion.correctAlternative.id == data.answer.alternative) {
                quiz.players[data.player.id].score++;
                playerList();
            }
            if(quiz.currentQuestion.answers.length == playerCount()) {
                $('#next-question input').removeAttr('disabled');
                controls.pause();
                quiz.currentQuestion.answered = true;
            }
            socket.emit('question', {quiz: quiz });
            answerList();
        }
    });

    $('#create-quiz').submit(function (e) {
        e.preventDefault();
        quiz.name = this.name.value;
        quiz.playlist = models.Playlist.fromURI(this.playlist.value);
        socket.emit('createQuiz', { quiz:quiz });
    });

    $('#start-quiz').submit(function (e) {
        e.preventDefault();
        socket.emit('startQuiz', { quiz:quiz });
        nextQuestion();
    });

    $('#next-question').submit(function (e) {
        e.preventDefault();
        $('input', this).attr('disabled', 'disabled');
        nextQuestion();
    });
};


var controls = {
    play:function (track) {
        player.play(track);
    },
    pause:function () {
        player.playing = false;
    },
    resume:function () {
        player.playing = true;
    },
    next:function () {
        if (player.track) {
            player.position = -1;
        }
    },
    restart:function () {
        if (player.track) {
            player.position = 0;
        }
    }
};