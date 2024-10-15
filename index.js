var express = require("express");
var admin = require("firebase-admin");
var cors = require("cors");
var app = express();
var port = 3001;
const bcrypt = require("bcrypt");
const passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const env = require("dotenv");
env.config(); 

let Gmail = "";

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
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
(accessToken, refreshToken, profile, done) => {
  const email = profile.emails && profile.emails.length ? profile.emails[0].value : null;
  console.log("Google Profile ID:", profile.id);
  console.log("Google Profile Email:", email);
  
  // DB add
  FireStore(email)
  // db end



  done(null, { id: profile.id, email: email });
  
}));



const FireStore = async (email) => {
  const snapshot = await db.collection("users").get();
  const count = snapshot.size;

  // const hashedPassword = await bcrypt.hash(password, 10);

  const newUserRef = db.collection("users").doc(String(count + 1));

  await newUserRef.set({
    email: email,
    AddedAt: admin.firestore.FieldValue.serverTimestamp(),
    isOAuth: true
  });



}


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



// Session email
// Endpoint to get user information
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    // If the user is authenticated, send back the user's email
    res.json({ email: req.user.email });
  } else {
    // If not authenticated, send back a 401 Unauthorized response
    res.status(401).json({ message: 'Unauthorized' });
  }
});


// Session end

app.post("/addUser", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    if (!userSnapshot.empty) {
      return res.status(400).send("Email already exists.");
    }

    const snapshot = await db.collection("users").get();
    const count = snapshot.size;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserRef = db.collection("users").doc(String(count + 1));

    await newUserRef.set({
      email: email,
      password: hashedPassword,
      AddedAt: admin.firestore.FieldValue.serverTimestamp(),
      isOAuth: false
    });

    console.log("User added successfully with custom ID:", count + 1);
    res.status(200).send("User added successfully.");

  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).send("Error adding user: " + error.message);
  }
});


// auth

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:3000' }),
  (req, res) => {
    res.redirect('http://localhost:3000/dob');
    
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
  const { email, username, Gender, birth: { day, month, year } } = req.body;
  

  if (!email || !username || !Gender || !day || !month || !year) {
    return res.status(400).send("Email, username, gender, and complete birth date are required.");
  }

  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();

    if (userSnapshot.empty) {
      return res.status(404).send("User not found.");
    }

    const userDoc = userSnapshot.docs[0].ref;

    await userDoc.update({
      username: username,
      gender: Gender,
      birth: { day, month, year } 
    });

    res.status(200).send("Birth information updated successfully.");
  } catch (error) {
    console.error("Error updating birth information:", error);
    res.status(500).send("Error updating birth information: " + error.message);
  }
});







app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 