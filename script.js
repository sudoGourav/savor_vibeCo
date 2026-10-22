
"use strict";

// Your Google Apps Script deployment URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwlN36PhjuIIIZ1-45JzVSebQ7xIYaVAlUlAYwM384YAkPIrkjZ4yN2C6rP6xmDPMxKEw/exec";

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const bookingForm = document.getElementById("bookingForm");
const dateInput = document.getElementById("date");
const formMessage = document.getElementById("formMessage");

// Footer year
document.getElementById("year").textContent =
  new Date().getFullYear();

// Mobile navigation
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰";
    });
  });
}

// Local date, avoiding UTC date conversion problems
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

if (dateInput) {
  dateInput.min = getLocalDateString();
}

// Display form messages safely
function showMessage(message, type) {
  formMessage.className = `form-message visible ${type}`;
  formMessage.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  formMessage.appendChild(paragraph);
}

// Submit a reservation
if (bookingForm) {
  bookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
      return;
    }

    if (dateInput.value < getLocalDateString()) {
      showMessage(
        "Please choose today or a future date.",
        "error"
      );
      dateInput.focus();
      return;
    }

    const formData = new FormData(bookingForm);

    const booking = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      date: String(formData.get("date") || ""),
      time: String(formData.get("time") || ""),
      guests: String(formData.get("guests") || ""),
      requests: String(formData.get("requests") || "").trim()
    };

    const submitButton = bookingForm.querySelector(
      'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Submitting booking...";

    try {
      // Apps Script redirects responses to Google's servers.
      // no-cors prevents the browser from reading the response.
      // A resolved promise does NOT prove the booking was saved.
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(booking)
      });

      showMessage(
        "Your booking request has been submitted for processing. " +
        "Please verify that it appears in the restaurant's Google Sheet. " +
        "This form cannot confirm whether the reservation was saved.",
        "success"
      );

      console.log("Booking request submitted:", booking);

    } catch (error) {
      console.error("Booking submission error:", error);

      showMessage(
        "We could not send your request. Please try again.",
        "error"
      );

    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Request a Reservation <span>↗</span>';
    }
  });
}
