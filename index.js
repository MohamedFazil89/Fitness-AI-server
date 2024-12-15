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
const jwt = require('jsonwebtoken');

env.config();

let tempID = null;

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
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
  passReqToCallback: true // This allows passing the `req` object to the callback function

},
  (req, accessToken, refreshToken, profile, done) => {
    const email = profile.emails && profile.emails.length ? profile.emails[0].value : null;
    console.log("Google Profile ID:", profile.id);
    console.log("Google Profile Email:", email);

    // DB add
    FireStore(email, req)
    // db end



    done(null, { id: profile.id, email: email });

  }));


var Status = false;

const FireStore = async (email, req) => {
  const snapshot = await db.collection("users").get();
  const count = snapshot.size;

  const userSnapshot = await db.collection("users").where("email", "==", email).get();

  if (!userSnapshot.empty) {
    const userData = userSnapshot.docs[0].data();
    if ('birth' in userData) {
      console.log("Birth information exists:", userData.birth);
      Status = true;

    } else {
      console.log("Birth information does not exist.");
      Status = false;

    }
    console.log("Email already exist!");

  } else {

    const newUserRef = db.collection("users").doc(String(count + 1));

    await newUserRef.set({
      email: email,
      AddedAt: admin.firestore.FieldValue.serverTimestamp(),
      isOAuth: true
    });
  }
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

    const userDoc = await newUserRef.set({
      email: email,
      password: hashedPassword,
      AddedAt: admin.firestore.FieldValue.serverTimestamp(),
      isOAuth: false
    });
    console.log("doc is created",userDoc.id);
    // localStorage.setItem("TempDoc", userDoc.id);
    // tempID = userDoc.id;
    req.session.tempID = userDoc.id;
    
    console.log("User added successfully with custom ID:", count + 1);
    res.status(200).send("User added successfully.");

  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).send("Error adding user: " + error.message);
  }
});


// Middleware to get user info from the Authorization header
// const getUserInfo = (req, res, next) => {
//   const authHeader = req.headers.authorization;


//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "Authentication token required" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {

//     const decoded = jwt.verify(token, "SecretKey");
//     req.user = decoded;
//     next();
//   } catch (err) {
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

// create chat function

// const CreateChat = async (id, users, messages) =>{
//   const chatRef = db.collection("chats").doc(id).get()
//   if(chatRef.exists){
//     console.log("chat already exists")
//     return;
//   }
//   try{
//     db.collection("chats").doc(`chat${id}`).set({
//       users,
//       messages,
//       AddedAt: admin.firestore.FieldValue.serverTimestamp(),
//     })
//     console.log("chat created");
    
//   }catch{
//     console.log("Error creating chat")
//   }
// }
 
// end chat function


// Usage in a route
app.get("/CurrentUserInfo", (req, res) => {
  // const chats = db.collection("chats").doc(req.body.chatID).get();
  
const chatid = 2
const users = [{ user1: "user1", user2: "user2"}]
const messages = [
  { role: "sender", message: "Hi! how are you"},
  { role: "receiver", message: "I'm good, thanks"},
  { role: "sender", message: "I'm excited to see where we'll go"},
  { role: "receiver", message: "Let's go to the park tomorrow"},
  { role: "sender", message: "Great, I'm on my way"}
]
CreateChat(chatid, users, messages);

const content = db.collection("chats").doc(`chat${chatid}`).get();
res.json(content);



  // res.json({
  //   oppositeUser: "John Doe",
  //   messages: [
  //     { role: "receiver", message: "Hey, are we still on for tomorrow?" },
  //     { role: "sender", message: "Yes, 5 PM works perfectly!" },
  //   ],
  //   isFollowing: false,
  // });


});



app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:3000' }),
  async (req, res) => {
    const email = req.user.email;
    const userSnapshot = await db.collection("users").where("email", "==", email).get();
    const userData = userSnapshot.docs[0].data();
    const status = 'birth' in userData;
    console.log("birth", status);
    status ? res.redirect('http://localhost:3000/dashboard') : res.redirect("http://localhost:3000/dob")

  }
);


app.post("/getStatus", (req, res) => {
  const { Status } = req.body;
  // console.log("::", Status);



  if (Status !== undefined) {
    console.log("Status set in session:", req.session.Status);
    res.status(200).send("Status set in session.");
  } else {
    res.status(400).send("Status not provided.");
  }
});



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
        const token = jwt.sign({ email: userData.email }, "SecretKey", { expiresIn: "1h" });
        console.log(token);



        return res.status(200).json({ message: "Login successful.", token });

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
    const userName = await db.collection("users").where("username", "==", username).get();



    if (userSnapshot.empty) {
      return res.status(404).send("User not found.");
      console.log("user name not found");
      
    }
    if (!userName.empty) {
      console.log("username already exist");
      return res.status(400).send("Username already exists.");
      
    }

    const userDoc = userSnapshot.docs[0].ref;
    const snopshotSize = (await db.collection("users").get()).size
    const ID = snopshotSize;
    console.log(snopshotSize);
    
    const tempDoc = db.collection("users").doc(String(ID)).get();
    
    // const userID = userSnapshot.docs[0].id;
    // await db.collection("users").doc(userID).update({
    //   id: username
    // })
    // console.log(userDoc, "this is the id var", "-->", userDocs);
    
    const data = (await tempDoc).data();

    await db.collection("users").doc(username).set({
      ...data,
      username: username,
      gender: Gender,
      birth: { day, month, year }
    });
    await db.collection("users").doc(String(ID)).delete();

    res.status(200).send("Birth information updated successfully.");
  } catch (error) {
    console.error("Error updating birth information:", error);
    res.status(500).send("Error updating birth information: " + error.message);
  }
});







app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 