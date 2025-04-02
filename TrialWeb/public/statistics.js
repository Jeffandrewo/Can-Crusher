const firebaseConfig = {
    apiKey: "AIzaSyB9WEKy2...",
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

document.addEventListener("DOMContentLoaded", function () {
    var database = firebase.database();
    var ctx = document.getElementById("statistics-chart");

    if (!ctx) {
        console.error("Canvas element with ID 'statistics-chart' not found.");
        return;
    }

    var chartContext = ctx.getContext("2d");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    var statisticsChart = new Chart(chartContext, {
        type: "bar",
        data: {
            labels: months,
            datasets: [
                {
                    label: "Plastic Bottles",
                    backgroundColor: "#3498db",
                    data: Array(12).fill(0)
                },
                {
                    label: "Aluminum Cans",
                    backgroundColor: "#e74c3c",
                    data: Array(12).fill(0)
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Items'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Recycling Data',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });

    function fetchData(selectedMonth = "all") {
        console.log("Fetching data...");
    
        // Ensure arrays are reset before processing new data
        let plasticData = Array(12).fill(0);
        let aluminumData = Array(12).fill(0);
    
        // First try to fetch from the MonthTotals structure (which seems to be what you're using in your counter code)
        let promises = [
            database.ref('PlasticMonthTotals').once("value"),
            database.ref('AluminumMonthTotals').once("value")
        ];
    
        Promise.all(promises)
            .then(snapshots => {
                let plasticTotals = snapshots[0].val() || {};
                let aluminumTotals = snapshots[1].val() || {};
                
                console.log("Plastic Month Totals:", plasticTotals);
                console.log("Aluminum Month Totals:", aluminumTotals);
                
                // Update data arrays based on monthly totals
                Object.keys(plasticTotals).forEach(monthIndex => {
                    let index = parseInt(monthIndex, 10);
                    if (index >= 0 && index < 12) {
                        if (selectedMonth === "all" || index === parseInt(selectedMonth) - 1) {
                            plasticData[index] = plasticTotals[monthIndex] || 0;
                        }
                    }
                });
                
                Object.keys(aluminumTotals).forEach(monthIndex => {
                    let index = parseInt(monthIndex, 10);
                    if (index >= 0 && index < 12) {
                        if (selectedMonth === "all" || index === parseInt(selectedMonth) - 1) {
                            aluminumData[index] = aluminumTotals[monthIndex] || 0;
                        }
                    }
                });
                
                // Fall back to the timestamps approach if we didn't get data from the totals
                let hasData = plasticData.some(val => val > 0) || aluminumData.some(val => val > 0);
                
                if (!hasData) {
                    console.log("No data found in MonthTotals, checking timestamps...");
                    // Try the old way (looking at timestamps)
                    return database.ref().once("value");
                } else {
                    console.log("Data found in MonthTotals, updating chart...");
                    return null;
                }
            })
            .then(snapshot => {
                if (!snapshot) {
                    // We already have data from MonthTotals
                    return;
                }
                
                if (!snapshot.exists()) {
                    console.log("No data found in Firebase.");
                    return;
                }
                
                let data = snapshot.val();
                console.log("Firebase Data:", data); // Debugging
                
                if (data.PlasticBottleTimestamps) {
                    Object.values(data.PlasticBottleTimestamps).forEach((entry) => {
                        // Check if this is a count entry (not a reset event)
                        if (entry.date && !entry.event) {
                            let dateParts = entry.date.split(" ");
                            let monthName = dateParts[0];
                            let monthIndex = months.indexOf(monthName);
                            
                            if (monthIndex >= 0 && monthIndex < 12) {
                                let count = parseInt(entry.count, 10) || 0;
                                if (selectedMonth === "all" || monthIndex === parseInt(selectedMonth) - 1) {
                                    // Use the highest count for the month
                                    plasticData[monthIndex] = Math.max(plasticData[monthIndex], count);
                                }
                            }
                        }
                    });
                }
                
                if (data.AluminumCanTimestamps) {
                    Object.values(data.AluminumCanTimestamps).forEach((entry) => {
                        // Check if this is a count entry (not a reset event)
                        if (entry.date && !entry.event) {
                            let dateParts = entry.date.split(" ");
                            let monthName = dateParts[0];
                            let monthIndex = months.indexOf(monthName);
                            
                            if (monthIndex >= 0 && monthIndex < 12) {
                                let count = parseInt(entry.count, 10) || 0;
                                if (selectedMonth === "all" || monthIndex === parseInt(selectedMonth) - 1) {
                                    // Use the highest count for the month
                                    aluminumData[monthIndex] = Math.max(aluminumData[monthIndex], count);
                                }
                            }
                        }
                    });
                }
            })
            .finally(() => {
                console.log("Final Plastic Data:", plasticData);
                console.log("Final Aluminum Data:", aluminumData);
                
                // Update the chart with our data
                statisticsChart.data.datasets[0].data = [...plasticData];
                statisticsChart.data.datasets[1].data = [...aluminumData];
                statisticsChart.update();
            });
    }
    
    // Automatically fetch data on page load
    fetchData();

    let applyFilterBtn = document.getElementById("apply-filter");
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener("click", function () {
            let monthSelect = document.getElementById("month-select");
            if (!monthSelect) {
                console.error("Dropdown with ID 'month-select' not found.");
                return;
            }
            let selectedMonth = monthSelect.value;
            fetchData(selectedMonth);
        });
    } else {
        console.error("Element with ID 'apply-filter' not found.");
    }
});