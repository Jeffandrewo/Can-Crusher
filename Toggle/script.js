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
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  $(document).ready(function(){
    var database = firebase.database();
    var actuatorRef = database.ref('ActuatorStatus');
    var $rod = $('.actuator-rod');
    var $status = $('.status-indicator');
    var $progressBar = $('.progress-bar');
    var $countdownTimer = $('.countdown-timer');
    var totalTime = 30; // Total time in seconds
    var countdownInterval;
	var binFillRef = database.ref('BinFillLevel');
	var $binFill = $('.bin-fill-level');
	var $binPercentage = $('.bin-percentage');
    var crushCountRef = database.ref('CrushCount');
    var $crushCounter = $('.crush-counter');

    function startCountdown(time) {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        var remainingTime = time;
        
        countdownInterval = setInterval(function() {
            remainingTime--;
            
            // Update progress bar
            var progress = ((time - remainingTime) / time) * 100;
            $progressBar.css('width', progress + '%');
            
            // Update countdown text
            $countdownTimer.text(`Time Remaining: ${remainingTime}s`);
            
            // Stop countdown when time is up
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                $progressBar.css('width', '100%');
                $countdownTimer.text('Time Remaining: 0s');
            }
        }, 1000);
    }
	

    // Listen for Actuator Status changes
    actuatorRef.on("value", function(snap){
        var ActuatorStatus = snap.val();
        
        // Update UI based on Actuator Status
        switch(ActuatorStatus) {
            case "Extending":
                $rod.removeClass('extended');
                $status.text('Status: Extending');
                startCountdown(totalTime);
                break;
            case "Extended":
                $rod.addClass('extended');
                $status.text('Status: Extended');
                // Ensure progress bar is at 100%
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
                
                // Clear any existing countdown interval
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                break;
            default:
                $status.text('Status: Idle');
                $progressBar.css('width', '0%');
                $countdownTimer.text('Time Remaining: 30s');
                
                // Clear any existing countdown interval
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
        }
    });
	// Listen for bin fill level changes
    binFillRef.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            // Update the visual fill level
            $binFill.css('height', fillLevel + '%');
            
            // Update the percentage text
            $binPercentage.text('Bin Fill Level: ' + Math.round(fillLevel) + '%');
            
            // Change color based on fill level
            if (fillLevel > 80) {
                $binFill.css('background', '#e74c3c'); // Red for high level
            } else if (fillLevel > 50) {
                $binFill.css('background', '#f1c40f'); // Yellow for medium level
            } else {
                $binFill.css('background', '#21ecf3'); // Original color for low level
            }
        }
    });
    crushCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $crushCounter.text('Crushes: ' + count);
        }
    });

    // Handle reset button click
    $('.reset-button').click(function() {
        database.ref('ResetCount').set(true);
    });

});

