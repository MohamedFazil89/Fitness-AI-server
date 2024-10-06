var express = require("express");
var admin = require("firebase-admin");
var cors = require("cors");
var app = express();
var port = 3001;
const bcrypt = require("bcrypt");
const passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

// cookiee

app.use(session({
  secret: 'SecretKey',
  resave: false, 
  saveUninitialized: false,
  cookie: { secure: false } 
}));


// cookiee end 



// google auth - start

// Google OAuth setup
passport.use(new GoogleStrategy({
  clientID: '274164021188-0os7tfjuhttv080jvh6noe6fnn4k3ll0.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: '/auth/google/callback'
},
(accessToken, refreshToken, profile, done) => {
  // Here you would save the profile info (id, name, etc.) to your database
  done(null, profile);
}
));

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// google oauth - end

var serviceAccount = require("./ServiceAccount.json");

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

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

// auth

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:3000' }),
  (req, res) => {
    res.redirect('http://localhost:3000');
  }
);
// auth end

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


app.post("/BirthPost", async (req, res) => {
  const { email, username, Gender, birth } = req.body;
  // console.log(email, username, Gender, birth);
  

  if (!email || !username || !Gender || !birth) {
    return res.status(400).send("Email, username, gender, and birth date are required.");
  }

  try {
    // Find the user document by email
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).send("User not found.");
    }

    // Assuming email is unique, we can update the first found document
    const userDoc = userSnapshot.docs[0].ref;

    // Update the user document with the new birth date
    await userDoc.update({
      username: username,
      gender: Gender,
      birth: {
        day: birth.day,
        month: birth.month,
        year: birth.year
      }
    });
    
    console.log("Birth information updated successfully");
    res.status(200).send("Birth information updated successfully.");
  } catch (error) {
    console.error("Error updating birth information:", error);
    res.status(500).send("Error updating birth information: " + error.message);
  }
});






app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 