"use strict";

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const bookingForm = document.getElementById("bookingForm");
const dateInput = document.getElementById("date");
const formMessage = document.getElementById("formMessage");
const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");
const authPanel = document.getElementById("authPanel");
const signedInAs = document.getElementById("signedInAs");
const myBookings = document.getElementById("myBookings");
const bookingList = document.getElementById("bookingList");

document.getElementById("year").textContent = new Date().getFullYear();

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });
  navLinks.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  }));
}

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
if (dateInput) dateInput.min = getLocalDateString();

function showMessage(element, message, type) {
  if (!element) return;
  element.className = `form-message visible ${type}`;
  element.textContent = message;
}

const configured = window.SUPABASE_URL &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  !window.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
let supabaseClient = null;
if (configured && window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
} else if (configured && !window.supabase) {
  console.error("Supabase JavaScript library did not load. Check your internet connection or CDN access.");
}

function requireConfiguration() {
  if (supabaseClient) return true;
  showMessage(authMessage, "Add your Supabase project URL and anon/publishable key in supabase-config.js first.", "error");
  return false;
}

async function refreshSession() {
  if (!supabaseClient) {
    bookingForm.querySelector('button[type="submit"]').disabled = true;
    showMessage(formMessage, "Booking is not configured yet. Connect your Supabase project to enable reservations.", "error");
    return;
  }
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Could not restore Supabase session:", error);
    showMessage(authMessage, "Could not check your sign-in session. Refresh the page and try again.", "error");
  }
  renderAuth(session?.user || null);
  if (session?.user) await loadBookings();
}

function renderAuth(user) {
  const email = document.getElementById("authEmail");
  const password = document.getElementById("authPassword");
  const signInBtn = document.getElementById("signInBtn");
  if (user) {
    signedInAs.hidden = false;
    signedInAs.textContent = `Signed in as ${user.email}`;
    signOutBtn.hidden = false;
    signUpBtn.hidden = true;
    signInBtn.hidden = true;
    email.hidden = true;
    password.hidden = true;
    email.required = false;
    password.required = false;
    authPanel.querySelector('label[for="authEmail"]').hidden = true;
    authPanel.querySelector('label[for="authPassword"]').hidden = true;
    bookingForm.querySelector('button[type="submit"]').disabled = false;
  } else {
    signedInAs.hidden = true;
    signOutBtn.hidden = true;
    signUpBtn.hidden = false;
    signInBtn.hidden = false;
    email.hidden = false;
    password.hidden = false;
    email.required = true;
    password.required = true;
    authPanel.querySelector('label[for="authEmail"]').hidden = false;
    authPanel.querySelector('label[for="authPassword"]').hidden = false;
    myBookings.hidden = true;
    bookingForm.querySelector('button[type="submit"]').disabled = true;
  }
}

if (authForm) authForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!requireConfiguration()) return;
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const button = document.getElementById("signInBtn");
  button.disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showMessage(authMessage, "Signed in successfully.", "success");
    renderAuth(data.user);
    await loadBookings();
  } catch (error) {
    showMessage(authMessage, error.message || "Could not sign in.", "error");
  } finally {
    button.disabled = false;
  }
});

if (signUpBtn) signUpBtn.addEventListener("click", async () => {
  if (!requireConfiguration()) return;
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || password.length < 6) {
    showMessage(authMessage, "Enter a valid email and a password of at least 6 characters.", "error");
    return;
  }
  signUpBtn.disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      renderAuth(data.user);
      showMessage(authMessage, "Account created and signed in.", "success");
    } else {
      showMessage(authMessage, "Account created. Check your email to confirm it, then sign in.", "success");
    }
  } catch (error) {
    showMessage(authMessage, error.message || "Could not create account.", "error");
  } finally {
    signUpBtn.disabled = false;
  }
});

if (signOutBtn) signOutBtn.addEventListener("click", async () => {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) return showMessage(authMessage, error.message, "error");
  renderAuth(null);
  showMessage(authMessage, "You have signed out.", "success");
});

async function loadBookings() {
  if (!supabaseClient) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) { myBookings.hidden = true; return; }
  const { data, error } = await supabaseClient
    .from("bookings")
    .select("id,name,booking_date,booking_time,guests,status,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    myBookings.hidden = false;
    bookingList.textContent = "Could not load reservations. Check the Supabase table and RLS policies.";
    return;
  }
  myBookings.hidden = false;
  bookingList.replaceChildren();
  if (!data.length) {
    bookingList.textContent = "You don't have any reservations yet.";
    return;
  }
  data.forEach(booking => {
    const item = document.createElement("div");
    item.className = "booking-history-item";
    const title = document.createElement("strong");
    title.textContent = `${booking.booking_date} · ${booking.booking_time}`;
    const details = document.createElement("span");
    details.textContent = `${booking.guests} guest(s) · `;
    const status = document.createElement("span");
    status.className = "booking-status";
    status.textContent = booking.status;
    item.append(title, details, status);
    bookingList.appendChild(item);
  });
}

if (bookingForm) bookingForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!bookingForm.reportValidity()) return;
  if (!requireConfiguration()) return;
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    showMessage(formMessage, "Please sign in before requesting a reservation.", "error");
    return;
  }
  if (dateInput.value < getLocalDateString()) {
    showMessage(formMessage, "Please choose today or a future date.", "error");
    dateInput.focus();
    return;
  }

  const formData = new FormData(bookingForm);
  const booking = {
    user_id: user.id,
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    booking_date: String(formData.get("date") || ""),
    booking_time: String(formData.get("time") || ""),
    guests: String(formData.get("guests") || ""),
    requests: String(formData.get("requests") || "").trim()
  };
  const button = bookingForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Saving reservation...";
  try {
    const { error } = await supabaseClient.from("bookings").insert(booking);
    if (error) throw error;
    showMessage(formMessage, "Your reservation request was saved. It remains pending until the restaurant confirms it.", "success");
    bookingForm.reset();
    dateInput.min = getLocalDateString();
    await loadBookings();
  } catch (error) {
    console.error(error);
    showMessage(formMessage, error.message || "Could not save your reservation. Please try again.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Request a Reservation <span>↗</span>';
  }
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    renderAuth(session?.user || null);
    if (session?.user) setTimeout(() => loadBookings(), 0);
  });
}
refreshSession();
