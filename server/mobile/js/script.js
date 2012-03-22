var quiz;
var player;
var answer;
var socket_url = 'http://' + window.location.hostname + ':' + window.location.port;

function add_quiz_to_list(quiz) {
    var list = $('#quizlist');
    if($('li:contains('+quiz.name+')', list).length == 0)  {
        list.append(ich.quiz_template(quiz));
    }
}

$(document).ready(function () {
    socket = io.connect(socket_url);
    socket.on('connect', function () {
        $('#connectionstatus').html('Connected!');
    });

    socket.on('onConnection', function (data) {
        $.each(data.rooms, function (i, v) {
            if (i != '') {
                add_quiz_to_list({name:i.substring(1)});
            }
        });
    });

    socket.on('onCreateQuiz', function (data) {
        add_quiz_to_list(data.quiz)
    });

    socket.on('onStartQuiz', function (data) {

    });

    socket.on('onQuestion', function (data) {
        if (!quiz.currentQuestion || quiz.currentQuestion.id != data.quiz.currentQuestion.id) {
            $('#questioncontainer').html(ich.question_template(data.quiz.currentQuestion));
            answer = null;
        } else {
            if (data.quiz.currentQuestion.answered) {
                $('#questioncontainer a[data-id="' + data.quiz.currentQuestion.correctAlternative.id + '"]').css('color', 'green');
                if (answer && data.quiz.currentQuestion.correctAlternative.id != answer.alternative) {
                    $('#questioncontainer a[data-id="' + answer.alternative + '"]').css('color', 'red');
                }
            }
        }
        quiz = data.quiz;
    });

    $('#quizlist a').live('click', function () {
        var name = $('#playername').val();
        if (name == '') {
            alert('Fill in name');
            $('#playername').focus();
            return;
        }
        quiz = { name:$(this).html().trim() };
        player = { name:name, score:0 };
        socket.emit('joinQuiz', { quiz:quiz, player:player });
    });

    $('#questioncontainer a').live('click', function () {
        var alternative = $(this);
        var question = $('#questioncontainer p');
        if (!answer) {
            answer = { question:question.data('id'), alternative:alternative.data('id'), name:alternative.html().trim() };
            socket.emit('answerQuestion', { quiz:quiz, player:player, answer:answer});
        }
    });
});
