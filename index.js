var express = require("express");
var admin = require("firebase-admin");
var cors = require("cors");
var app = express();
var port = 3001;
const bcrypt = require("bcrypt");

var serviceAccount = require("./projects/serviceaccount.json");

app.use(cors({ origin: "*" }));
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://aifitnessapplication-default-rtdb.firebaseio.com",
});

var db = admin.firestore();

app.post("/addUser", async (req, res) => {
  const { email, password, username, Gender } = req.body;
  console.log(email, password, username, Gender);
  

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  

  try {
    let userRef = db.collection("users");
    await userRef.add({
      email: email,
      password: hashedPassword, 
    });

    res.status(200).send("User added successfully.");
  } catch (error) {
    res.status(400).send("Error adding user: " + error.message);
  }
});

// Login route


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).send("User not found.");
    }

    // Assuming that emails are unique, we can safely use the first document.
    const userData = userSnapshot.docs[0].data();

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (isPasswordCorrect) {
      return res.status(200).send("Login successful.");
    } else {
      return res.status(401).send("Invalid password.");
    }
  } catch (error) {
    res.status(500).send("Error logging in: " + error.message);
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
