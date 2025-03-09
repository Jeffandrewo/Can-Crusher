#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <WebServer.h>
#include <LittleFS.h>
#include "FS.h"
#include <ESP32Servo.h>


//#define WIFI_SSID "AN5506-04-FA_04d60"
//#define WIFI_PASSWORD "727fb29f"
#define WIFI_SSID "OPPO A55"
#define WIFI_PASSWORD "Irregular4899030"
//#define WIFI_SSID "Ambot"
//#define WIFI_PASSWORD "314159265"

#define API_KEY "AIzaSyB9WEKy2RsQmrimD2AW_2lhpAfjGzix878"


#define DATABASE_URL "https://toggle-6ce93-default-rtdb.firebaseio.com" 


#define USER_EMAIL "skydoes01@gmail.com"
#define USER_PASSWORD "Irregular4899030"

// Ultrasonic Sensor Pins
#define TRIG_PIN_1 33   // GPIO4 (D4) - Sensor 1 Trigger
#define ECHO_PIN_1 25   // GPIO5 (D5) - Sensor 1 Echo
#define TRIG_PIN_2 32  // GPIO18 (D18) - Sensor 2 Trigger
#define ECHO_PIN_2 35  // GPIO19 (D19) - Sensor 2 Echo
#define TRIG_PIN_OBJ 22  // GPIO18 (D18) - Sensor 2 Trigger
#define ECHO_PIN_OBJ 23  // GPIO19 (D19) - Sensor 2 Echo

#define BIN_HEIGHT 25.4  // Bin height in cm (10 inches)

// Actuator & Sensor Pins
#define RELAY1_PIN 19     // Extension relay
#define RELAY2_PIN 26     // Retraction relay
#define IR_SENSOR_PIN 27  // IR sensor



#define DELAY_TIME 30000  // Time for full extension/retraction in milliseconds
bool isOperating = false; // Flag to track actuator operation

float detectionThreshold = 0.0;  // Adjust based on object distance (cm)
float noObjectDistance = 5.0;     // Distance when no object is present
int crushCount = 0; // Counter for number of crushes

// Variables to store bin fill levels
float binFillLevel1 = 0.0;
float binFillLevel2 = 0.0;
float averageFillLevel = 0.0;

// Time variables for periodic updates
unsigned long lastBinLevelUpdate = 0;
const long binUpdateInterval = 5000; // Update bin levels every 5 seconds

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
  myServo.attach(18);
  myServo.write(135);  // Default position

  // Ensure relays are off initially
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);

  // Initialize LittleFS
  if(!LittleFS.begin(true)) {
    Serial.println("An error occurred while mounting LittleFS");
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();
  
  config.api_key = API_KEY;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.database_url = DATABASE_URL;

  
  Firebase.reconnectNetwork(true);
 

  Firebase.begin(&config, &auth);

  // Debug: List all files in LittleFS
  File root = LittleFS.open("/");
  if(!root) {
    Serial.println("ERROR: Failed to open root directory");
    return;
  }

  Serial.println("\n=== Files in LittleFS ===");
  File file = root.openNextFile();
  while(file) {
    String fileName = file.name();
    size_t fileSize = file.size();
    Serial.printf("File: %s, Size: %d bytes\n", fileName.c_str(), fileSize);
    file.close();
    file = root.openNextFile();
  }
  root.close();

  server.on("/", HTTP_GET, []() {
    Serial.println("Handling root (/) request");
    
    if(!LittleFS.exists("/index.html")) {
      Serial.println("ERROR: index.html not found in LittleFS");
      server.send(404, "text/plain", "index.html not found");
      return;
    }
    
    File file = LittleFS.open("/index.html", "r");
    if(!file) {
      Serial.println("ERROR: Failed to open index.html");
      server.send(500, "text/plain", "Failed to open index.html");
      return;
    }
    
    Serial.printf("Serving index.html (size: %d bytes)\n", file.size());
    server.streamFile(file, "text/html");
    file.close();
  });

  // Handle 404
  server.onNotFound([]() {
    server.send(404, "text/plain", "404: Not found");
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

  // Initialize bin fill levels
  updateBinFillLevels();

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

  // Calculate fill levels as percentages
  binFillLevel1 = (distance1 < BIN_HEIGHT) ? ((BIN_HEIGHT - distance1) / BIN_HEIGHT) * 100 : 0;
  binFillLevel2 = (distance2 < BIN_HEIGHT) ? ((BIN_HEIGHT - distance2) / BIN_HEIGHT) * 100 : 0;
  
  // Calculate average fill level
  averageFillLevel = (binFillLevel1 + binFillLevel2) / 2.0;

  // Constrain values to 0-100% range
  binFillLevel1 = constrain(binFillLevel1, 0, 100);
  binFillLevel2 = constrain(binFillLevel2, 0, 100);
  averageFillLevel = constrain(averageFillLevel, 0, 100);

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
  unsigned long currentMillis = millis();
  if (currentMillis - lastBinLevelUpdate >= binUpdateInterval) {
    lastBinLevelUpdate = currentMillis;
    updateBinFillLevels();
  }

  // Read Sensors
  bool irDetected = digitalRead(IR_SENSOR_PIN);
  

  // Servo Control based on IR Sensor
  if (irDetected) {
    myServo.write(135); // No object detected
    Serial.println("Servo moved to 135 degrees (no object detected)");
  } else {
    myServo.write(90);  // Object detected
    Serial.println("Servo moved to 90 degrees (object detected)");
  }

  delay(100);

  // Check for reset command
  checkResetCommand();

  // Check if Capacitive Sensor detects an object and operate actuator
  Serial.println(distance_OBJ);

  if (distance_OBJ < noObjectDistance > detectionThreshold && !isOperating) {
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
      updateCrushCount();
      
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



void operateActuator() {
  isOperating = true;

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

