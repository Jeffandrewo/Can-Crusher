$(document).ready(function() {
    var database = firebase.database();
    
    // References for bin fill levels
    var binFill1Ref = database.ref('BinFillLevel1');
    var binFill2Ref = database.ref('BinFillLevel2');
    
    // Toast setup (Toastr configuration)
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-right", // Position of the toast
        "preventDuplicates": false, // Set to false to allow multiple notifications
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000", // How long the toast stays visible
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    console.log("Toastr initialized:", typeof toastr.warning); // Verify toastr is loaded

    // Track previous notifications to avoid duplicates
    var bin1Notified = false;
    var bin2Notified = false;
    
    // Listen for real-time bin fill level changes instead of polling
    binFill1Ref.on("value", function(snapshot) {
        var fillLevel1 = snapshot.val();
        console.log("Bin 1 fill level updated:", fillLevel1);
        
        if (fillLevel1 >= 75 && !bin1Notified) {
            toastr.warning("Warning: Bin 1 fill level is " + fillLevel1 + "%");
            bin1Notified = true;
            console.log("Bin 1 notification sent");
        } else if (fillLevel1 < 75) {
            bin1Notified = false; // Reset notification flag when level drops below 75%
        }

        // Update the display of the current fill level (optional)
        $('#bin1FillLevel').text("Bin 1 Fill Level: " + fillLevel1 + "%");
    });
    
    binFill2Ref.on("value", function(snapshot) {
        var fillLevel2 = snapshot.val();
        console.log("Bin 2 fill level updated:", fillLevel2);
        
        if (fillLevel2 >= 75 && !bin2Notified) {
            toastr.warning("Warning: Bin 2 fill level is " + fillLevel2 + "%");
            bin2Notified = true;
            console.log("Bin 2 notification sent");
        } else if (fillLevel2 < 75) {
            bin2Notified = false; // Reset notification flag when level drops below 75%
        }

        // Update the display of the current fill level (optional)
        $('#bin2FillLevel').text("Bin 2 Fill Level: " + fillLevel2 + "%");
    });
    
    // Test notification to verify toastr is working
    console.log("Attempting to show test notification");
    setTimeout(function() {
        toastr.info("System initialized. Monitoring bin levels.");
    }, 1000);
});
