import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
  const bookingRequestsList = document.getElementById("bookingRequestsList");

  if (!bookingRequestsList) {
    console.error("bookingRequestsList div not found in admin.html");
    return;
  }

  const requestsRef = collection(db, "bookingRequests");

  onSnapshot(
    requestsRef,
    (snapshot) => {
      bookingRequestsList.innerHTML = "";

      if (snapshot.empty) {
        bookingRequestsList.innerHTML = "<p>No booking requests found.</p>";
        return;
      }

      let hasPending = false;

      snapshot.forEach((docSnap) => {
        const request = docSnap.data();

        console.log("Request found:", request);

        if (request.status !== "pending") return;

        hasPending = true;

        const card = document.createElement("div");
        card.className = "request-card";

        card.innerHTML = `
          <h3>${request.studentName || "No Name"}</h3>
          <p><strong>Phone:</strong> ${request.phone || "N/A"}</p>
          <p><strong>Email:</strong> ${request.email || "N/A"}</p>
          <p><strong>Seat No:</strong> ${request.seatNo || "N/A"}</p>
          <p><strong>Shift:</strong> ${request.shift || "N/A"}</p>
          <p><strong>Start Date:</strong> ${request.startDate || "N/A"}</p>
          <p><strong>End Date:</strong> ${request.endDate || "N/A"}</p>

          <button class="approve-btn" data-id="${docSnap.id}">Approve</button>
          <button class="reject-btn" data-id="${docSnap.id}">Reject</button>
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
    },
    (error) => {
      console.error("Firestore bookingRequests error:", error);
      bookingRequestsList.innerHTML = `
        <p style="color:red;">
          Error loading booking requests. Check console.
        </p>
      `;
    }
  );
}

loadBookingRequests();
console.log("Admin JS loaded successfully");
async function approveRequest(requestId) {
  try {
    console.log("Approving request:", requestId);

    const requestRef = doc(db, "bookingRequests", requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      alert("Request not found");
      return;
    }

    const request = requestSnap.data();
    const seatNo = Number(request.seatNo);

    const seatRef = doc(db, "seats", `seat${seatNo}`);

    await setDoc(seatRef, {
      seatNo: seatNo,
      studentName: request.studentName || "",
      phone: request.phone || "",
      shift: request.shift || "",
      status: "Occupied",
      startDate: request.startDate || "",
      endDate: request.endDate || "",
      email: request.email || "",
      updatedAt: serverTimestamp()
    });

    await updateDoc(requestRef, {
      status: "approved",
      approvedAt: serverTimestamp()
    });

    alert("Request approved successfully.");
  } catch (error) {
    console.error("Approve error:", error);
    alert("Approve failed. Check console.");
  }
}
async function rejectRequest(requestId) {
  try {
    const requestRef = doc(db, "bookingRequests", requestId);

    await updateDoc(requestRef, {
      status: "rejected",
      rejectedAt: serverTimestamp()
    });

    alert("Request rejected.");
  } catch (error) {
    console.error("Reject error:", error);
    alert("Reject failed. Check console.");
  }
}