console.log("reset_password.js loaded");

const form = document.getElementById("changePasswordForm");
const errorEl = document.getElementById("cpError");
const submitBtn = document.getElementById("cpSubmitBtn");
const modal = document.getElementById("cpModal");
const modalClose = document.getElementById("cpModalClose");

// Safety checks
if (!form) console.error("changePasswordForm not found");
if (!submitBtn) console.error("cpSubmitBtn not found");
if (!modal) console.error("cpModal not found");
if (!modalClose) console.error("cpModalClose not found");

function showError(message) {
  if (errorEl) {
    errorEl.textContent = message || "";
  } else {
    console.error("cpError element not found. Error:", message);
    alert(message);
  }
}

function openModal() {
  if (modal) {
    modal.classList.add("show");
  } else {
    alert("Password updated successfully.");
    if (isResetMode) {
      window.location.href = "admin.html";
    }
  }
}

function closeModal() {
  if (modal) {
    modal.classList.remove("show");
  }
}

// detect if opened from reset email (?token=...)
const params = new URLSearchParams(window.location.search);
const resetToken = params.get("token");
const isResetMode = !!resetToken; // true if token exists
console.log("isResetMode:", isResetMode, "token:", resetToken);

// In reset mode, hide current password field
if (isResetMode) {
  const currentField = document.getElementById("cpCurrentField");
  const currentInput = document.getElementById("currentPassword");
  if (currentField) currentField.style.display = "none";
  if (currentInput) currentInput.required = false;
}

if (modalClose) {
  modalClose.addEventListener("click", () => {
    closeModal();
    // After reset, send user to login page
    if (isResetMode) {
      window.location.href = "admin.html";
    }
  });
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("cp-modal-backdrop")) {
      closeModal();
    }
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");

    const currentPasswordEl = document.getElementById("currentPassword");
    const newPasswordEl = document.getElementById("newPassword");
    const confirmPasswordEl = document.getElementById("confirmPassword");

    const currentPassword = currentPasswordEl ? currentPasswordEl.value.trim() : "";
    const newPassword = newPasswordEl ? newPasswordEl.value.trim() : "";
    const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value.trim() : "";

    // validations
    if (!newPassword || !confirmPassword || (!isResetMode && !currentPassword)) {
      showError("Please fill out all required fields.");
      return;
    }

    if (newPassword.length < 8) {
      showError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("New password and confirmation do not match.");
      return;
    }

    if (!submitBtn) {
      console.error("Submit button not found");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
      let endpoint;
      let body;

      if (isResetMode) {
        // RESET via email link
        endpoint = "backend/password_reset/reset_password.php";
        body = JSON.stringify({ token: resetToken, password: newPassword });
      } else {
        // NORMAL CHANGE (logged-in admin)
        endpoint = "backend/account/change_password.php";
        body = JSON.stringify({ currentPassword, newPassword });
      }

      console.log("Calling endpoint:", endpoint, "body:", body);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Response is not valid JSON. Status:", res.status);
      }

      console.log("Fetch response:", res.status, data);

      // If PHP path is wrong (404) or returned HTML, you'll see it here
      if (!res.ok || !data) {
        showError("Something went wrong. Please check backend path or PHP errors.");
        return;
      }

      if (data.status !== "success") {
        showError(data.message || "Failed to change password.");
        return;
      }

      // success
      showError("");
      openModal();
      form.reset();
    } catch (err) {
      console.error("Fetch error:", err);
      showError("Something went wrong. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Update Password";
      }
    }
  });
}