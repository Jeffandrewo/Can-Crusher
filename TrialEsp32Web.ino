#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <WebServer.h>

#include <WiFiManager.h>
#include <ESP32Servo.h>



#define API_KEY "AIzaSyB9WEKy2RsQmrimD2AW_2lhpAfjGzix878"
#define DATABASE_URL "https://toggle-6ce93-default-rtdb.firebaseio.com" 
#define USER_EMAIL "skydoes01@gmail.com"
#define USER_PASSWORD "Irregular4899030"

// Ultrasonic Sensor Pins
#define TRIG_PIN_1 33   
#define ECHO_PIN_1 34   
#define TRIG_PIN_2 32  
#define ECHO_PIN_2 35  
#define TRIG_PIN_OBJ 23 
#define ECHO_PIN_OBJ 18

#define BIN_HEIGHT 25.4  // Bin height in cm (10 inches)

// Actuator & Sensor Pins
#define RELAY1_PIN 19     // Extension relay
#define RELAY2_PIN 26     // Retraction relay
#define IR_SENSOR_PIN 27  // IR sensor



#define DELAY_TIME 5000  // Time for full extension/retraction in milliseconds
bool isOperating = false; // Flag to track actuator operation

float detectionThreshold = 1.0;  // Adjust based on object distance (cm)
float noObjectDistance = 5.0;     // Distance when no object is present
int crushCount = 0; // Counter for number of crushes

int plasticBottleCount = 0;
int aluminumCanCount = 0;

// Time variables for periodic updates
unsigned long lastBinLevelUpdate = 0;
const long binUpdateInterval = 1000; // Update bin levels every 5 seconds

// Define Firebase Data object
FirebaseData fbdo;

FirebaseAuth auth;
FirebaseConfig config;



Servo myServo;
WebServer server(80);

void setup() {
  Serial.begin(115200);

  // Initialize Ultrasonic Sensors
  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  pinMode(TRIG_PIN_OBJ, OUTPUT);
  pinMode(ECHO_PIN_OBJ, INPUT);
  
  // Initialize Actuator & Sensors
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  

  // Initialize Servo
  myServo.attach(21);
  myServo.write(25);  // Default position

  // Ensure relays are off initially
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);

   // Initialize WiFiManager
  WiFiManager wm;
  
  // Uncomment to reset saved settings during testing
  wm.resetSettings();
  
  // Set a custom AP name and password for configuration mode
  bool res = wm.autoConnect("Crusher", "pass12345");
  
  if (!res) {
    Serial.println("Failed to connect to WiFi");
    delay(3000);
    ESP.restart();
  } 

  // If you get here, you have connected to the WiFi
  Serial.println("Connected to WiFi");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  config.api_key = API_KEY;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.database_url = DATABASE_URL;

  
  Firebase.reconnectNetwork(true);
 

  Firebase.begin(&config, &auth);

  // Web server setup
  server.on("/", HTTP_GET, []() {
    // Redirect to your main page
    server.sendHeader("Location", "https://toggle-6ce93.web.app/", true);
    server.send(302, "text/plain", "");
  });

  // Start server
  server.begin();
  Serial.println("HTTP server started");

  // Initialize crush count from Firebase
  if (Firebase.RTDB.getInt(&fbdo, "/CrushCount")) {
    crushCount = fbdo.intData();
  } else {
    // If no count exists, initialize to 0
    Firebase.RTDB.setInt(&fbdo, "/CrushCount", 0);
  }

  // Initialize plastic bottle and aluminum can counts from Firebase
  if (Firebase.RTDB.getInt(&fbdo, "/PlasticBottleCount")) {
    plasticBottleCount = fbdo.intData();
    Serial.print("Plastic Bottle Count initialized: ");
    Serial.println(plasticBottleCount);
  } else {
    // If no count exists, initialize to 0
    Firebase.RTDB.setInt(&fbdo, "/PlasticBottleCount", 0);
    Serial.println("Initialized Plastic Bottle Count to 0");
  }

  if (Firebase.RTDB.getInt(&fbdo, "/AluminumCanCount")) {
    aluminumCanCount = fbdo.intData();
    Serial.print("Aluminum Can Count initialized: ");
    Serial.println(aluminumCanCount);
  } else {
    // If no count exists, initialize to 0
    Firebase.RTDB.setInt(&fbdo, "/AluminumCanCount", 0);
    Serial.println("Initialized Aluminum Can Count to 0");
  }

  // Initialize bin fill levels
  //updateBinFillLevels();

}

float getDistance(int trigPin, int echoPin) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    float distance = (duration * 0.034 / 2); // Convert time to cm

    
  return distance;
}

void updateBinFillLevels() {
  // Read Ultrasonic Sensor Data
  float distance1 = getDistance(TRIG_PIN_1, ECHO_PIN_1);
  float distance2 = getDistance(TRIG_PIN_2, ECHO_PIN_2);

  Serial.print("Distance Bin 1: ");
  Serial.println(distance1);
  Serial.print("Distance Bin 2: ");
  Serial.println(distance2);
  

  // Calculate fill levels as percentages
  float binFillLevel1 = (distance1 < BIN_HEIGHT) ? ((BIN_HEIGHT - distance1) / BIN_HEIGHT) * 100 : 0;
  float binFillLevel2 = (distance2 < BIN_HEIGHT) ? ((BIN_HEIGHT - distance2) / BIN_HEIGHT) * 100 : 0;
  
  // Calculate average fill level
  float averageFillLevel = (binFillLevel1 + binFillLevel2) / 2.0;

  

  // Update Firebase with individual bin levels and average
  if (Firebase.RTDB.setFloat(&fbdo, "/BinFillLevel1", binFillLevel1)) {
    Serial.print("Bin 1 Fill Level Updated: ");
    Serial.print(binFillLevel1, 1);
    Serial.println("%");
  } else {
    Serial.println("Failed to update Bin 1 Fill Level");
    Serial.println(fbdo.errorReason());
  }

  if (Firebase.RTDB.setFloat(&fbdo, "/BinFillLevel2", binFillLevel2)) {
    Serial.print("Bin 2 Fill Level Updated: ");
    Serial.print(binFillLevel2, 1);
    Serial.println("%");
  } else {
    Serial.println("Failed to update Bin 2 Fill Level");
    Serial.println(fbdo.errorReason());
  }

  // Also update the average for backward compatibility with existing code
  if (Firebase.RTDB.setFloat(&fbdo, "/BinFillLevel", averageFillLevel)) {
    Serial.print("Average Bin Fill Level Updated: ");
    Serial.print(averageFillLevel, 1);
    Serial.println("%");
  } else {
    Serial.println("Failed to update Average Bin Fill Level");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {

  server.handleClient();  // Handle web server clients
  
  float distance_OBJ = getDistance(TRIG_PIN_OBJ, ECHO_PIN_OBJ);

  // Update bin fill levels periodically
  /*unsigned long currentMillis = millis();
  if (currentMillis - lastBinLevelUpdate >= binUpdateInterval) {
    lastBinLevelUpdate = currentMillis;
    updateBinFillLevels();
  }*/
  updateBinFillLevels();

   
  delay(100);

  // Check for reset command
  checkResetCommand();

  // Check if Capacitive Sensor detects an object and operate actuator
  Serial.print(" Distance Object ");
  Serial.println(distance_OBJ);

  if (distance_OBJ < noObjectDistance && distance_OBJ > detectionThreshold && !isOperating) {
    Serial.println("Object Detected! Starting actuator cycle...");
    operateActuator();
  }

  delay(2000); // Wait before next reading

 

}

void checkResetCommand() {
  if (Firebase.RTDB.getBool(&fbdo, "/ResetCount")) {
    if (fbdo.boolData() == true) {
      Serial.println("Reset command received!");
      crushCount = 0;
      plasticBottleCount = 0;
      aluminumCanCount = 0;
      updateCrushCount();
      updatePlasticAndAluminumCounts();
      
      // Ensure the flag is set back to false
      if (Firebase.RTDB.setBool(&fbdo, "/ResetCount", false)) {
        Serial.println("Reset flag cleared");
      } else {
        Serial.println("Failed to clear reset flag");
        Serial.println(fbdo.errorReason());
      }
    }
  }
}

void updateFirebase(String status) {
  if (Firebase.RTDB.setString(&fbdo, "/ActuatorStatus", status)) {
    Serial.println("Firebase updated: " + status);
  } else {
    Serial.println("Failed to update Firebase - " + status);
    Serial.println(fbdo.errorReason());
  }
}

void updateCrushCount() {
  if (Firebase.RTDB.setInt(&fbdo, "/CrushCount", crushCount)) {
    Serial.print("Crush count updated: ");
    Serial.println(crushCount);
  } else {
    Serial.println("Failed to update crush count");
    Serial.println(fbdo.errorReason());
  }
}

void updatePlasticAndAluminumCounts() {
  // Update plastic bottle count in Firebase
  if (Firebase.RTDB.setInt(&fbdo, "/PlasticBottleCount", plasticBottleCount)) {
    Serial.print("Plastic Bottle count updated: ");
    Serial.println(plasticBottleCount);
  } else {
    Serial.println("Failed to update plastic bottle count");
    Serial.println(fbdo.errorReason());
  }
  
  // Update aluminum can count in Firebase
  if (Firebase.RTDB.setInt(&fbdo, "/AluminumCanCount", aluminumCanCount)) {
    Serial.print("Aluminum Can count updated: ");
    Serial.println(aluminumCanCount);
  } else {
    Serial.println("Failed to update aluminum can count");
    Serial.println(fbdo.errorReason());
  }
}

void operateActuator() {
  isOperating = true;

  // Read Sensors
  bool irDetected = digitalRead(IR_SENSOR_PIN);
  

  // Servo Control based on IR Sensor
  if (irDetected) {
    myServo.write(90); 
    aluminumCanCount++;
    Serial.println("Servo moved to 85 degrees (object detected)");
  } else {
    myServo.write(25);  
    plasticBottleCount++;
    Serial.println("Servo moved to 25 degrees (no object detected)");
  }
  updatePlasticAndAluminumCounts();


  delay(2000);

  // Start extending
  updateFirebase("Extending");

  // Simulate gradual extension
  for (int i = 0; i < 30; i++) {
    delay(1000);
    Serial.print("Extending: ");
    Serial.print((i + 1) * 100 / 30);
    Serial.println("%");
  }

  Serial.println("Extending actuator...");
  digitalWrite(RELAY1_PIN, LOW);
  delay(DELAY_TIME);
  digitalWrite(RELAY1_PIN, HIGH);
  crushCount++;
  updateCrushCount();
  Serial.println("Actuator fully extended.");
  updateFirebase("Extended");

  delay(2000);

  // Start retracting
  updateFirebase("Retracting");

  // Simulate gradual retraction
  for (int i = 0; i < 30; i++) {
    delay(1000);
    Serial.print("Retracting: ");
    Serial.print((i + 1) * 100 / 30);
    Serial.println("%");
  }
  Serial.println("Retracting actuator...");
  digitalWrite(RELAY2_PIN, LOW);
  delay(DELAY_TIME);
  digitalWrite(RELAY2_PIN, HIGH);
  updateFirebase("Retracted");
  Serial.println("Actuator fully retracted.");
  delay(2000);

  isOperating = false;
}


