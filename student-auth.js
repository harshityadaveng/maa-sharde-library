import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyBgfZsyssHftEO_YuyQ6O628rHAYZ8agL0",
  authDomain: "maa-sharde-digital-library.firebaseapp.com",
  projectId: "maa-sharde-digital-library",
  storageBucket: "maa-sharde-digital-library.firebasestorage.app",
  messagingSenderId: "125895569415",
  appId: "1:125895569415:web:5da780c6ed7364af2c3aa2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Signup */
const signupBtn = document.getElementById("signupBtn");

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      message.style.color = "green";
      message.innerHTML = "Account created successfully!";
      window.location.href = "student-dashboard.html";
    } catch (error) {
      message.style.color = "red";
      message.innerHTML = error.message;
    }
  });
}

/* Login */
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "student-dashboard.html";
    } catch (error) {
      message.style.color = "red";
      message.innerHTML = "Invalid email or password.";
    }
  });
}

/* Booking Request */
const requestBtn = document.getElementById("requestBtn");

if (requestBtn) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "student-login.html";
    }
  });

  requestBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    const message = document.getElementById("requestMessage");

    const data = {
      studentName: document.getElementById("studentName").value,
      phone: document.getElementById("phone").value,
      seatNo: Number(document.getElementById("seatNo").value),
      shift: document.getElementById("shift").value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value,
      email: user.email,
      status: "pending",
      createdAt: serverTimestamp()
    };

    if (!data.studentName || !data.phone || !data.seatNo || !data.shift || !data.startDate || !data.endDate) {
      message.style.color = "red";
      message.innerHTML = "Please fill all details.";
      return;
    }

    try {
      await addDoc(collection(db, "bookingRequests"), data);

      message.style.color = "green";
      message.innerHTML = "Booking request sent. Wait for admin approval.";
    } catch (error) {
      message.style.color = "red";
      message.innerHTML = "Something went wrong.";
    }
  });
}
const seatNoValue = Number(seatNo);

const sameSeatQuery = query(
  collection(db, "bookingRequests"),
  where("seatNo", "==", seatNoValue),
  where("status", "in", ["pending", "approved"])
);

const sameSeatSnapshot = await getDocs(sameSeatQuery);

if (!sameSeatSnapshot.empty) {
  alert("This seat already has an active booking request.");
  return;
}

const sameStudentQuery = query(
  collection(db, "bookingRequests"),
  where("email", "==", currentUser.email),
  where("status", "in", ["pending", "approved"])
);

const sameStudentSnapshot = await getDocs(sameStudentQuery);

if (!sameStudentSnapshot.empty) {
  alert("You already have an active booking request.");
  return;
}

/* Logout */
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "student-login.html";
  });
}