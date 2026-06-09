function toggleMenu() {
  const navLinks = document.getElementById("navLinks");
  navLinks.classList.toggle("active");
}

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
  window.location.href = "thankyou.html";
}, 1000);
    })
    .catch(() => {
      message.style.color = "red";
      message.innerHTML = "Something went wrong. Try again.";
    });
  });
}