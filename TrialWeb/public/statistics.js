// statistics.js
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

        const isMonthly = selectedMonth === "all";
        const plasticData = Array(isMonthly ? 12 : 5).fill(0);
        const aluminumData = Array(isMonthly ? 12 : 5).fill(0);

        database.ref().once("value", function (snapshot) {
            if (!snapshot.exists()) {
                console.log("No data found in Firebase.");
                return;
            }

            let data = snapshot.val();
            console.log("Firebase Data:", data);

            function processEntries(entries, dataArray, selectedMonth) {
                const weeklyTotals = Array(5).fill(0);
            
                // Filter and sort entries by date
                const filtered = Object.values(entries)
                    .filter(entry => entry.date)
                    .map(entry => {
                        return {
                            date: new Date(entry.date + "T00:00:00"),
                            count: parseInt(entry.count, 10) || 0
                        };
                    })
                    .sort((a, b) => a.date - b.date);
            
                if (isMonthly) {
                    // For monthly view, just take the latest entry per month
                    filtered.forEach(entry => {
                        let monthIndex = entry.date.getMonth();
                        dataArray[monthIndex] = entry.count; // last wins
                    });
                } else {
                    // Weekly logic
                    const monthIndex = parseInt(selectedMonth) - 1;
            
                    filtered.forEach(entry => {
                        if (entry.date.getMonth() === monthIndex) {
                            let weekIndex = Math.floor((entry.date.getDate() - 1) / 7);
                            if (weekIndex >= 0 && weekIndex < 5) {
                                weeklyTotals[weekIndex] = entry.count;
                            }
                        }
                    });
            
                    // Subtract previous week to get actual increment
                    for (let i = 0; i < 5; i++) {
                        if (i === 0) {
                            dataArray[i] = weeklyTotals[i];
                        } else {
                            dataArray[i] = weeklyTotals[i] - weeklyTotals[i - 1];
                            if (dataArray[i] < 0) dataArray[i] = 0; // prevent negatives if data is bad
                        }
                    }
                }
            }
            

            if (data.PlasticBottleTimestamps) {
                processEntries(data.PlasticBottleTimestamps, plasticData, selectedMonth);
            }

            if (data.AluminumCanTimestamps) {
                processEntries(data.AluminumCanTimestamps, aluminumData, selectedMonth);
            }

            let labels = isMonthly ? months : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

            statisticsChart.data.labels = labels;
            statisticsChart.data.datasets[0].data = plasticData;
            statisticsChart.data.datasets[1].data = aluminumData;
            statisticsChart.options.plugins.title.text = isMonthly ? 'Monthly Recycling Data' : `${months[parseInt(selectedMonth) - 1]} - Weekly Recycling Data`;

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