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

const apiBaseUrl = window.location.protocol.startsWith('http')
  ? window.location.origin
  : 'http://localhost:5000';

const studentPlanSelect = document.getElementById('studentPlan');
if (studentPlanSelect) {
  loadMembershipPlans();
}

async function loadMembershipPlans() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/plans`);
    if (!response.ok) return;
    const plans = await response.json();
    if (!plans || !plans.length) return;
    studentPlanSelect.innerHTML = '<option value="">Select Membership Plan *</option>';
    plans.forEach((plan) => {
      const option = document.createElement('option');
      option.value = plan.title;
      option.textContent = `${plan.title} (₹${plan.price})`;
      studentPlanSelect.appendChild(option);
    });
  } catch (error) {
    // fallback to built-in plan options if plans cannot load
  }
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

const proceedPaymentBtn = document.getElementById("proceedPaymentBtn");
const paymentBox = document.getElementById("paymentBox");
const paidBtn = document.getElementById("paidBtn");
const submitBtn = document.getElementById("submitBtn");
const registerMessage = document.getElementById("registerMessage");

if (proceedPaymentBtn) {
  proceedPaymentBtn.addEventListener("click", async () => {
    // 1. Gather all fields
    const name = document.getElementById("studentName").value.trim();
    const fatherName = document.getElementById("studentFatherName").value.trim();
    const motherName = document.getElementById("studentMotherName").value.trim();
    const gender = document.getElementById("studentGender").value;
    const dob = document.getElementById("studentDob").value;
    const mobile = document.getElementById("studentPhone").value.trim();
    const altMobile = document.getElementById("studentAltPhone").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const aadhaar = document.getElementById("studentAadhaar").value.trim();
    const photoInput = document.getElementById("studentPhoto");

    const state = document.getElementById("studentState").value.trim();
    const district = document.getElementById("studentDistrict").value.trim();
    const city = document.getElementById("studentCity").value.trim();
    const fullAddress = document.getElementById("studentAddress").value.trim();
    const pincode = document.getElementById("studentPincode").value.trim();

    const plan = document.getElementById("studentPlan").value;
    const joiningDate = document.getElementById("studentJoiningDate").value;
    const timing = document.getElementById("studentShift").value;

    // 2. Client-side Form Validation
    if (
      !name || !fatherName || !motherName || !gender || !dob || !mobile || !email ||
      !state || !district || !city || !fullAddress || !pincode ||
      !plan || !joiningDate || !timing
    ) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Please fill in all required (*) fields.";
      return;
    }

    if (!photoInput || photoInput.files.length === 0) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Please select a student photo for upload.";
      return;
    }

    // Phone format check
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobile)) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Mobile number must be exactly 10 digits.";
      return;
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Please enter a valid email address.";
      return;
    }

    // 3. Compile FormData
    const formData = new FormData();
    formData.append("name", name);
    formData.append("fatherName", fatherName);
    formData.append("motherName", motherName);
    formData.append("gender", gender);
    formData.append("dob", dob);
    formData.append("mobile", mobile);
    formData.append("altMobile", altMobile);
    formData.append("email", email);
    formData.append("aadhaar", aadhaar);
    formData.append("studentPhoto", photoInput.files[0]); // studentPhoto name matches multer endpoint

    formData.append("state", state);
    formData.append("district", district);
    formData.append("city", city);
    formData.append("fullAddress", fullAddress);
    formData.append("pincode", pincode);

    formData.append("plan", plan);
    formData.append("joiningDate", joiningDate);
    formData.append("timing", timing);

    registerMessage.style.color = "orange";
    registerMessage.innerHTML = "Saving registration details & uploading photo... Please wait.";

    try {
      const response = await fetch(`${apiBaseUrl}/api/students/register`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register details.");
      }

      // Save the MongoDB student ID for Step 2
      localStorage.setItem("studentDbId", data.student._id);

      registerMessage.style.color = "green";
      registerMessage.innerHTML = `Details saved (ID: ${data.student.studentId}). Please scan the QR Code below to pay, upload the screenshot, and verify.`;

      // Show Payment Verification Step
      paymentBox.style.display = "block";
      proceedPaymentBtn.style.display = "none";
    } catch (err) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = err.message || "Submission failed. Please try again.";
    }
  });
}

if (paidBtn) {
  paidBtn.addEventListener("click", async () => {
    const screenshotInput = document.getElementById("paymentScreenshot");
    if (!screenshotInput || screenshotInput.files.length === 0) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Please upload a payment screenshot.";
      return;
    }

    const studentDbId = localStorage.getItem("studentDbId");
    if (!studentDbId) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = "Registration record not found. Please reload and fill form details again.";
      return;
    }

    registerMessage.style.color = "orange";
    registerMessage.innerHTML = "Uploading payment screenshot... Please wait.";

    const formData = new FormData();
    formData.append("paymentScreenshot", screenshotInput.files[0]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/students/${studentDbId}/upload-payment`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload payment verification.");
      }

      registerMessage.style.color = "green";
      registerMessage.innerHTML = "Payment screenshot uploaded successfully! Click 'Complete Registration' to finish.";

      paidBtn.style.display = "none";
      submitBtn.style.display = "block";
    } catch (err) {
      registerMessage.style.color = "red";
      registerMessage.innerHTML = err.message || "Upload failed. Try again.";
    }
  });
}

const studentRegisterForm = document.getElementById("studentRegisterForm");

if (studentRegisterForm) {
  studentRegisterForm.addEventListener("submit", function (e) {
    e.preventDefault();

    registerMessage.style.color = "green";
    registerMessage.innerHTML = "Registration successfully submitted!";

    studentRegisterForm.reset();
    localStorage.removeItem("studentDbId"); // Clean ID storage

    setTimeout(() => {
      window.location.href = "thankyou.html";
    }, 1500);
  });
}