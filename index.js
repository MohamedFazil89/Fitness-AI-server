var express = require("express");
var admin = require("firebase-admin");
var cors = require("cors");
var app = express();
var port = 3001;
const bcrypt = require("bcrypt");

var serviceAccount = require("./Service-account.json");

app.use(cors({ origin: "*" }));
app.use(express.json());


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aifitnessapplication-default-rtdb.firebaseio.com"
});

var db = admin.firestore();
app.post("/addUser", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    let userRef = db.collection("users");
    await userRef.add({
      email: email,
      password: hashedPassword,
    });

    console.log("User added successfully");
    res.status(200).send("User added successfully.");
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(400).send("Error adding user: " + error.message);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    // Handle case if no user is found
    if (userSnapshot.empty) {
      return res.status(404).send("User not found.");
    }

    let userFound = false;

    // Use a `for...of` loop to await `bcrypt.compare()` properly
    for (let doc of userSnapshot.docs) {
      const userData = doc.data();

      // Compare password
      const isPasswordCorrect = await bcrypt.compare(password, userData.password);
      if (isPasswordCorrect) {
        userFound = true;
        return res.status(200).send("Login successful.");
      }
    }

    // If no valid user is found after iterating
    if (!userFound) {
      return res.status(401).send("Invalid password.");
    }

  } catch (error) {
    res.status(500).send("Error logging in: " + error.message);
    console.error(error.message);
  }
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 