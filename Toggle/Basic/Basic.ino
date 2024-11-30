#include <WiFi.h>
#include <Firebase_ESP_Client.h>

/* 1. Define the WiFi credentials */
#define WIFI_SSID "AN5506-04-FA_04d60"
#define WIFI_PASSWORD "727fb29f"

/* 2. Define the API Key */
#define API_KEY "AIzaSyB9WEKy2RsQmrimD2AW_2lhpAfjGzix878"

/* 3. Define the RTDB URL */
#define DATABASE_URL "https://toggle-6ce93-default-rtdb.firebaseio.com" 

/* 4. Define the user Email and password that alreadey registerd or added in your project */
#define USER_EMAIL "skydoes01@gmail.com"
#define USER_PASSWORD "Irregular4899030"

// Define Firebase Data object
FirebaseData fbdo;

FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;

const int relay = 26;

void setup()
{
  pinMode(relay, OUTPUT);
  digitalWrite(relay, HIGH);  // Initially turn the relay OFF

  Serial.begin(115200);
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


}

void loop() {
  // Firebase.ready() to manage authentication

  String relayStatus;
  
  if (Firebase.RTDB.getString(&fbdo, "/RelayStatus", &relayStatus)) {
    if (relayStatus.toInt() == 1) {
      digitalWrite(relay, LOW); // Relay ON
      Serial.println("Relay ON");
    } else {
      digitalWrite(relay, HIGH); // Relay OFF
      Serial.println("Relay OFF");
    }
  } else {
    Serial.print("Error retrieving relay status: ");
    Serial.println(fbdo.errorReason().c_str());
  }
}