#include <WiFi.h>
#include <Firebase_ESP_Client.h>

/* 1. Define the WiFi credentials */
#define WIFI_SSID "AN5506-04-FA_04d60"
#define WIFI_PASSWORD "727fb29f"
//#define WIFI_SSID "OPPO A55"
//#define WIFI_PASSWORD "Irregular4899030"

/* 2. Define the API Key */
#define API_KEY "AIzaSyB9WEKy2RsQmrimD2AW_2lhpAfjGzix878"

/* 3. Define the RTDB URL */
#define DATABASE_URL "https://toggle-6ce93-default-rtdb.firebaseio.com" 

/* 4. Define the user Email and password that alreadey registerd or added in your project */
#define USER_EMAIL "skydoes01@gmail.com"
#define USER_PASSWORD "Irregular4899030"

// Pin Definitions
#define RELAY1_PIN 25  // GPIO pin for relay 1 (extension)
#define RELAY2_PIN 26  // GPIO pin for relay 2 (retraction)
#define IR_SENSOR_PIN 27  // GPIO pin for the IR sensor
#define DELAY_TIME 30000  // Time for full extension/retraction in milliseconds

#define ECHO_PIN 18  // Ultrasonic sensor Echo pin
#define TRIG_PIN 5  // Ultrasonic sensor Trigger pin
#define BIN_HEIGHT 11


// Define Firebase Data object
FirebaseData fbdo;

FirebaseAuth auth;
FirebaseConfig config;

bool isOperating = false;  // Flag to indicate if the actuator is in operation

unsigned long lastUltrasonicReading = 0;
const unsigned long ULTRASONIC_INTERVAL = 1000; // Read every second
int crushCount = 0; // Counter for number of crushes

void setup()
{
   // Initialize serial communication
  Serial.begin(115200);

  // Set pin modes
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);

  // Ensure relays are off initially
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
   
  // Ensure trigger pin starts LOW
  digitalWrite(TRIG_PIN, LOW);
  

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

  /* Assign the api key (required) */
  config.api_key = API_KEY;

  /* Assign the user sign in credentials */
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  /* Assign the RTDB URL (required) */
  config.database_url = DATABASE_URL;

  // Comment or pass false value when WiFi reconnection will control by your code or third party library e.g. WiFiManager
  Firebase.reconnectNetwork(true);

 

  Firebase.begin(&config, &auth);

  // Initialize crush count from Firebase
  if (Firebase.RTDB.getInt(&fbdo, "/CrushCount")) {
    crushCount = fbdo.intData();
  } else {
    // If no count exists, initialize to 0
    Firebase.RTDB.setInt(&fbdo, "/CrushCount", 0);
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

float getBinPercentage() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  
  // Add debug prints
  Serial.print("Duration: ");
  Serial.println(duration);
  
  float distance = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.println(distance);
  
  if (distance >= BIN_HEIGHT || distance <= 0) {
    Serial.println("Distance out of range!");
    return (distance >= BIN_HEIGHT) ? 0 : 100;
  }
  
  float fillPercentage = (1 - (distance / BIN_HEIGHT)) * 100;
  Serial.print("Fill percentage: ");
  Serial.println(fillPercentage);
  
  return fillPercentage;
}

void updateBinStatus() {
  float fillPercentage = getBinPercentage();
  
  // Update Firebase with bin fill percentage
  if (Firebase.RTDB.setFloat(&fbdo, "/BinFillLevel", fillPercentage)) {
    Serial.print("Bin fill level updated: ");
    Serial.print(fillPercentage);
    Serial.println("%");
  } else {
    Serial.println("Failed to update bin fill level");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {
  bool irDetected = digitalRead(IR_SENSOR_PIN);
  
  if (!irDetected && !isOperating) {
    Serial.println("IR sensor triggered. Starting actuator cycle...");
    operateActuator();
  }

   // Check for reset command from Firebase
  if (Firebase.RTDB.getBool(&fbdo, "/ResetCount")) {
    if (fbdo.boolData() == true) {
      crushCount = 0;
      updateCrushCount();
      Firebase.RTDB.setBool(&fbdo, "/ResetCount", false);
    }
  }
  
  unsigned long currentMillis = millis();
  if (currentMillis - lastUltrasonicReading >= ULTRASONIC_INTERVAL) {
    lastUltrasonicReading = currentMillis;
    updateBinStatus();
  }
}

void operateActuator() {
  isOperating = true;

  // Start extending
  updateFirebase("Extending");
  Serial.println("Extending actuator...");
  digitalWrite(RELAY1_PIN, LOW);
  
  // Simulate gradual extension
  for (int i = 0; i < 30; i++) {
    delay(1000);
    Serial.print("Extending: ");
    Serial.print((i + 1) * 100 / 30);
    Serial.println("%");
  }

  // Fully extended
  digitalWrite(RELAY1_PIN, HIGH);
  crushCount++;
  updateCrushCount();
  Serial.println("Actuator fully extended.");
  updateFirebase("Extended");

  // Wait for a moment
  delay(2000);

 // Start retracting
  updateFirebase("Retracting");
  Serial.println("Retracting actuator...");
  digitalWrite(RELAY2_PIN, LOW);
  
  // Simulate gradual retraction
  for (int i = 0; i < 30; i++) {
    delay(1000);
    Serial.print("Retracting: ");
    Serial.print((i + 1) * 100 / 30);
    Serial.println("%");
  }

  // Fully retracted
  digitalWrite(RELAY2_PIN, HIGH);
  Serial.println("Actuator fully retracted.");
  updateFirebase("Retracted");

  // Wait for a moment
  delay(2000);

  isOperating = false;
}