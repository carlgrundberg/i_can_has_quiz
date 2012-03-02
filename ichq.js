var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var library = models.library;

var players = [];
var socket;

exports.models = models;

function current_track() {
    return { track: sp.trackPlayer.getNowPlayingTrack().track }
}

function getArtistSuggestions(artist, cb)
{
    var baseUrl = 'http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&autocorrect=1&limit=3';
    var apiKey  = 'b25b959554ed76058ac220b7b2e0a026';
    $.ajax({
        dataType: 'xml',
        timeout: 900,
        url: baseUrl+'&artist='+artist+'&api_key='+apiKey,
        success: function(xml){
            var suggestions = new Array();
            var xdoc = $(xml);
              xdoc.find('artist').each(function(){
                suggestions.push($('name', this).text());
            });
            cb(suggestions);
        },
        error: function(jqXHR, textStatus, errorThrown){
            alert('debug: Error loading artistsuggestions ' + jqXHR +' ' + textStatus + ' ' + errorThrown);
        }
    });
}

function shuffle(o){
	for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
}

function startNextQuestion(playlistUri) {
    var playlist = models.Playlist.fromURI(playlistUri);
    if (playlist) {
        var i = Math.round(Math.random() * playlist.tracks.length);
        var track = playlist.tracks[i];
        getArtistSuggestions(track.album.artist.name, function(suggestions) {
            if(suggestions.length < 3) {
                return;
            }
            suggestions.push(track.album.artist.name);
            player.play(track);
            socket.emit('nextQuestion', {quiz: { name: name, question: { name: 'Who\'s the artist?', alternatives: shuffle(suggestions) }}});
        });
    }
}

exports.init = function() {
    socket = io.connect('http://ichq.com:1337');
    var name;
    var playlistUri = 'http://open.spotify.com/user/ohlle/playlist/1qRUv1wcVvEL9eaovMlhby';

    socket.on('connect', function() {
        $('#connectionstatus').html('Connected!');
    });

    socket.on('onCreateQuiz', function() {

    });

    socket.on('onJoinQuiz', function(data) {
        $('#players').append($('<li>' + data.player.name + '</li>'));
        $('#start-quiz').show();
    });

    socket.on('onAnswer', function(data) {
        console.log('onAnswer', data);
    });

    $('#create-quiz').submit(function(e) {
        e.preventDefault();
        name = this.name.value;
        playlistUri = this.playlist.value;
        socket.emit('createQuiz', { quiz: { name: name } });
    });

    $('#start-quiz').submit(function(e) {
        e.preventDefault();
        players = [];
        $('#players').each(function(i, v) {
            players.push({name: $(v).html()});
        });
        socket.emit('startQuiz', { quiz: { name: name, players: players }});

        startNextQuestion(playlistUri);

//        socket.emit('nextQuestion', {quiz: { name: name, question: { name: 'Who\'s the artist?', alternatives: alts }}});
    });

    $('#load-playlist-form').submit(function(e) {
        e.preventDefault();

        var playlist = models.Playlist.fromURI(this.uri.value);
        if (playlist) {
            var i = Math.round(Math.random() * playlist.tracks.length);
            player.play(playlist.tracks[i]);
        }
    });

    $('#answer-form').submit(function(e) {
        e.preventDefault();

        var artist = player.track.album.artist;
        if (this.answer.value.toLowerCase() == artist.name.toLowerCase()) {
            controls.pause();
            $('#result').html("Correct!");
        }
        else {
            $('#result').html("Wrong!");

        }
    });

    $('#volume-form').submit(function(e) {
        e.preventDefault();
        player.setVolume(1.0);//controls.volume(1.0);
    });
};


var controls = {
    play : function(track) {
        player.play(track);
    },
    pause : function() {
        player.playing = false;
    },
    resume : function() {
        player.playing = true;
    },
    next : function() {
        if (player.track) {
            player.position = -1;
        }
    },
    restart : function() {
        if (player.track) {
            player.position = 0;
        }
    }
};