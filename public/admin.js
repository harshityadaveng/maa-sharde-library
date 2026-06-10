const apiBaseUrl = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:5000';
const adminTokenKey = 'adminToken';

const getAdminToken = () => localStorage.getItem(adminTokenKey);
const setAdminToken = (token) => localStorage.setItem(adminTokenKey, token);
const clearAdminToken = () => localStorage.removeItem(adminTokenKey);

const buildHeaders = (extra = {}) => {
  const headers = { ...extra };
  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && !(extra.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const fetchWithAuth = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || 'Admin request failed';
    throw new Error(message);
  }
  return response.json();
};

const initAdminLogin = () => {
  const loginForm = document.getElementById('adminLoginForm');
  if (!loginForm) return;

  if (getAdminToken()) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  const messageEl = document.getElementById('adminLoginMessage');
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!email || !password) {
      messageEl.textContent = 'Please enter both email and password.';
      messageEl.style.color = 'red';
      return;
    }

    messageEl.textContent = 'Logging in...';
    messageEl.style.color = '#0a192f';

    try {
      const data = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Login failed');
        }
        return res.json();
      });

      if (data.role !== 'admin') {
        messageEl.textContent = 'Access denied. Login with an admin account.';
        messageEl.style.color = 'red';
        return;
      }

      setAdminToken(data.token);
      window.location.href = 'admin-dashboard.html';
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.style.color = 'red';
    }
  });
};

const initAdminDashboard = () => {
  const dashboardApp = document.getElementById('adminDashboardApp');
  if (!dashboardApp) return;

  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshDashboardBtn');
  const statusText = document.getElementById('adminStatusText');

  const verifyToken = async () => {
    try {
      await fetchWithAuth('/api/auth/me');
    } catch (error) {
      clearAdminToken();
      window.location.href = 'admin-login.html';
    }
  };

  const renderStats = (stats) => {
    const statsEl = document.getElementById('dashboardStats');
    statsEl.innerHTML = `
      <div class="stat-card"><h3>Total Students</h3><p>${stats.totalStudents}</p></div>
      <div class="stat-card"><h3>Active Students</h3><p>${stats.activeStudents}</p></div>
      <div class="stat-card"><h3>Pending Admissions</h3><p>${stats.pendingAdmissions}</p></div>
      <div class="stat-card"><h3>Paid Students</h3><p>${stats.paidStudents}</p></div>
      <div class="stat-card"><h3>Total Revenue</h3><p>₹${stats.totalRevenue.toLocaleString()}</p></div>
    `;
  };

  const renderStudents = (students) => {
    const table = document.getElementById('studentsTable');
    if (!students.length) {
      table.innerHTML = '<tr><td>No students found.</td></tr>';
      return;
    }

    table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Mobile</th>
          <th>Plan</th>
          <th>Admission</th>
          <th>Payment</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${students
          .map((student) => `
            <tr>
              <td>${student.studentId || '-'}</td>
              <td>${student.name}</td>
              <td>${student.email}</td>
              <td>${student.mobile}</td>
              <td>${student.plan}</td>
              <td>${student.admissionStatus}</td>
              <td>${student.paymentStatus}</td>
              <td class="table-actions">
                <button class="btn-edit" onclick="editStudent('${student._id}')">Edit</button>
                <button class="btn-approve" onclick="setAdmissionStatus('${student._id}','approved')">Approve</button>
                <button class="btn-reject" onclick="setAdmissionStatus('${student._id}','rejected')">Reject</button>
                <button class="btn-delete" onclick="deleteStudent('${student._id}')">Delete</button>
              </td>
            </tr>
          `)
          .join('')}
      </tbody>
    `;
  };

  const renderPayments = (payments) => {
    const table = document.getElementById('paymentsTable');
    if (!payments.length) {
      table.innerHTML = '<tr><td>No payment requests found.</td></tr>';
      return;
    }

    table.innerHTML = `
      <thead>
        <tr>
          <th>Payment ID</th>
          <th>Student</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Screenshot</th>
          <th>Remarks</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${payments
          .map((payment) => `
            <tr>
              <td>${payment.paymentId}</td>
              <td>${payment.studentId?.name || 'Unknown'}</td>
              <td>₹${payment.amount}</td>
              <td>${payment.paymentStatus}</td>
              <td><a class="btn-view" target="_blank" href="${payment.paymentScreenshot}">View</a></td>
              <td>${payment.adminRemarks || '-'}</td>
              <td class="table-actions">
                <button class="btn-approve" onclick="approvePayment('${payment._id}')">Approve</button>
                <button class="btn-reject" onclick="rejectPayment('${payment._id}')">Reject</button>
              </td>
            </tr>
          `)
          .join('')}
      </tbody>
    `;
  };

  const renderPlans = (plans) => {
    const table = document.getElementById('plansTable');
    if (!plans.length) {
      table.innerHTML = '<tr><td>No membership plans available.</td></tr>';
      return;
    }
    table.innerHTML = `
      <thead>
        <tr>
          <th>Title</th>
          <th>Price</th>
          <th>Duration</th>
          <th>Description</th>
          <th>Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${plans
          .map((plan) => `
            <tr>
              <td>${plan.title}</td>
              <td>₹${plan.price}</td>
              <td>${plan.duration}</td>
              <td>${plan.description || '-'}</td>
              <td>${plan.active ? 'Yes' : 'No'}</td>
              <td class="table-actions">
                <button class="btn-edit" onclick="editPlan('${plan._id}')">Edit</button>
                <button class="btn-delete" onclick="deletePlan('${plan._id}')">Delete</button>
              </td>
            </tr>
          `)
          .join('')}
      </tbody>
    `;
  };

  const renderContacts = (contacts) => {
    const table = document.getElementById('contactsTable');
    if (!contacts.length) {
      table.innerHTML = '<tr><td>No contact messages found.</td></tr>';
      return;
    }

    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Message</th>
          <th>Received</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${contacts
          .map((message) => `
            <tr>
              <td>${message.name}</td>
              <td>${message.email}</td>
              <td>${message.phone || '-'}</td>
              <td>${message.message}</td>
              <td>${new Date(message.createdAt).toLocaleString()}</td>
              <td class="table-actions">
                <button class="btn-delete" onclick="deleteContact('${message._id}')">Delete</button>
              </td>
            </tr>
          `)
          .join('')}
      </tbody>
    `;
  };

  const escapeHtml = (value) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  window.editStudent = async (studentId) => {
    try {
      const student = await fetchWithAuth(`/api/admin/students/${studentId}`);
      const updates = {};
      const fields = [
        { key: 'name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'plan', label: 'Plan' },
        { key: 'admissionStatus', label: 'Admission Status' },
        { key: 'paymentStatus', label: 'Payment Status' },
      ];
      for (const field of fields) {
        const value = window.prompt(`Enter ${field.label}:`, student[field.key] || '');
        if (value === null) {
          return;
        }
        updates[field.key] = value.trim();
      }
      await fetchWithAuth(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await loadStudents();
      statusText.textContent = 'Student updated successfully.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.setAdmissionStatus = async (studentId, status) => {
    try {
      await fetchWithAuth(`/api/admin/students/${studentId}/admission`, {
        method: 'PUT',
        body: JSON.stringify({ admissionStatus: status }),
      });
      await loadStudents();
      statusText.textContent = `Student admission ${status}.`;
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.deleteStudent = async (studentId) => {
    if (!window.confirm('Delete this student and related payments?')) return;
    try {
      await fetchWithAuth(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });
      await loadStudents();
      statusText.textContent = 'Student deleted successfully.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.approvePayment = async (paymentId) => {
    const remarks = window.prompt('Add approval remarks (optional):', 'Payment approved by admin.');
    try {
      await fetchWithAuth(`/api/admin/payments/${paymentId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ adminRemarks: remarks || '' }),
      });
      await loadPayments();
      await loadStudents();
      statusText.textContent = 'Payment approved.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.rejectPayment = async (paymentId) => {
    const remarks = window.prompt('Add rejection remarks (optional):', 'Payment rejected by admin.');
    try {
      await fetchWithAuth(`/api/admin/payments/${paymentId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ adminRemarks: remarks || '' }),
      });
      await loadPayments();
      statusText.textContent = 'Payment rejected.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.editPlan = async (planId) => {
    try {
      const plan = await fetchWithAuth(`/api/admin/plans/${planId}`);
      const updatedTitle = window.prompt('Plan title:', plan.title);
      if (updatedTitle === null) return;
      const updatedPrice = window.prompt('Plan price:', plan.price);
      if (updatedPrice === null) return;
      const updatedDuration = window.prompt('Plan duration:', plan.duration);
      if (updatedDuration === null) return;
      const updatedDescription = window.prompt('Plan description:', plan.description || '');
      if (updatedDescription === null) return;
      const updatedActive = window.confirm('Mark this plan as active?');
      await fetchWithAuth(`/api/admin/plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updatedTitle.trim(),
          price: Number(updatedPrice),
          duration: updatedDuration.trim(),
          description: updatedDescription.trim(),
          active: updatedActive,
        }),
      });
      await loadPlans();
      statusText.textContent = 'Plan updated successfully.';
      statusText.style.color = '#475569';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.deletePlan = async (planId) => {
    if (!window.confirm('Delete this plan permanently?')) return;
    try {
      await fetchWithAuth(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
      });
      await loadPlans();
      statusText.textContent = 'Plan deleted successfully.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.deleteContact = async (contactId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await fetchWithAuth(`/api/admin/contacts/${contactId}`, {
        method: 'DELETE',
      });
      await loadContacts();
      statusText.textContent = 'Contact message deleted.';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  const loadOverview = async () => {
    const stats = await fetchWithAuth('/api/admin/overview');
    renderStats(stats);
  };

  const loadStudents = async () => {
    const params = new URLSearchParams();
    const searchValue = document.getElementById('studentSearchInput').value.trim();
    const admissionValue = document.getElementById('studentAdmissionFilter').value;
    const paymentValue = document.getElementById('studentPaymentFilter').value;
    const planValue = document.getElementById('studentPlanFilter').value.trim();
    if (searchValue) params.append('search', searchValue);
    if (admissionValue) params.append('admissionStatus', admissionValue);
    if (paymentValue) params.append('paymentStatus', paymentValue);
    if (planValue) params.append('plan', planValue);

    const students = await fetchWithAuth(`/api/admin/students?${params.toString()}`);
    renderStudents(students);
  };

  const loadPayments = async () => {
    const params = new URLSearchParams();
    const searchValue = document.getElementById('paymentSearchInput').value.trim();
    const statusValue = document.getElementById('paymentStatusFilter').value;
    if (searchValue) params.append('search', searchValue);
    if (statusValue) params.append('status', statusValue);
    const payments = await fetchWithAuth(`/api/admin/payments?${params.toString()}`);
    renderPayments(payments);
  };

  const loadPlans = async () => {
    const plans = await fetchWithAuth('/api/admin/plans');
    renderPlans(plans);
  };

  const loadContacts = async () => {
    const contacts = await fetchWithAuth('/api/admin/contacts');
    renderContacts(contacts);
  };

  const initialize = async () => {
    await verifyToken();
    statusText.textContent = 'Logged in as admin';
    statusText.style.color = '#475569';
    await Promise.all([loadOverview(), loadStudents(), loadPayments(), loadPlans(), loadContacts()]);
  };

  logoutBtn.addEventListener('click', () => {
    clearAdminToken();
    window.location.href = 'admin-login.html';
  });

  refreshBtn.addEventListener('click', async () => {
    statusText.textContent = 'Refreshing dashboard...';
    try {
      await Promise.all([loadOverview(), loadStudents(), loadPayments(), loadPlans(), loadContacts()]);
      statusText.textContent = 'Dashboard refreshed.';
      statusText.style.color = '#475569';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  });

  document.getElementById('studentFilterBtn').addEventListener('click', loadStudents);
  document.getElementById('paymentFilterBtn').addEventListener('click', loadPayments);

  document.getElementById('addPlanForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('planTitle').value.trim();
    const price = Number(document.getElementById('planPrice').value);
    const duration = document.getElementById('planDuration').value.trim();
    const description = document.getElementById('planDescription').value.trim();

    if (!title || !duration || Number.isNaN(price)) {
      statusText.textContent = 'Please enter valid plan data.';
      statusText.style.color = 'red';
      return;
    }

    try {
      await fetchWithAuth('/api/admin/plans', {
        method: 'POST',
        body: JSON.stringify({ title, price, duration, description }),
      });
      document.getElementById('addPlanForm').reset();
      await loadPlans();
      statusText.textContent = 'Plan added successfully.';
      statusText.style.color = '#475569';
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  });

  initialize();
};

window.addEventListener('DOMContentLoaded', () => {
  initAdminLogin();
  initAdminDashboard();
});
