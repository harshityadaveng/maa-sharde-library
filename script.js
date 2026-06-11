import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot
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
const db = getFirestore(app);
function toggleMenu() {
  const navLinks = document.getElementById("navLinks");

  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

window.toggleMenu = toggleMenu;

const darkBtn = document.getElementById("darkModeBtn");

if (darkBtn) {
  darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
      darkBtn.innerHTML = "☀️";
    } else {
      darkBtn.innerHTML = "🌙";
    }
  });
}

const bookingForm = document.querySelector(".booking-form");

if (bookingForm) {
  bookingForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const plan = document.getElementById("plan").value;
    const message = document.getElementById("formMessage");

    if (name === "" || phone === "" || plan === "") {
      message.style.color = "red";
      message.innerHTML = "Please fill all details.";
    } else {
      message.style.color = "green";
      message.innerHTML = "Thank you! We will contact you soon.";
      bookingForm.reset();
    }
  });
}

const studentRegisterForm = document.getElementById("studentRegisterForm");

if (studentRegisterForm) {
  studentRegisterForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const message = document.getElementById("registerMessage");

    const data = {
      name: document.getElementById("studentName").value,
      phone: document.getElementById("studentPhone").value,
      email: document.getElementById("studentEmail").value,
      address: document.getElementById("studentAddress").value,
      plan: document.getElementById("studentPlan").value,
      shift: document.getElementById("studentShift").value
    };

    if (
      data.name === "" ||
      data.phone === "" ||
      data.email === "" ||
      data.address === "" ||
      data.plan === "" ||
      data.shift === ""
    ) {
      message.style.color = "red";
      message.innerHTML = "Please fill all details.";
      return;
    }

    message.style.color = "orange";
    message.innerHTML = "Submitting...";

    fetch("https://script.google.com/macros/s/AKfycbzAEVk939pHCWbkmHVpFEyFWPQK4eH7OdZsu0WTorwJ0uleHfsbxPd2Lh0jjd72wOqt/exec", {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data)
    })
    .then(() => {
      message.style.color = "green";
      message.innerHTML = "Registration submitted successfully!";
studentRegisterForm.reset();

setTimeout(() => {
  window.location.href = "payment.html";
}, 1000);
    })
    .catch(() => {
      message.style.color = "red";
      message.innerHTML = "Something went wrong. Try again.";
    });
  });
}
const liveSeatGrid = document.getElementById("liveSeatGrid");

if (liveSeatGrid) {
  onSnapshot(collection(db, "seats"), (snapshot) => {
    liveSeatGrid.innerHTML = "";

    const seatsData = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      seatsData[data.seatNo] = data;
    });

    for (let i = 1; i <= 100; i++) {
      const seatData = seatsData[i];

      let status = "Available";
      let studentName = "";
      let endDate = "";

      if (seatData) {
        status = seatData.status || "Available";
        studentName = seatData.studentName || "";
        endDate = seatData.endDate || "";
      }

      const today = new Date().toISOString().split("T")[0];

      if (endDate && endDate < today && status !== "Available") {
        status = "Expired";
      }

      const seat = document.createElement("div");
      seat.classList.add("live-seat", status.toLowerCase());

      seat.innerHTML = `
  <span>${i}</span>
  <small>${status}</small>
`;

      seat.addEventListener("click", () => {
        if (status === "Available") {
          alert(`Seat ${i} is available.`);
        } else {
          alert(
            `Seat ${i}\nStatus: ${status}\nStudent: ${studentName || "N/A"}\nEnd Date: ${endDate || "N/A"}`
          );
        }
      });

      liveSeatGrid.appendChild(seat);
    }
  });
}