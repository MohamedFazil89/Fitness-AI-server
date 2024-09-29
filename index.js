import express from "express";
import bodyParser from "body-parser";
import firebaseAdmin from "firebase-admin";
import fs from "fs";
import cors from "cors";
import bcrypt from "bcrypt";

const serviceAccount = JSON.parse(fs.readFileSync("./aifitnessapplication-firebase-adminsdk-warn3-7ad05e83a1.json", 'utf8'));

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://aifitnessapplication-default-rtdb.firebaseio.com"
});
const db = firebaseAdmin.firestore();
const app = express();


app.use(cors());
app.use(bodyParser.json());

app.post('/addUser', async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  

  if (!password || !email) {
    return res.status(400).send({ error: 'All fields (password, email) are required.' });
  }

  try {
    const existingUserSnapshot = await db.collection('users').where('email', '==', email).get();

    if (!existingUserSnapshot.empty) {
      return res.status(400).send({ error: 'Email already exists. Please Login' });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userRef = db.collection('users');
      await userRef.add({
        email,
        password: hashedPassword
      });

      res.status(201).send({ message: 'User added successfully!' });
    }

  } catch (error) {
    console.error('Error adding user: ', error);
    res.status(500).send({ error: 'Error adding user.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: 'Email and password are required.' });
  }

  try {
    const userSnapshot = await db.collection('users').where('email', '==', email).get();

    if (userSnapshot.empty) {
      return res.status(404).send({ error: 'User not found.' });
    }

    const userData = userSnapshot.docs[0].data();

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (isPasswordCorrect) {
      return res.status(200).send({ message: 'Login successful!' });
    } else {
      return res.status(401).send({ error: 'Invalid password.' });
    }
  } catch (error) {
    console.error('Error logging in: ', error);
    res.status(500).send({ error: 'Error logging in.' });
  }
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
