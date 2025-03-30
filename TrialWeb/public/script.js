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
    
    // References for bin fill levels
    var binFillRef = database.ref('BinFillLevel');
    var binFill1Ref = database.ref('BinFillLevel1');
    var binFill2Ref = database.ref('BinFillLevel2');
    
    // UI elements for bin fill levels
    var $binFill = $('.bin-fill-level');
    var $binFill1 = $('.bin-fill-1');
    var $binFill2 = $('.bin-fill-2');
    var $binPercentage = $('.bin-percentage');
    var $binPercentage1 = $('.bin-percentage-1');
    var $binPercentage2 = $('.bin-percentage-2');
    
    // References for counts
    var crushCountRef = database.ref('CrushCount');
    var plasticBottleCountRef = database.ref('PlasticBottleCount');
    var aluminumCanCountRef = database.ref('AluminumCanCount');

    // References for timestamp logs (only in database, not displayed)
    var plasticTimestampsRef = database.ref('PlasticBottleTimestamps');
    var aluminumTimestampsRef = database.ref('AluminumCanTimestamps');
    
    // UI elements for counts
    var $crushCount = $('#crush-count');
    var $plasticCount = $('#plastic-count');
    var $aluminumCount = $('#aluminum-count');

   

    $("#login-button").click(function() {
        var enteredKey = $("#admin-key").val();
        
        database.ref('AdminKey').once('value').then(function(snapshot) {
            var correctKey = snapshot.val(); // Get key from Firebase
            
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

    // Allow pressing Enter to login
    $('#admin-key').keypress(function(e) {
        if (e.which == 13) { // Enter key
            $('#login-button').click();
        }
    });

    // Handle change key
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
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // Reset progress bar and countdown
        $progressBar.css('width', '0%');
        $countdownTimer.text('Time Remaining: 30s');
    }

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
    
    // Function to update bin fill level colors based on percentage
    function updateBinFillColor($element, fillLevel) {
        if (fillLevel > 80) {
            $element.css('background', '#e74c3c'); // Red for high level
        } else if (fillLevel > 50) {
            $element.css('background', '#f1c40f'); // Yellow for medium level
        } else {
            $element.css('background', '#21ecf3'); // Original color for low level
        }
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
    
    // Listen for average bin fill level changes
    binFillRef.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            // Update the percentage text
            $binPercentage.text('Average Fill Level: ' + Math.round(fillLevel) + '%');
        }
    });
    
    // Listen for bin 1 fill level changes
    binFill1Ref.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            // Update the visual fill level
            $binFill1.css('height', fillLevel + '%');
            
            // Update the percentage text
            $binPercentage1.text('Fill: ' + Math.round(fillLevel) + '%');
            
            // Change color based on fill level
            updateBinFillColor($binFill1, fillLevel);
        }
    });
    
    // Listen for bin 2 fill level changes
    binFill2Ref.on("value", function(snap) {
        var fillLevel = snap.val();
        if (fillLevel !== null) {
            // Update the visual fill level
            $binFill2.css('height', fillLevel + '%');
            
            // Update the percentage text
            $binPercentage2.text('Fill: ' + Math.round(fillLevel) + '%');
            
            // Change color based on fill level
            updateBinFillColor($binFill2, fillLevel);
        }
    });
    
    crushCountRef.on("value", function(snap) {
        console.log("CrushCount Snapshot:", snap.val()); // Debugging
        var count = snap.val();
        if (count !== null) {
            $crushCount.text(count);
        }
    });
    
    
    // Track previous values for counts to detect increments
    var previousPlasticCount = 0;
    var previousAluminumCount = 0;
    
    plasticBottleCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $plasticCount.text(count);
            
            // If count has increased, log a timestamp
            if (count > previousPlasticCount) {
                var now = new Date();
                var monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // "March 2025"
                
                var timestampData = {
                    date: monthYear,  // Stores only Month and Year
                    time: now.toLocaleTimeString(),
                    count: count,
                    previousCount: previousPlasticCount
                };
                
                // Push the timestamp to the database
                plasticTimestampsRef.push().set(timestampData);
            }
            
            previousPlasticCount = count;
        }
    });
    
    
    aluminumCanCountRef.on("value", function(snap) {
        var count = snap.val();
        if (count !== null) {
            $aluminumCount.text(count);
            
            // If count has increased, log a timestamp
            if (count > previousAluminumCount) {
                var now = new Date();
                var monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // "March 2025"
                
                var timestampData = {
                    date: monthYear,  // Stores only Month and Year
                    time: now.toLocaleTimeString(),
                    count: count,
                    previousCount: previousAluminumCount
                };
                
                // Push the timestamp to the database
                aluminumTimestampsRef.push().set(timestampData);
            }
            
            previousAluminumCount = count;
        }
    });
    

    $('.reset-button, #reset-counts').click(function() {
        // Reset the counters
        database.ref('CrushCount').set(0);
        database.ref('PlasticBottleCount').set(0);
        database.ref('AluminumCanCount').set(0);
    
        // Remove all timestamps for PlasticBottleTimestamps and AluminumCanTimestamps
        database.ref('PlasticBottleTimestamps').remove()
            .then(() => console.log("PlasticBottleTimestamps history cleared."))
            .catch((error) => console.error("Error clearing PlasticBottleTimestamps:", error));
    
        database.ref('AluminumCanTimestamps').remove()
            .then(() => console.log("AluminumCanTimestamps history cleared."))
            .catch((error) => console.error("Error clearing AluminumCanTimestamps:", error));
    
        // Store a reset event in the database for logging purposes
        var now = new Date();
        var resetData = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            event: "Counters Reset"
        };
    
        // Push the reset event to the database
        plasticTimestampsRef.push().set(resetData);
        aluminumTimestampsRef.push().set(resetData);
    
        // Reset previous count tracking
        previousPlasticCount = 0;
        previousAluminumCount = 0;
    
        // Also set the ResetCount flag for backward compatibility with ESP32
        database.ref('ResetCount').set(true);
    });
    
});