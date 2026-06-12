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