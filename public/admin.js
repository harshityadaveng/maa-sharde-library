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
    window.location.href = '/admin/dashboard';
    return;
  }

  // Show/Hide password toggle logic
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('adminPassword');
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
    });
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
      const data = await fetch(`${apiBaseUrl}/api/admin/login`, {
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
      window.location.href = '/admin/dashboard';
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

  // Verify Auth
  const verifyToken = async () => {
    try {
      await fetchWithAuth('/api/admin/profile');
    } catch (error) {
      clearAdminToken();
      window.location.href = '/admin/login';
    }
  };

  // Switch SPA section tab
  window.switchTab = (sectionId, filterType = '') => {
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(s => s.classList.remove('active'));

    // Show selected section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    // Set active link in sidebar menu
    const menuItems = document.querySelectorAll('.admin-sidebar-menu li');
    menuItems.forEach(item => {
      item.classList.remove('active');
      const target = item.getAttribute('data-target');
      const filter = item.getAttribute('data-filter');
      if (target === sectionId) {
        if (filterType && filter === filterType) {
          item.classList.add('active');
        } else if (!filterType && !filter) {
          item.classList.add('active');
        } else if (!filterType && filter === 'all') {
          item.classList.add('active');
        }
      }
    });

    // Update Title text
    const titleEl = document.getElementById('dashboardTitle');
    if (titleEl) {
      if (sectionId === 'overviewSection') titleEl.textContent = 'Dashboard Overview';
      else if (sectionId === 'studentManagementSection' && filterType === 'pending') titleEl.textContent = 'Registration Requests';
      else if (sectionId === 'studentManagementSection') titleEl.textContent = 'Student Management';
      else if (sectionId === 'paymentManagementSection') titleEl.textContent = 'Payment Verification';
      else if (sectionId === 'planManagementSection') titleEl.textContent = 'Membership Plans';
      else if (sectionId === 'contactManagementSection') titleEl.textContent = 'Contact Management';
      else if (sectionId === 'settingsSection') titleEl.textContent = 'Admin Settings';
      else if (sectionId === 'seatManagementSection') titleEl.textContent = 'Seat Management';
      else if (sectionId === 'noticesManagementSection') titleEl.textContent = 'Notices Management';
    }

    // Auto-filter logic for admissions
    if (sectionId === 'studentManagementSection') {
      const admissionFilter = document.getElementById('studentAdmissionFilter');
      if (admissionFilter) {
        admissionFilter.value = filterType === 'pending' ? 'pending' : '';
      }
      loadStudents();
    }

    if (sectionId === 'seatManagementSection') {
      loadSeats();
    }

    if (sectionId === 'noticesManagementSection') {
      loadAdminNotices();
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.remove('active');
  };

  // Toggle Sidebar on Mobile
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Render stats
  const renderStats = (stats) => {
    const statsEl = document.getElementById('dashboardStats');
    statsEl.innerHTML = `
      <div class="stat-card"><h3>Total Students</h3><p>${stats.totalStudents}</p></div>
      <div class="stat-card"><h3>Approved Admissions</h3><p>${stats.approvedAdmissions}</p></div>
      <div class="stat-card"><h3>Pending Admissions</h3><p>${stats.pendingAdmissions}</p></div>
      <div class="stat-card"><h3>Pending Payments</h3><p>${stats.pendingPayments}</p></div>
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
          <th>Mobile</th>
          <th>Plan</th>
          <th>Admission</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${students
          .map((student) => `
            <tr>
              <td>${escapeHtml(student.studentId || '-')}</td>
              <td>${escapeHtml(student.name)}</td>
              <td>${escapeHtml(student.mobile)}</td>
              <td>${escapeHtml(student.plan)}</td>
              <td>${escapeHtml(student.admissionStatus)}</td>
              <td>${escapeHtml(student.paymentStatus)}</td>
              <td><span style="font-weight:bold; color:${student.status === 'active' ? 'green' : (student.status === 'expired' ? 'red' : 'orange')}">${escapeHtml(student.status || 'pending')}</span></td>
              <td>${student.startDate ? new Date(student.startDate).toLocaleDateString() : '-'}</td>
              <td>${student.endDate ? new Date(student.endDate).toLocaleDateString() : '-'}</td>
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
              <td>${escapeHtml(payment.paymentId)}</td>
              <td>${escapeHtml(payment.studentId?.name || 'Unknown')}</td>
              <td>₹${payment.amount}</td>
              <td>${escapeHtml(payment.paymentStatus)}</td>
              <td>
                ${payment.paymentScreenshot 
                  ? `<a class="btn-view" target="_blank" href="${payment.paymentScreenshot}">View</a>` 
                  : `No Screenshot`
                }
              </td>
              <td>${escapeHtml(payment.adminRemarks || '-')}</td>
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
          <th>Status</th>
          <th>Received</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${contacts
          .map((message) => `
            <tr>
              <td>${escapeHtml(message.name)}</td>
              <td>${escapeHtml(message.email)}</td>
              <td>${escapeHtml(message.phone || '-')}</td>
              <td>${escapeHtml(message.message)}</td>
              <td><span style="font-weight:bold; color:${message.status === 'resolved' ? 'green' : 'orange'}">${escapeHtml(message.status || 'pending')}</span></td>
              <td>${new Date(message.createdAt).toLocaleString()}</td>
              <td class="table-actions">
                ${(message.status || 'pending') === 'pending'
                  ? `<button class="btn-approve" onclick="resolveContact('${message._id}')">Resolve</button>`
                  : ''
                }
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
        { key: 'admissionStatus', label: 'Admission Status (pending/approved/rejected)' },
        { key: 'paymentStatus', label: 'Payment Status (pending/under_verification/approved/rejected)' },
        { key: 'status', label: 'Lifecycle Status (pending/active/expired)' },
        { key: 'startDate', label: 'Start Date (YYYY-MM-DD)' },
        { key: 'endDate', label: 'End Date (YYYY-MM-DD)' },
      ];
      for (const field of fields) {
        let defaultVal = student[field.key] || '';
        if ((field.key === 'startDate' || field.key === 'endDate') && defaultVal) {
          defaultVal = new Date(defaultVal).toISOString().split('T')[0];
        }
        const value = window.prompt(`Enter ${field.label}:`, defaultVal);
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

  window.resolveContact = async (contactId) => {
    try {
      await fetchWithAuth(`/api/admin/contacts/${contactId}/resolve`, {
        method: 'PUT',
      });
      await loadContacts();
      statusText.textContent = 'Contact message resolved.';
      statusText.style.color = '#475569';
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

    // Handle initial route check
    const path = window.location.pathname;
    if (path.includes('/admin/students')) {
      window.switchTab('studentManagementSection');
    } else if (path.includes('/admin/admissions')) {
      window.switchTab('studentManagementSection', 'pending');
    } else if (path.includes('/admin/payments')) {
      window.switchTab('paymentManagementSection');
    } else {
      window.switchTab('overviewSection');
    }
  };

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetchWithAuth('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error response:', err);
    }
    clearAdminToken();
    window.location.href = '/admin/login';
  });

  refreshBtn.addEventListener('click', async () => {
    statusText.textContent = 'Refreshing dashboard...';
    try {
      await Promise.all([loadOverview(), loadStudents(), loadPayments(), loadPlans(), loadContacts()]);
      const activeSec = document.querySelector('.dashboard-section.active');
      if (activeSec) {
        if (activeSec.id === 'seatManagementSection') await loadSeats();
        if (activeSec.id === 'noticesManagementSection') await loadAdminNotices();
      }
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

  // Settings Change Password Handler
  const changePasswordForm = document.getElementById('changePasswordForm');
  const settingsMsg = document.getElementById('settingsMessage');
  if (changePasswordForm && settingsMsg) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmNewPassword = document.getElementById('confirmNewPassword').value;

      if (newPassword.length < 6) {
        settingsMsg.style.color = 'red';
        settingsMsg.textContent = 'New password must be at least 6 characters long.';
        return;
      }

      if (newPassword !== confirmNewPassword) {
        settingsMsg.style.color = 'red';
        settingsMsg.textContent = 'New passwords do not match.';
        return;
      }

      settingsMsg.style.color = '#0a192f';
      settingsMsg.textContent = 'Updating password...';

      try {
        await fetchWithAuth('/api/admin/settings/password', {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        settingsMsg.style.color = 'green';
        settingsMsg.textContent = 'Password updated successfully!';
        changePasswordForm.reset();
      } catch (err) {
        settingsMsg.style.color = 'red';
        settingsMsg.textContent = err.message;
      }
    });
  }

  const loadSeats = async () => {
    try {
      const data = await fetchWithAuth('/api/seats/status');
      
      // Render visual seat grid
      const gridContainer = document.getElementById('seatsGridContainer');
      if (gridContainer) {
        if (!data.seats || !data.seats.length) {
          gridContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #475569;">No seats created yet.</p>';
        } else {
          gridContainer.innerHTML = data.seats
            .map((seat) => {
              const statusClass = seat.status; // available, occupied, reserved
              const assignedUser = seat.assignedTo ? seat.assignedTo.name : '';
              const shiftInfo = seat.shift && seat.shift !== 'any' ? seat.shift : '';
              
              return `
                <div class="seat-card ${statusClass}">
                  <h4>${escapeHtml(seat.seatNumber)}</h4>
                  ${shiftInfo ? `<span class="seat-shift">${escapeHtml(shiftInfo)}</span>` : ''}
                  ${assignedUser ? `<span class="seat-user" title="${escapeHtml(assignedUser)}">${escapeHtml(assignedUser)}</span>` : ''}
                  ${seat.status !== 'available' 
                    ? `<button onclick="releaseSeat('${seat._id}')">Release</button>`
                    : `<span style="font-size:11px; color:#166534; margin:6px 0;">Available</span>`
                  }
                </div>
              `;
            })
            .join('');
        }
      }

      // Populate Seat Select for Assign Form
      const seatSelect = document.getElementById('assignSeatNumberSelect');
      if (seatSelect) {
        seatSelect.innerHTML = '<option value="">Select Available Seat *</option>';
        if (data.seats) {
          data.seats
            .filter((s) => s.status === 'available')
            .forEach((seat) => {
              const opt = document.createElement('option');
              opt.value = seat.seatNumber;
              opt.textContent = seat.seatNumber;
              seatSelect.appendChild(opt);
            });
        }
      }

      // Populate Students Select for Assign Form
      const studentSelect = document.getElementById('assignStudentSelect');
      if (studentSelect) {
        studentSelect.innerHTML = '<option value="">Select Active Student *</option>';
        const students = await fetchWithAuth('/api/admin/students?admissionStatus=approved');
        students.forEach((student) => {
          const opt = document.createElement('option');
          opt.value = student._id;
          opt.textContent = `${student.name} (${student.studentId})`;
          studentSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Error loading seats:', err);
    }
  };

  window.releaseSeat = async (seatId) => {
    if (!window.confirm('Are you sure you want to release this seat?')) return;
    try {
      await fetchWithAuth(`/api/seats/release/${seatId}`, {
        method: 'PUT',
      });
      statusText.textContent = 'Seat released successfully.';
      statusText.style.color = '#475569';
      await loadSeats();
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  const loadAdminNotices = async () => {
    try {
      const notices = await fetchWithAuth('/api/admin/notices');
      const table = document.getElementById('adminNoticesTable');
      if (!table) return;

      if (!notices.length) {
        table.innerHTML = '<tr><td>No notices found.</td></tr>';
        return;
      }

      table.innerHTML = `
        <thead>
          <tr>
            <th>Title</th>
            <th>Content</th>
            <th>Active</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${notices
            .map((notice) => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(notice.title)}</td>
                <td>${escapeHtml(notice.content)}</td>
                <td><span style="font-weight:bold; color:${notice.active ? 'green' : 'red'}">${notice.active ? 'Yes' : 'No'}</span></td>
                <td>${new Date(notice.createdAt).toLocaleDateString()}</td>
                <td class="table-actions">
                  <button class="btn-edit" onclick="editNotice('${notice._id}')">Edit</button>
                  <button class="btn-delete" onclick="deleteNotice('${notice._id}')">Delete</button>
                </td>
              </tr>
            `)
            .join('')}
        </tbody>
      `;
    } catch (error) {
      console.error('Error loading admin notices:', error);
    }
  };

  window.editNotice = async (noticeId) => {
    try {
      const notices = await fetchWithAuth('/api/admin/notices');
      const notice = notices.find((n) => n._id === noticeId);
      if (!notice) return;

      const title = window.prompt('Notice Title:', notice.title);
      if (title === null) return;
      const content = window.prompt('Notice Content:', notice.content);
      if (content === null) return;
      const active = window.confirm('Set notice as active?');

      await fetchWithAuth(`/api/admin/notices/${noticeId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title.trim(), content: content.trim(), active }),
      });

      statusText.textContent = 'Notice updated successfully.';
      statusText.style.color = '#475569';
      await loadAdminNotices();
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  window.deleteNotice = async (noticeId) => {
    if (!window.confirm('Delete this notice permanently?')) return;
    try {
      await fetchWithAuth(`/api/admin/notices/${noticeId}`, {
        method: 'DELETE',
      });
      statusText.textContent = 'Notice deleted successfully.';
      statusText.style.color = '#475569';
      await loadAdminNotices();
    } catch (error) {
      statusText.textContent = error.message;
      statusText.style.color = 'red';
    }
  };

  // Create Seat Form Submit
  const createSeatForm = document.getElementById('createSeatForm');
  if (createSeatForm) {
    createSeatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const seatNumber = document.getElementById('newSeatNumber').value.trim();
      const shift = document.getElementById('newSeatShift').value;

      try {
        await fetchWithAuth('/api/seats', {
          method: 'POST',
          body: JSON.stringify({ seatNumber, shift }),
        });
        createSeatForm.reset();
        statusText.textContent = `Seat ${seatNumber} created successfully.`;
        statusText.style.color = '#475569';
        await loadSeats();
      } catch (err) {
        statusText.textContent = err.message;
        statusText.style.color = 'red';
      }
    });
  }

  // Assign Seat Form Submit
  const assignSeatForm = document.getElementById('assignSeatForm');
  if (assignSeatForm) {
    assignSeatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const seatNumber = document.getElementById('assignSeatNumberSelect').value;
      const studentId = document.getElementById('assignStudentSelect').value;
      const shift = document.getElementById('assignShiftSelect').value;

      try {
        await fetchWithAuth('/api/seats/assign', {
          method: 'PUT',
          body: JSON.stringify({ seatNumber, studentId, shift }),
        });
        assignSeatForm.reset();
        statusText.textContent = 'Seat assigned successfully.';
        statusText.style.color = '#475569';
        await loadSeats();
      } catch (err) {
        statusText.textContent = err.message;
        statusText.style.color = 'red';
      }
    });
  }

  // Add Notice Form Submit
  const addNoticeForm = document.getElementById('addNoticeForm');
  if (addNoticeForm) {
    addNoticeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('noticeTitle').value.trim();
      const content = document.getElementById('noticeContent').value.trim();
      const active = document.getElementById('noticeActive').checked;

      try {
        await fetchWithAuth('/api/admin/notices', {
          method: 'POST',
          body: JSON.stringify({ title, content, active }),
        });
        addNoticeForm.reset();
        statusText.textContent = 'Notice published successfully.';
        statusText.style.color = '#475569';
        await loadAdminNotices();
      } catch (err) {
        statusText.textContent = err.message;
        statusText.style.color = 'red';
      }
    });
  }

  initialize();
};

window.addEventListener('DOMContentLoaded', () => {
  initAdminLogin();
  initAdminDashboard();
});
