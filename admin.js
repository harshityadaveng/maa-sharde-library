import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
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

const seatAllotForm = document.getElementById("seatAllotForm");
const adminMessage = document.getElementById("adminMessage");

seatAllotForm.addEventListener ("submit", async function(e) {
  e.preventDefault();

  const seatNo = document.getElementById("seatNo").value;
  const studentName = document.getElementById("studentName").value;
  const studentPhone = document.getElementById("studentPhone").value;
  const shift = document.getElementById("shift").value;
  const status = document.getElementById("status").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!seatNo || !studentName || !studentPhone || !shift || !status || !startDate || !endDate) {
    adminMessage.style.color = "red";
    adminMessage.innerHTML = "Please fill all details.";
    return;
  }

  try {

  const seatRef = doc(db, "seats", `seat${seatNo}`);
  const seatSnap = await getDoc(seatRef);

  if (seatSnap.exists()) {
    const oldData = seatSnap.data();

    if (
      oldData.status === "Occupied" ||
      oldData.status === "Reserved"
    ) {
      adminMessage.style.color = "red";
      adminMessage.innerHTML =
        `Seat ${seatNo} is already ${oldData.status}.`;

      return;
    }
  }

  await setDoc(seatRef, {
    seatNo: Number(seatNo),
    studentName: studentName,
    phone: studentPhone,
    shift: shift,
    status: status,
    startDate: startDate,
    endDate: endDate
  });

  adminMessage.style.color = "green";
  adminMessage.innerHTML =
    `Seat ${seatNo} saved successfully!`;

  seatAllotForm.reset();

} catch (error) {
  adminMessage.style.color = "red";
  adminMessage.innerHTML = "Something went wrong.";
  console.log(error);
}
});

const bookingRequestsList = document.getElementById("bookingRequestsList");

function loadBookingRequests() {
  const requestsRef = collection(db, "bookingRequests");

  onSnapshot(requestsRef, (snapshot) => {
    bookingRequestsList.innerHTML = "";

    let hasPending = false;

    snapshot.forEach((docSnap) => {
      const request = docSnap.data();
      const requestId = docSnap.id;

      if (request.status !== "pending") return;

      hasPending = true;

      const card = document.createElement("div");
      card.className = "request-card";

      card.innerHTML = `
        <h3>${request.studentName}</h3>
        <p><strong>Phone:</strong> ${request.phone}</p>
        <p><strong>Email:</strong> ${request.email}</p>
        <p><strong>Seat No:</strong> ${request.seatNo}</p>
        <p><strong>Shift:</strong> ${request.shift}</p>
        <p><strong>Start Date:</strong> ${request.startDate}</p>
        <p><strong>End Date:</strong> ${request.endDate}</p>

        <button class="approve-btn" data-id="${requestId}">Approve</button>
        <button class="reject-btn" data-id="${requestId}">Reject</button>
      `;

      bookingRequestsList.appendChild(card);
    });

    if (!hasPending) {
      bookingRequestsList.innerHTML = "<p>No pending booking requests.</p>";
    }

    document.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        approveRequest(btn.dataset.id);
      });
    });

    document.querySelectorAll(".reject-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        rejectRequest(btn.dataset.id);
      });
    });
  });
}

async function approveRequest(requestId) {
  const requestRef = doc(db, "bookingRequests", requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    alert("Request not found");
    return;
  }

  const request = requestSnap.data();
  const seatId = `seat${request.seatNo}`;
  const seatRef = doc(db, "seats", seatId);
  const seatSnap = await getDoc(seatRef);

  if (seatSnap.exists()) {
    const seatData = seatSnap.data();

    if (seatData.status === "Occupied" || seatData.status === "Reserved") {
      alert("This seat is already allotted.");
      return;
    }
  }

  await setDoc(seatRef, {
    seatNo: Number(request.seatNo),
    studentName: request.studentName,
    phone: request.phone,
    shift: request.shift,
    status: "Occupied",
    startDate: request.startDate,
    endDate: request.endDate,
    email: request.email,
    updatedAt: serverTimestamp()
  });

  await updateDoc(requestRef, {
    status: "approved",
    approvedAt: serverTimestamp()
  });

  alert("Booking request approved successfully.");
}

async function rejectRequest(requestId) {
  const requestRef = doc(db, "bookingRequests", requestId);

  await updateDoc(requestRef, {
    status: "rejected",
    rejectedAt: serverTimestamp()
  });

  alert("Booking request rejected.");
}

loadBookingRequests();