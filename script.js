// Default name. Private links can override this with ?salesperson=ADIL, ?salesperson=JENNY, ?salesperson=ESSAM, or ?salesperson=AJAY.
const DEFAULT_SALESPERSON_NAME = "ESSAM";
const urlParams = new URLSearchParams(window.location.search);
const pageSalesperson = document.body.dataset.salesperson || urlParams.get("salesperson") || DEFAULT_SALESPERSON_NAME;
const SALESPERSON_NAME = pageSalesperson.trim().toUpperCase();

// Future Google Sheets/API connection:
// Replace this empty value with your deployed Google Apps Script Web App URL.
// The submit handler already calls sendToBackend(record), so only that function needs updating.
const GOOGLE_SHEETS_API_URL = "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

const STORAGE_KEY = "daily-sales-visit-update-submissions";

const form = document.getElementById("visitForm");
const message = document.getElementById("message");
const tableBody = document.getElementById("submissionTable");
const submitButton = document.getElementById("submitButton");
const exportResponsesExcelButton = document.getElementById("exportResponsesExcelButton");
const exportResponsesPdfButton = document.getElementById("exportResponsesPdfButton");
const searchFilter = document.getElementById("searchFilter");
const dateFilter = document.getElementById("dateFilter");
const companyFilter = document.getElementById("companyFilter");
const personFilter = document.getElementById("personFilter");
const typeFilter = document.getElementById("typeFilter");
const salespersonFilter = document.getElementById("salespersonFilter");
const companyTypeFilter = document.getElementById("companyTypeFilter");
const dashboardTableBody = document.getElementById("dashboardTableBody");
const dashboardCards = document.getElementById("dashboardCards");
const dashboardTitle = document.getElementById("dashboardTitle");
const dashboardSubtitle = document.getElementById("dashboardSubtitle");
const exportExcelButton = document.getElementById("exportExcelButton");
const exportPdfButton = document.getElementById("exportPdfButton");
const reportTitle = document.getElementById("reportTitle");
const reportSalesperson = document.body.dataset.reportSalesperson || urlParams.get("salesperson") || "";
const REPORT_SALESPERSON = reportSalesperson.trim().toUpperCase();

const dashboardRole = document.body.dataset.dashboardRole || "";
const DASHBOARD_SALESPERSON = (document.body.dataset.dashboardSalesperson || "").trim().toUpperCase();
const formTitle = document.getElementById("formTitle");
if (formTitle) formTitle.textContent = `${SALESPERSON_NAME} - DAILY SALES VISIT UPDATE`;
if (dashboardTitle && dashboardRole) dashboardTitle.textContent = DASHBOARD_SALESPERSON ? `${DASHBOARD_SALESPERSON} Dashboard` : `Sales Dashboard`;
if (dashboardSubtitle && DASHBOARD_SALESPERSON) dashboardSubtitle.textContent = `${DASHBOARD_SALESPERSON} Submitted Visits`;
if (reportTitle && REPORT_SALESPERSON) reportTitle.textContent = `${REPORT_SALESPERSON} - Submitted Visits`;
if (form?.elements.date) form.elements.date.value = new Date().toISOString().slice(0, 10);

removeSampleRecords();
renderSubmissions();
renderDashboard();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("", "");
  submitButton.disabled = true;
  submitButton.textContent = "Getting location...";

  try {
    const gps = await captureGps();
    submitButton.textContent = "Submitting...";

    const formData = Object.fromEntries(new FormData(form).entries());
    const timestamp = new Date().toISOString();
    const record = {
      salespersonName: SALESPERSON_NAME,
      timestamp,
      ...formData,
      latitude: gps.latitude,
      longitude: gps.longitude,
      googleMapsLink: `https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`
    };

    saveRecord(record);
    await sendToBackend(record);
    renderSubmissions();
    form.reset();
    if (form?.elements.date) form.elements.date.value = new Date().toISOString().slice(0, 10);
    showMessage("success", "Thank you. Your sales visit update has been submitted successfully.");
  } catch (error) {
    showMessage("error", error.message || "Location permission is required to submit this sales visit.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
});


exportResponsesExcelButton?.addEventListener("click", () => {
  exportResponsesExcel(getFilteredSubmissions(getSubmissions()));
});

exportResponsesPdfButton?.addEventListener("click", () => {
  window.print();
});

function exportResponsesExcel(records) {
  const headers = ["Timestamp", "Salesperson", "Company", "Person", "Meeting Type", "Details", "Remarks", "Google Maps Link"];
  const rows = records.map((record) => [
    formatDateTime(record.timestamp),
    record.salespersonName,
    record.companyName,
    record.personName,
    record.meetingType || record.meetingOutcome,
    record.description,
    record.remarks,
    record.googleMapsLink
  ]);
  const html = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${REPORT_SALESPERSON || "sales"}-submitted-responses.xls`.toLowerCase();
  link.click();
  URL.revokeObjectURL(link.href);
}

[searchFilter, companyFilter, personFilter, dateFilter, typeFilter, salespersonFilter, companyTypeFilter].forEach((filter) => {
  filter?.addEventListener("input", () => { renderSubmissions(); renderDashboard(); });
  filter?.addEventListener("change", () => { renderSubmissions(); renderDashboard(); });
});

function removeSampleRecords() {
  const sampleCompanies = new Set([
    "Al Noor Contracting LLC",
    "Prime Fit-Out Interiors",
    "Blue Line Marble Factory",
    "Urban Heights Developer",
    "Green Scape Landscaping",
    "Metro Building Materials Trading"
  ]);
  const realRecords = getSubmissions().filter((record) => !sampleCompanies.has(record.companyName));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(realRecords));
}
function captureGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        });
      },
      () => reject(new Error("Location permission is required to submit this sales visit.")),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  });
}

function saveRecord(record) {
  const submissions = getSubmissions();
  submissions.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

async function sendToBackend(record) {
  if (!GOOGLE_SHEETS_API_URL || GOOGLE_SHEETS_API_URL.includes("PASTE_GOOGLE_APPS_SCRIPT")) return;

  await fetch(GOOGLE_SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(record)
  });
}

function renderSubmissions() {
  if (!tableBody) return;
  const submissions = getFilteredSubmissions(getSubmissions());

  if (!submissions.length) {
    tableBody.innerHTML = `<tr><td colspan="8">No submitted visits yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = submissions
    .map(
      (record) => `
        <tr>
          <td>${escapeHtml(formatDateTime(record.timestamp))}</td>
          <td>${escapeHtml(record.salespersonName)}</td>
          <td>${escapeHtml(record.companyName)}</td>
          <td>${escapeHtml(record.personName)}</td>
          <td>${escapeHtml(record.meetingType || record.meetingOutcome)}</td>
          <td>${escapeHtml(record.description)}</td>
          <td>${escapeHtml(record.remarks)}</td>
          <td><a href="${record.googleMapsLink}" target="_blank" rel="noreferrer">Open Map</a></td>
        </tr>
      `
    )
    .join("");
}


exportExcelButton?.addEventListener("click", () => {
  exportDashboardExcel(getDashboardRecords());
});

exportPdfButton?.addEventListener("click", () => {
  window.print();
});

function renderDashboard() {
  if (!dashboardTableBody) return;
  const records = getDashboardRecords();
  renderDashboardCards(records);

  if (!records.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="14">No submitted visits match the current filters.</td></tr>`;
    return;
  }

  dashboardTableBody.innerHTML = records
    .map(
      (record) => `
        <tr>
          <td>${escapeHtml(formatDateTime(record.timestamp))}</td>
          <td>${escapeHtml(record.salespersonName)}</td>
          <td>${escapeHtml(record.companyName)}</td>
          <td>${escapeHtml(record.companyType)}</td>
          <td>${escapeHtml(record.personName)}</td>
          <td>${escapeHtml(record.designation)}</td>
          <td>${escapeHtml(record.contactNumber)}</td>
          <td>${escapeHtml(record.emailId)}</td>
          <td>${escapeHtml(record.meetingType || record.meetingOutcome)}</td>
          <td>${escapeHtml(record.description)}</td>
          <td>${escapeHtml(record.remarks)}</td>
          <td>${escapeHtml(record.latitude)}</td>
          <td>${escapeHtml(record.longitude)}</td>
          <td><a href="${record.googleMapsLink}" target="_blank" rel="noreferrer">Open Map</a></td>
        </tr>
      `
    )
    .join("");
}

function getDashboardRecords() {
  const search = (searchFilter?.value || "").toLowerCase().trim();
  const date = dateFilter?.value || "";
  const meetingType = typeFilter?.value || "";
  const salesperson = DASHBOARD_SALESPERSON || salespersonFilter?.value || "";
  const companyType = companyTypeFilter?.value || "";

  return getSubmissions().filter((record) => {
    const recordType = record.meetingType || record.meetingOutcome || "";
    const text = `${record.salespersonName || ""} ${record.companyName || ""} ${record.companyType || ""} ${record.personName || ""} ${record.designation || ""} ${record.contactNumber || ""} ${record.emailId || ""} ${record.description || ""} ${record.remarks || ""} ${recordType}`.toLowerCase();
    return (!search || text.includes(search))
      && (!salesperson || record.salespersonName === salesperson)
      && (!date || record.date === date)
      && (!companyType || record.companyType === companyType)
      && (!meetingType || recordType === meetingType);
  });
}

function renderDashboardCards(records) {
  if (!dashboardCards) return;
  const count = (type) => records.filter((record) => (record.meetingType || record.meetingOutcome) === type).length;
  const salespersonCount = (name) => records.filter((record) => record.salespersonName === name).length;
  const cards = [
    { label: "Total Visits", value: records.length, meetingType: "", salesperson: "" },
    { label: "New Leads", value: count("New Lead"), meetingType: "New Lead", salesperson: "" },
    { label: "Follow-ups", value: count("Follow-up Required"), meetingType: "Follow-up Required", salesperson: "" },
    { label: "Samples", value: count("Sample Requested"), meetingType: "Sample Requested", salesperson: "" },
    { label: "Quotations", value: count("Quotation Requested"), meetingType: "Quotation Requested", salesperson: "" },
    { label: "LPO Expected", value: count("LPO Expected"), meetingType: "LPO Expected", salesperson: "" },
    { label: "Orders", value: count("Order Received"), meetingType: "Order Received", salesperson: "" },
    { label: "Adil Visits", value: salespersonCount("ADIL"), meetingType: "", salesperson: "ADIL" },
    { label: "Jenny Visits", value: salespersonCount("JENNY"), meetingType: "", salesperson: "JENNY" },
    { label: "Essam Visits", value: salespersonCount("ESSAM"), meetingType: "", salesperson: "ESSAM" },
    { label: "Ajay Visits", value: salespersonCount("AJAY"), meetingType: "", salesperson: "AJAY" }
  ];
  dashboardCards.innerHTML = cards.map((card) => `<button class="dash-stat" type="button" data-meeting-type="${escapeHtml(card.meetingType)}" data-salesperson="${escapeHtml(card.salesperson)}"><span>${card.label}</span><strong>${card.value}</strong></button>`).join("");
  dashboardCards.querySelectorAll(".dash-stat").forEach((card) => {
    card.addEventListener("click", () => {
      if (typeFilter) typeFilter.value = card.dataset.meetingType || "";
      if (salespersonFilter && !DASHBOARD_SALESPERSON) salespersonFilter.value = card.dataset.salesperson || "";
      renderDashboard();
    });
  });
}

function exportDashboardExcel(records) {
  const headers = ["Timestamp", "Salesperson", "Company", "Company Type", "Person", "Designation", "Contact", "Email ID", "Meeting Type", "Details", "Remarks", "Latitude", "Longitude", "Google Maps Link"];
  const rows = records.map((record) => [
    formatDateTime(record.timestamp),
    record.salespersonName,
    record.companyName,
    record.companyType,
    record.personName,
    record.designation,
    record.contactNumber,
    record.emailId,
    record.meetingType || record.meetingOutcome,
    record.description,
    record.remarks,
    record.latitude,
    record.longitude,
    record.googleMapsLink
  ]);
  const html = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "daily-sales-visit-dashboard.xls";
  link.click();
  URL.revokeObjectURL(link.href);
}
function getFilteredSubmissions(submissions) {
  const search = (searchFilter?.value || "").toLowerCase().trim();
  const company = (companyFilter?.value || "").toLowerCase().trim();
  const person = (personFilter?.value || "").toLowerCase().trim();
  const date = dateFilter?.value || "";
  const companyType = companyTypeFilter?.value || "";
  const meetingType = typeFilter?.value || "";
  return submissions.filter((record) => {
    const matchesSalesperson = !REPORT_SALESPERSON || String(record.salespersonName || "").toUpperCase() === REPORT_SALESPERSON;
    const text = `${record.salespersonName || ""} ${record.companyName || ""} ${record.companyType || ""} ${record.personName || ""} ${record.designation || ""} ${record.contactNumber || ""} ${record.emailId || ""} ${record.description || ""} ${record.remarks || ""} ${record.meetingType || record.meetingOutcome || ""}`.toLowerCase();
    const recordDate = record.date || "";
    const recordType = record.meetingType || record.meetingOutcome || "";
    return matchesSalesperson
      && (!search || text.includes(search))
      && (!company || String(record.companyName || "").toLowerCase().includes(company))
      && (!person || String(record.personName || "").toLowerCase().includes(person))
      && (!date || recordDate === date)
      && (!companyType || record.companyType === companyType)
      && (!meetingType || recordType === meetingType);
  });
}

function hasActiveFilter() {
  return Boolean((searchFilter?.value || "").trim() || (companyFilter?.value || "").trim() || (personFilter?.value || "").trim() || dateFilter?.value || companyTypeFilter?.value || typeFilter?.value);
}

function getRecordKey(record) {
  return `${record.timestamp}|${record.companyName}|${record.personName}|${record.latitude}|${record.longitude}`;
}

function showMessage(type, text) {
  message.className = type ? `message ${type}` : "message";
  message.textContent = text;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}



























