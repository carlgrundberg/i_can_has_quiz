
var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;
var library = models.library;

exports.models = models;

function current_track() {
     return { track: sp.trackPlayer.getNowPlayingTrack().track }
}

exports.init = function() {
    var socket = io.connect('http://ichq.com:1337');

    socket.on('connect', function() {
        socket.emit('join', { room: 'testing spotify' });
    });

    socket.on('current-track', function() {
       socket.emit('current-track', current_track())
    });

    socket.on('player', function(data) {
        switch(data.state) {
            case 'pause': controls.pause(); break;
            case 'resume': controls.resume(); break;
        }
    });

    player.observe(models.EVENT.CHANGE, function (e) {
        // Only update the page if the track changed
        if (e.data.curtrack == true) {
            socket.emit('new-track', current_track());
        }
    });

    $('#load-playlist-form').submit(function(e) {
       e.preventDefault();

        var playlist = models.Playlist.fromURI(this.uri.value);
        if(playlist) {
            var i = Math.round(Math.random()*playlist.tracks.length);
            player.play(playlist.tracks[i]);
        }
    });

    $('#answer-form').submit(function(e){
        e.preventDefault();

        var artist = player.track.album.artist;
        if(this.answer.value.toLowerCase() == artist.name.toLowerCase())
        {
            controls.pause();
            $('#result').html("Correct!");
        }
        else{
            $('#result').html("Wrong!");

        }
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
    stop : function() {
        player.play(null);
    }
};


function updatePageWithTrackDetails() {

    var header = document.getElementById("header");

    // This will be null if nothing is playing.
    var playerTrackInfo = player.track;

    if (playerTrackInfo == null) {
        header.innerText = "Nothing playing!";
    } else {
        var track = playerTrackInfo.data;
        header.innerHTML = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
    }
}