// script.js

const firebaseConfig = {
    apiKey: "AIzaSyB9WEKy2RsQmrimD2AW_2lhpAfjGzix878",
    authDomain: "toggle-6ce93.firebaseapp.com",
    databaseURL: "https://toggle-6ce93-default-rtdb.firebaseio.com",
    projectId: "toggle-6ce93",
    storageBucket: "toggle-6ce93.appspot.com",
    messagingSenderId: "894188303437",
    appId: "1:894188303437:web:c59f8d5bfdc61158629804",
    measurementId: "G-T7XSCYV8L7"
};

firebase.initializeApp(firebaseConfig);

$(document).ready(function(){
    var database = firebase.database();
    var actuatorRef = database.ref('ActuatorStatus');
    var $rod = $('.actuator-rod');
    var $status = $('.status-indicator');
    var $progressBar = $('.progress-bar');
    var $countdownTimer = $('.countdown-timer');
    var totalTime = 30;
    var countdownInterval;

    var binFillRef = database.ref('BinFillLevel');
    var binFill1Ref = database.ref('BinFillLevel1');
    var binFill2Ref = database.ref('BinFillLevel2');

    var $binFill = $('.bin-fill-level');
    var $binFill1 = $('.bin-fill-1');
    var $binFill2 = $('.bin-fill-2');
    var $binPercentage = $('.bin-percentage');
    var $binPercentage1 = $('.bin-percentage-1');
    var $binPercentage2 = $('.bin-percentage-2');

    var crushCountRef = database.ref('CrushCount');
    var plasticBottleCountRef = database.ref('PlasticBottleCount');
    var aluminumCanCountRef = database.ref('AluminumCanCount');

    var plasticTimestampsRef = database.ref('PlasticBottleTimestamps');
    var aluminumTimestampsRef = database.ref('AluminumCanTimestamps');

    var $crushCount = $('#crush-count');
    var $plasticCount = $('#plastic-count');
    var $aluminumCount = $('#aluminum-count');

    $("#login-button").click(function() {
        var enteredKey = $("#admin-key").val();

        database.ref('AdminKey').once('value').then(function(snapshot) {
            var correctKey = snapshot.val();

            if (enteredKey === correctKey) {
                window.location.href = "Main.html";
            } else {
                $(".error-message").show().text("Incorrect key!");
            }
        }).catch(function(error) {
            console.error("Error fetching admin key:", error);
        });
    });

    $(".logout-button").click(function() {
        window.location.href = "index.html";
    });

    $('#admin-key').keypress(function(e) {
        if (e.which == 13) {
            $('#login-button').click();
        }
    });

    $('#change-key-button').click(function() {
        var newKey = $('#new-admin-key').val();
        if (newKey.length > 0) {
            database.ref('AdminKey').set(newKey);
            alert('Admin key updated successfully!');
            $('#new-admin-key').val('');
        } else {
            alert('Please enter a valid key!');
        }
    });

    function resetCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        $progressBar.css('width', '0%');
        $countdownTimer.text('Time Remaining: 30s');
    }

    function startCountdown(time) {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        var remainingTime = time;

        countdownInterval = setInterval(function() {
            remainingTime--;
            var progress = ((time - remainingTime) / time) * 100;
            $progressBar.css('width', progress + '%');
            $countdownTimer.text(`Time Remaining: ${remainingTime}s`);
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                $progressBar.css('width', '100%');
                $countdownTimer.text('Time Remaining: 0s');
            }
        }, 1000);
    }

    function updateBinFillColor($element, fillLevel) {
        if (fillLevel > 80) {
            $element.css('background', '#e74c3c');
        } else if (fillLevel > 50) {
            $element.css('background', '#f1c40f');
        } else {
            $element.css('background', '#21ecf3');
        }
    }

    actuatorRef.on("value", function(snap){
        var ActuatorStatus = snap.val();
        switch(ActuatorStatus) {
            case "Extending":
                $rod.removeClass('extended');
                $status.text('Status: Extending');
                startCountdown(totalTime);
                break;
            case "Extended":
                $rod.addClass('extended');
                $status.text('Status: Extended');
                $progressBar.css('width', '100%');
                $countdownTimer.text('Time Remaining: 0s');
                break;
            case "Retracting":
                $rod.addClass('extended');
                $status.text('Status: Retracting');
                startCountdown(totalTime);
                break;
            case "Retracted":
                $rod.removeClass('extended');
                $status.text('Status: Idle');
                $progressBar.css('width', '0%');
                $countdownTimer.text('Time Remaining: 30s');
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                break;
            default:
                $status.text('Status: Idle');
                $progressBar.css('width', '0%');
                $countdownTimer.text('Time Remaining: 30s');
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
        }
    });

    binFillRef.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            $binPercentage.text('Average Fill Level: ' + Math.round(fillLevel) + '%');
        }
    });

    binFill1Ref.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            $binFill1.css('height', fillLevel + '%');
            $binPercentage1.text('Fill: ' + Math.round(fillLevel) + '%');
            updateBinFillColor($binFill1, fillLevel);
        }
    });

    binFill2Ref.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            $binFill2.css('height', fillLevel + '%');
            $binPercentage2.text('Fill: ' + Math.round(fillLevel) + '%');
            updateBinFillColor($binFill2, fillLevel);
        }
    });

    crushCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $crushCount.text(count);
        }
    });

    var previousPlasticCount = 0;
    var previousAluminumCount = 0;

    plasticBottleCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $plasticCount.text(count);
            if (count > previousPlasticCount) {
                var now = new Date();
                var formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()}`;
                var timestampData = {
                    date: formattedDate,
                    time: now.toLocaleTimeString(),
                    count: count,
                    previousCount: previousPlasticCount
                };
                plasticTimestampsRef.push().set(timestampData);
            }
            previousPlasticCount = count;
        }
    });

    aluminumCanCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $aluminumCount.text(count);
            if (count > previousAluminumCount) {
                var now = new Date();
                var formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()}`;
                var timestampData = {
                    date: formattedDate,
                    time: now.toLocaleTimeString(),
                    count: count,
                    previousCount: previousAluminumCount
                };
                aluminumTimestampsRef.push().set(timestampData);
            }
            previousAluminumCount = count;
        }
    });

    $('.reset-button, #reset-counts').click(function() {
        database.ref('CrushCount').set(0);
        database.ref('PlasticBottleCount').set(0);
        database.ref('AluminumCanCount').set(0);

        database.ref('PlasticBottleTimestamps').remove()
            .then(() => console.log("PlasticBottleTimestamps history cleared."))
            .catch((error) => console.error("Error clearing PlasticBottleTimestamps:", error));

        database.ref('AluminumCanTimestamps').remove()
            .then(() => console.log("AluminumCanTimestamps history cleared."))
            .catch((error) => console.error("Error clearing AluminumCanTimestamps:", error));

        var now = new Date();
        var formattedDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()}`;
        var resetData = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            date: formattedDate,
            time: now.toLocaleTimeString(),
            event: "Counters Reset"
        };

        plasticTimestampsRef.push().set(resetData);
        aluminumTimestampsRef.push().set(resetData);

        previousPlasticCount = 0;
        previousAluminumCount = 0;

        database.ref('ResetCount').set(true);
    });

});
