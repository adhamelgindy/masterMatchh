// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB2ozuASNd3uW8EIs1ML8K8MnQzjh_3tHo",
    authDomain: "mastermatch-backend.firebaseapp.com",
    databaseURL: "https://mastermatch-backend-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mastermatch-backend",
    storageBucket: "mastermatch-backend.firebasestorage.app",
    messagingSenderId: "423800682768",
    appId: "1:423800682768:web:b13b6af7a336b0f9d1cd95",
    measurementId: "G-ECNPH4LS1Z"
};

// Initialize Firebase
const analytics = getAnalytics(app);

// ✅ Step 2: Initialize the app *before* using it
const app = initializeApp(firebaseConfig)

// ✅ Step 3: Now get the Firestore instance
const db = getFirestore(app)

export { db }