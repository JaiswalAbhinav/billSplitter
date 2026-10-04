// =============================================================
// CURRENCY EXCHANGE RATES & SYMBOLS
// =============================================================
const RATES_TO_INR = {
  INR: 1.0,
  USD: 83.5,
  EURO: 90.2,
  DHIRAMH: 22.7,
  DINAR: 271.8,
  YEN: 0.55,
  RUBEL: 0.91
};

const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EURO: "€",
  DHIRAMH: "AED ",
  DINAR: "KWD ",
  YEN: "¥",
  RUBEL: "₽"
};

// DOM References
const groupNameInput = document.getElementById("group-name");
const billCurrencySelect = document.getElementById("bill-currency");
const totalBillInput = document.getElementById("total-bill");
const convertedInrSpan = document.getElementById("converted-inr-amount");
const splitCurrencyPref = document.getElementById("split-currency-preference");
const originalCurrencyOption = document.getElementById("original-currency-option");
const splitMethodSelect = document.getElementById("split-method");
const numUsersInput = document.getElementById("num-users");
const generateBtn = document.getElementById("generate-btn");
const calculateBtn = document.getElementById("calculate-btn");
const finalizeSaveBtn = document.getElementById("finalize-save-btn");
const participantsContainer = document.getElementById("participants-container");
const validationMessage = document.getElementById("validation-message");
const summaryOverview = document.getElementById("summary-overview");
const balancesList = document.getElementById("balances-list");
const settlementPlan = document.getElementById("settlement-plan");
const remainingDisplay = document.getElementById("remaining-amount-display");

let currentParticipantsData = [];
let targetCurrencyGlobal = "INR";
let targetSymbolGlobal = "₹";
let isBillAlreadySaved = false;

// =============================================================
// USER LEDGER STORAGE
// =============================================================
function getUserLedger(phone) {
  const data = localStorage.getItem(`user_ledger_${phone}`);
  return data ? JSON.parse(data) : { walletCredit: 0.0, pendingDebt: 0.0, name: "" };
}

function saveUserLedger(phone, name, walletCredit, pendingDebt) {
  const ledger = {
    name: name,
    phone: phone,
    walletCredit: Math.max(0, Number(walletCredit.toFixed(2))),
    pendingDebt: Math.max(0, Number(pendingDebt.toFixed(2)))
  };
  localStorage.setItem(`user_ledger_${phone}`, JSON.stringify(ledger));
}

// =============================================================
// LIVE REMAINING BALANCE (VENDING / SLOT MACHINE)
// =============================================================
function updateRemainingBalance() {
  const billCurrency = billCurrencySelect.value;
  const billRateToINR = RATES_TO_INR[billCurrency] || 1.0;
  const totalBillOriginal = parseFloat(totalBillInput.value) || 0.0;
  const symbol = CURRENCY_SYMBOLS[billCurrency] || `${billCurrency} `;

  const paidInputs = document.querySelectorAll(".participant-paid");
  const currSelects = document.querySelectorAll(".participant-currency");

  let totalPaidInBillCurrency = 0;

  for (let i = 0; i < paidInputs.length; i++) {
    const amount = parseFloat(paidInputs[i].value) || 0.0;
    const userCurr = currSelects[i].value;
    const userRateToINR = RATES_TO_INR[userCurr] || 1.0;

    const amountInINR = amount * userRateToINR;
    const amountInBillCurrency = amountInINR / billRateToINR;

    totalPaidInBillCurrency += amountInBillCurrency;
  }

  const remaining = totalBillOriginal - totalPaidInBillCurrency;

  if (remainingDisplay) {
    remainingDisplay.innerText = `${symbol}${remaining.toFixed(2)}`;
    remainingDisplay.classList.remove("spin-reel");
    void remainingDisplay.offsetWidth;
    remainingDisplay.classList.add("spin-reel");
  }
}

function updateBillINRPreview() {
  const billCurrency = billCurrencySelect.value;
  const billAmount = parseFloat(totalBillInput.value) || 0.0;
  const rate = RATES_TO_INR[billCurrency] || 1.0;
  const inrValue = billAmount * rate;

  if (convertedInrSpan) convertedInrSpan.innerText = inrValue.toFixed(2);
  if (originalCurrencyOption) originalCurrencyOption.innerText = `Original Bill Currency (${billCurrency})`;

  updateRemainingBalance();
}

billCurrencySelect.addEventListener("change", updateBillINRPreview);
totalBillInput.addEventListener("input", updateBillINRPreview);

// Live toggle between Equal and Custom mode without re-generating everything
if (splitMethodSelect) {
  splitMethodSelect.addEventListener("change", () => {
    const isCustom = splitMethodSelect.value === "CUSTOM";
    const rawBill = parseFloat(totalBillInput.value) || 0.0;
    const cards = document.querySelectorAll(".participant-card");
    const equalShare = cards.length > 0 ? (rawBill / cards.length).toFixed(2) : "0.00";

    cards.forEach((card) => {
      const shareInput = card.querySelector(".participant-share");
      const shareLabel = card.querySelector(".share-field-label");
      const shareHint = card.querySelector(".share-field-hint");

      if (shareInput && shareLabel && shareHint) {
        if (isCustom) {
          shareInput.readOnly = false;
          shareInput.style.backgroundColor = "#ffffff";
          shareInput.style.color = "#0f172a";
          shareInput.placeholder = "Enter your exact split (e.g. 500)";
          shareLabel.innerHTML = `<span class="input-icon">🍽️</span> What should be your split? (Food eaten / consumption share):`;
          shareHint.innerText = "Specify the exact amount this person consumed or owes.";
        } else {
          shareInput.readOnly = true;
          shareInput.value = equalShare;
          shareInput.style.backgroundColor = "#e2e8f0";
          shareInput.style.color = "#64748b";
          shareLabel.innerHTML = `<span class="input-icon">🍽️</span> Calculated Fair Share:`;
          shareHint.innerText = "Equally divided among all participants.";
        }
      }
    });
  });
}

// =============================================================
// USER HISTORY (WALLET CREDIT & OUTSTANDING DEBTS)
// =============================================================
function checkUserHistory(card) {
  const phoneInput = card.querySelector(".participant-phone");
  const nameInput = card.querySelector(".participant-name");
  const historyNotice = card.querySelector(".user-history-notice");
  const phoneVal = phoneInput.value.trim();

  historyNotice.innerHTML = "";
  if (phoneVal.length !== 10) return;

  const history = getUserLedger(phoneVal);

  if (history.name && !nameInput.value.trim()) {
    nameInput.value = history.name;
    const avatar = card.querySelector(".avatar-circle");
    if (avatar) avatar.innerText = history.name.slice(0, 2).toUpperCase();
  }

  if (history.walletCredit > 0.01) {
    historyNotice.innerHTML = `
      <div style="background:#e8f5e9; border:1px solid #4caf50; border-radius:8px; padding:10px; margin:8px 0; font-size:13px;">
        <p><strong>Balance Credit Available:</strong> You have <strong>₹${history.walletCredit.toFixed(2)}</strong> saved from previous splits.</p>
        <p>You may pay ₹${history.walletCredit.toFixed(2)} less now or keep that in your balance.</p>
        <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; margin-right:12px;">
          <input type="radio" name="credit_choice_${phoneVal}" value="USE" class="credit-choice-radio"> Deduct ₹${history.walletCredit.toFixed(2)} from payment
        </label>
        <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
          <input type="radio" name="credit_choice_${phoneVal}" value="KEEP" checked class="credit-choice-radio"> Keep ₹${history.walletCredit.toFixed(2)} in balance
        </label>
      </div>
    `;

    const radios = historyNotice.querySelectorAll(".credit-choice-radio");
    radios.forEach((r) => {
      r.addEventListener("change", () => {
        if (r.value === "USE") {
          card.dataset.appliedCreditInr = history.walletCredit.toString();
        } else {
          card.dataset.appliedCreditInr = "0";
        }
      });
    });
  }

  if (history.pendingDebt > 0.01) {
    historyNotice.innerHTML += `
      <div style="background:#ffebee; border:1px solid #f44336; border-radius:8px; padding:10px; margin:8px 0; font-size:13px;">
        <p style="color:#d32f2f;"><strong>⚠️ Past Deficit Notice:</strong> You have an unsettled deficit of <strong>₹${history.pendingDebt.toFixed(2)}</strong> from previous bills.</p>
        <p><small>You cannot pay less than your split share on this bill. You need to clear your earlier deficit first.</small></p>
      </div>
    `;
    card.dataset.pendingDebtInr = history.pendingDebt.toString();
  }
}

function validateAllPhoneInputs() {
  const allCards = document.querySelectorAll(".participant-card");
  const phoneCounts = {};

  allCards.forEach((card) => {
    const input = card.querySelector(".participant-phone");
    const val = input.value.trim();
    if (val.length === 10) {
      phoneCounts[val] = (phoneCounts[val] || 0) + 1;
    }
  });

  allCards.forEach((card) => {
    const input = card.querySelector(".participant-phone");
    const feedback = card.querySelector(".phone-feedback");
    const val = input.value.trim();

    if (val.length === 0) {
      feedback.style.display = "none";
      feedback.innerText = "";
    } else if (val.length < 10) {
      feedback.style.display = "block";
      feedback.style.color = "red";
      feedback.innerText = "Invalid phone number";
    } else if (val.length === 10) {
      if (phoneCounts[val] > 1) {
        feedback.style.display = "block";
        feedback.style.color = "red";
        feedback.innerText = "Duplicate phone number: already entered";
      } else {
        feedback.style.display = "block";
        feedback.style.color = "green";
        feedback.innerText = "✓ Valid phone number";
        checkUserHistory(card);
      }
    }
  });
}

// =============================================================
// STEP 1: GENERATE PARTICIPANT CARDS
// =============================================================
generateBtn.addEventListener("click", () => {
  const count = parseInt(numUsersInput.value, 10);
  const rawBill = parseFloat(totalBillInput.value);

  if (isNaN(rawBill) || rawBill <= 0) {
    alert("Please enter a valid total bill amount.");
    return;
  }
  if (isNaN(count) || count <= 0) {
    alert("Please enter at least 1 participant.");
    return;
  }

  isBillAlreadySaved = false;
  participantsContainer.innerHTML = "";
  validationMessage.innerText = "";
  summaryOverview.innerHTML = "";
  balancesList.innerHTML = "";
  settlementPlan.innerHTML = "";
  finalizeSaveBtn.style.display = "none";
  finalizeSaveBtn.disabled = false;
  finalizeSaveBtn.innerText = "Save Group Data & Generate Final Plan";

  const defaultCurrency = billCurrencySelect.value;
  const isCustomSplit = splitMethodSelect && splitMethodSelect.value === "CUSTOM";
  const defaultEqualShare = (rawBill / count).toFixed(2);

  for (let i = 1; i <= count; i++) {
    const card = document.createElement("div");
    card.className = "participant-card";

    card.innerHTML = `
      <div class="card-header-bar">
        <div class="participant-avatar-badge">
          <div class="avatar-circle" id="avatar-icon-${i}">P${i}</div>
          <h3>Participant ${i}</h3>
        </div>
      </div>

      <div class="card-grid-row">
        <div>
          <label><span class="input-icon">👤</span> Full Name (Letters only):</label>
          <input type="text" class="participant-name" placeholder="e.g. Rahul Sharma" required>
        </div>
        <div>
          <label><span class="input-icon">📱</span> Phone Number:</label>
          <input type="tel" class="participant-phone" placeholder="Enter 10-digit number" maxlength="10" required>
          <small class="phone-feedback" style="display: none;"></small>
        </div>
      </div>

      <div class="user-history-notice"></div>

      <!-- Split vs Payment Inputs -->
      <div class="card-grid-row" style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; margin-bottom: 16px;">
        <div>
          <label class="share-field-label" style="color: #0f172a;">
            <span class="input-icon">🍽️</span> 
            ${isCustomSplit ? "What should be your split? (Food eaten / share):" : "Calculated Fair Share:"}
          </label>
          <input 
            type="number" 
            class="participant-share" 
            placeholder="${isCustomSplit ? 'e.g. 500' : defaultEqualShare}" 
            value="${isCustomSplit ? '' : defaultEqualShare}" 
            ${isCustomSplit ? '' : "readonly style='background:#e2e8f0; color:#64748b;'"}
            min="0" 
            step="0.01" 
            required
          >
          <small class="share-field-hint" style="color: #64748b; font-size: 11px;">
            ${isCustomSplit ? "Enter the exact portion this person consumed." : "Divided equally among members."}
          </small>
        </div>

        <div>
          <label style="color: #0f172a;">
            <span class="input-icon">💳</span> How much did you actually pay?
          </label>
          <input type="number" class="participant-paid" placeholder="0.00" min="0" step="0.01" required>
          <small style="color: #64748b; font-size: 11px;">Enter the amount paid towards the bill.</small>
        </div>
      </div>

      <div class="card-grid-row">
        <div>
          <label><span class="input-icon">💱</span> Currency Paid In:</label>
          <select class="participant-currency">
            <option value="INR" ${defaultCurrency === "INR" ? "selected" : ""}>INR (₹)</option>
            <option value="USD" ${defaultCurrency === "USD" ? "selected" : ""}>USD ($)</option>
            <option value="EURO" ${defaultCurrency === "EURO" ? "selected" : ""}>EURO (€)</option>
            <option value="DHIRAMH" ${defaultCurrency === "DHIRAMH" ? "selected" : ""}>DHIRAMH (AED)</option>
            <option value="DINAR" ${defaultCurrency === "DINAR" ? "selected" : ""}>DINAR (KWD)</option>
            <option value="YEN" ${defaultCurrency === "YEN" ? "selected" : ""}>YEN (¥)</option>
            <option value="RUBEL" ${defaultCurrency === "RUBEL" ? "selected" : ""}>RUBEL (₽)</option>
          </select>
        </div>
      </div>
    `;

    participantsContainer.appendChild(card);

    const nameInput = card.querySelector(".participant-name");
    const avatar = card.querySelector(`#avatar-icon-${i}`);
    nameInput.addEventListener("input", () => {
      const parts = nameInput.value.trim().split(" ");
      if (parts.length > 1 && parts[0] && parts[1]) {
        avatar.innerText = (parts[0][0] + parts[1][0]).toUpperCase();
      } else if (parts[0] && parts[0].length > 0) {
        avatar.innerText = parts[0].slice(0, 2).toUpperCase();
      } else {
        avatar.innerText = `P${i}`;
      }
    });

    const phoneInput = card.querySelector(".participant-phone");
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, "");
      validateAllPhoneInputs();
    });

    const paidInput = card.querySelector(".participant-paid");
    const userCurrSelect = card.querySelector(".participant-currency");

    paidInput.addEventListener("input", updateRemainingBalance);
    userCurrSelect.addEventListener("change", () => {
      checkUserHistory(card);
      updateRemainingBalance();
    });
  }

  updateRemainingBalance();
});

// =============================================================
// STEP 2: CALCULATE SPLIT & COMPARE CONSUMPTION VS PAYMENT
// =============================================================
calculateBtn.addEventListener("click", () => {
  const groupName = groupNameInput.value.trim();
  if (!groupName) {
    alert("Please enter a Group Name first.");
    groupNameInput.focus();
    return;
  }

  const billCurrency = billCurrencySelect.value;
  const rawBillAmount = parseFloat(totalBillInput.value);
  const count = parseInt(numUsersInput.value, 10);
  const isCustomSplit = splitMethodSelect && splitMethodSelect.value === "CUSTOM";

  if (isNaN(rawBillAmount) || isNaN(count) || count <= 0) {
    alert("Please configure the total bill and number of participants.");
    return;
  }

  const cards = document.querySelectorAll(".participant-card");
  if (cards.length === 0) {
    alert("Please generate participants first.");
    return;
  }

  const nameRegex = /^[A-Za-z\s]+$/;
  const phoneRegex = /^[0-9]{10}$/;

  const billRateToINR = RATES_TO_INR[billCurrency];
  const totalBillINR = rawBillAmount * billRateToINR;

  const participants = [];
  const enteredPhones = new Set();
  let totalPaidInINR = 0;
  let totalSharesOriginal = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const nameInput = card.querySelector(".participant-name");
    const phoneInput = card.querySelector(".participant-phone");
    const currSelect = card.querySelector(".participant-currency");
    const paidInput = card.querySelector(".participant-paid");
    const shareInput = card.querySelector(".participant-share");

    const rawName = nameInput.value.trim();
    const rawPhone = phoneInput.value.trim();
    const userCurr = currSelect.value;
    const paidOriginal = parseFloat(paidInput.value) || 0.0;
    const personalShareOriginal = parseFloat(shareInput.value) || 0.0;

    if (!nameRegex.test(rawName)) {
      alert(`Invalid Name for Participant ${i + 1}: Name can only contain alphabets and spaces.`);
      nameInput.focus();
      return;
    }

    if (!phoneRegex.test(rawPhone)) {
      alert(`Invalid Phone Number for "${rawName}": Must be exactly 10 digits.`);
      phoneInput.focus();
      return;
    }

    if (enteredPhones.has(rawPhone)) {
      alert(`Duplicate Phone Number: "${rawPhone}" is entered more than once.`);
      phoneInput.focus();
      return;
    }
    enteredPhones.add(rawPhone);

    const userRateToINR = RATES_TO_INR[userCurr] || 1.0;
    const paidInINR = Number((paidOriginal * userRateToINR).toFixed(2));
    totalPaidInINR += paidInINR;

    const personalShareINR = Number((personalShareOriginal * billRateToINR).toFixed(2));
    totalSharesOriginal += personalShareOriginal;

    // Check Deficit Rule
    const pastDebt = parseFloat(card.dataset.pendingDebtInr || "0");
    if (pastDebt > 0.01 && paidInINR < (personalShareINR - 0.5)) {
      alert(`Payment Blocked for ${rawName}: You currently have an earlier deficit of ₹${pastDebt.toFixed(2)}. You cannot pay less than your split share (₹${personalShareINR.toFixed(2)}). Please clear your earlier deficit first.`);
      paidInput.focus();
      return;
    }

    const appliedCredit = parseFloat(card.dataset.appliedCreditInr || "0");

    participants.push({
      id: i + 1,
      name: rawName,
      phone: rawPhone,
      currency: userCurr,
      paidOriginal: paidOriginal,
      paidInINR: paidInINR,
      personalShareOriginal: personalShareOriginal,
      personalShareINR: personalShareINR,
      appliedCreditInr: appliedCredit,
      pastDebtInr: pastDebt
    });
  }

  // Verification 1: In Custom Split mode, individual shares must sum to total bill
  if (isCustomSplit) {
    const shareDiff = Math.abs(totalSharesOriginal - rawBillAmount);
    if (shareDiff > 1.0) {
      validationMessage.innerText = `Custom Share Error: Sum of individual consumption shares (${CURRENCY_SYMBOLS[billCurrency] || ""}${totalSharesOriginal.toFixed(2)}) must equal Total Bill (${CURRENCY_SYMBOLS[billCurrency] || ""}${rawBillAmount.toFixed(2)}). Discrepancy: ${CURRENCY_SYMBOLS[billCurrency] || ""}${(rawBillAmount - totalSharesOriginal).toFixed(2)}`;
      summaryOverview.innerHTML = "";
      balancesList.innerHTML = "";
      settlementPlan.innerHTML = "";
      finalizeSaveBtn.style.display = "none";
      return;
    }
  }

  // Verification 2: Verify total payments equal total bill
  const differenceINR = Math.abs(totalPaidInINR - totalBillINR);
  if (differenceINR > 1.0) {
    validationMessage.innerText = `Validation Error: Sum of payments (₹${totalPaidInINR.toFixed(2)}) does not match Total Bill (₹${totalBillINR.toFixed(2)}). Discrepancy: ₹${(totalBillINR - totalPaidInINR).toFixed(2)}`;
    summaryOverview.innerHTML = "";
    balancesList.innerHTML = "";
    settlementPlan.innerHTML = "";
    finalizeSaveBtn.style.display = "none";
    return;
  }

  validationMessage.innerText = "✓ Verification successful! Payments and individual shares match the total bill.";

  targetCurrencyGlobal = splitCurrencyPref.value === "INR" ? "INR" : billCurrency;
  targetSymbolGlobal = CURRENCY_SYMBOLS[targetCurrencyGlobal] || `${targetCurrencyGlobal} `;
  const targetRateToINR = RATES_TO_INR[targetCurrencyGlobal];

  const totalBillTarget = totalBillINR / targetRateToINR;

  // Calculate Net Balances: (What they paid - What they consumed)
  participants.forEach((p) => {
    p.paidInTarget = Number((p.paidInINR / targetRateToINR).toFixed(2));
    p.shareInTarget = Number((p.personalShareINR / targetRateToINR).toFixed(2));

    const netBalance = Number((p.paidInTarget - p.shareInTarget).toFixed(2));
    p.netBalance = netBalance;

    if (netBalance > 0.01) {
      p.status = "SURPLUS"; // Paid more than their share
    } else if (netBalance < -0.01) {
      p.status = "DEFICIT"; // Paid less than their share
    } else {
      p.status = "SETTLED"; // Paid exactly their share
    }
  });

  currentParticipantsData = participants;
  isBillAlreadySaved = false;

  // Overview Panel
  summaryOverview.innerHTML = `
    <div class="status-overview-panel">
      <div class="overview-metric-card">
        <div class="metric-label">Group Name</div>
        <div class="metric-val">${groupName}</div>
      </div>
      <div class="overview-metric-card">
        <div class="metric-label">Split Mode</div>
        <div class="metric-val" style="font-size: 16px;">${isCustomSplit ? "Custom (Individual Share)" : "Equal Split"}</div>
      </div>
      <div class="overview-metric-card">
        <div class="metric-label">Total Bill (${targetCurrencyGlobal})</div>
        <div class="metric-val" style="color: var(--primary);">${targetSymbolGlobal}${totalBillTarget.toFixed(2)}</div>
      </div>
    </div>
  `;

  const totalCount = participants.length;
  const surplusCount = participants.filter((p) => p.status === "SURPLUS").length;
  const deficitCount = participants.filter((p) => p.status === "DEFICIT").length;
  const settledCount = participants.filter((p) => p.status === "SETTLED").length;

  let balancesHTML = `
    <h3>Participant Split Status & Actions (${targetCurrencyGlobal})</h3>
    <div class="split-filter-bar">
      <button type="button" class="filter-pill active" data-filter="all">All <span class="pill-badge">${totalCount}</span></button>
      <button type="button" class="filter-pill" data-filter="surplus">📈 Surplus <span class="pill-badge">${surplusCount}</span></button>
      <button type="button" class="filter-pill" data-filter="deficit">📉 Deficit <span class="pill-badge">${deficitCount}</span></button>
      <button type="button" class="filter-pill" data-filter="settled">✓ Settled <span class="pill-badge">${settledCount}</span></button>
    </div>
    <div id="status-cards-wrapper">
  `;

  participants.forEach((p) => {
    const initials = p.name.slice(0, 2).toUpperCase();
    const percentOfShare = p.shareInTarget > 0 ? Math.min(100, Math.round((p.paidInTarget / p.shareInTarget) * 100)) : 100;

    if (p.status === "SURPLUS") {
      balancesHTML += `
        <div class="action-result-card surplus-card" data-status="surplus">
          <div class="result-card-header">
            <div class="user-identity">
              <div class="avatar-circle" style="width:38px; height:38px; font-size:13px;">${initials}</div>
              <div>
                <strong style="font-size: 16px;">${p.name}</strong>
                <div style="color:var(--text-muted); font-size:12px;">📱 ${p.phone}</div>
              </div>
            </div>
            <span class="status-chip surplus-chip">📈 +${targetSymbolGlobal}${p.netBalance.toFixed(2)} Surplus</span>
          </div>
          <div class="card-meter-wrapper">
            <div class="meter-labels">
              <span>Paid: ${targetSymbolGlobal}${p.paidInTarget.toFixed(2)}</span>
              <span>Owed Split: ${targetSymbolGlobal}${p.shareInTarget.toFixed(2)} (Overpaid by ${targetSymbolGlobal}${p.netBalance.toFixed(2)})</span>
            </div>
            <div class="meter-track"><div class="meter-fill" style="width: 100%;"></div></div>
          </div>
          <label>Select action for this +${targetSymbolGlobal}${p.netBalance.toFixed(2)} surplus:</label>
          <div class="choice-tiles-group">
            <label class="choice-tile selected">
              <input type="radio" name="surplus_pref_${p.phone}" class="surplus-pref" data-phone="${p.phone}" value="SAVE_LATER" checked>
              <span class="choice-tile-icon">💾</span>
              <span>Save for next settlement</span>
            </label>
            <label class="choice-tile">
              <input type="radio" name="surplus_pref_${p.phone}" class="surplus-pref" data-phone="${p.phone}" value="PAY_ASAP">
              <span class="choice-tile-icon">⚡</span>
              <span>Receive payout ASAP</span>
            </label>
          </div>
        </div>
      `;
    } else if (p.status === "DEFICIT") {
      const owesAmount = Math.abs(p.netBalance);
      balancesHTML += `
        <div class="action-result-card deficit-card" data-status="deficit">
          <div class="result-card-header">
            <div class="user-identity">
              <div class="avatar-circle" style="width:38px; height:38px; font-size:13px; background: linear-gradient(135deg, #f43f5e, #fb7185);">${initials}</div>
              <div>
                <strong style="font-size: 16px;">${p.name}</strong>
                <div style="color:var(--text-muted); font-size:12px;">📱 ${p.phone}</div>
              </div>
            </div>
            <span class="status-chip deficit-chip">📉 -${targetSymbolGlobal}${owesAmount.toFixed(2)} Deficit</span>
          </div>
          <div class="card-meter-wrapper">
            <div class="meter-labels">
              <span>Paid: ${targetSymbolGlobal}${p.paidInTarget.toFixed(2)}</span>
              <span>Owed Split: ${targetSymbolGlobal}${p.shareInTarget.toFixed(2)} (${percentOfShare}% covered)</span>
            </div>
            <div class="meter-track"><div class="meter-fill" style="width: ${percentOfShare}%;"></div></div>
          </div>
          <label>Payment timing for ${targetSymbolGlobal}${owesAmount.toFixed(2)}:</label>
          <div class="choice-tiles-group">
            <label class="choice-tile selected">
              <input type="radio" name="deficit_pref_${p.phone}" class="deficit-pref" data-phone="${p.phone}" value="PAY_NOW" checked>
              <span class="choice-tile-icon">💳</span>
              <span>Pay right now</span>
            </label>
            <label class="choice-tile">
              <input type="radio" name="deficit_pref_${p.phone}" class="deficit-pref" data-phone="${p.phone}" value="PAY_LATER">
              <span class="choice-tile-icon">⏳</span>
              <span>Pay later (Record debt)</span>
            </label>
          </div>
        </div>
      `;
    } else {
      balancesHTML += `
        <div class="action-result-card settled-card" data-status="settled">
          <div class="result-card-header">
            <div class="user-identity">
              <div class="avatar-circle" style="width:38px; height:38px; font-size:13px; background: #64748b;">${initials}</div>
              <div>
                <strong style="font-size: 16px;">${p.name}</strong>
                <div style="color:var(--text-muted); font-size:12px;">📱 ${p.phone}</div>
              </div>
            </div>
            <span class="status-chip settled-chip">✓ Exactly Settled</span>
          </div>
          <div class="card-meter-wrapper">
            <div class="meter-labels">
              <span>Paid: ${targetSymbolGlobal}${p.paidInTarget.toFixed(2)}</span>
              <span>100% of consumption share (${targetSymbolGlobal}${p.shareInTarget.toFixed(2)}) covered</span>
            </div>
            <div class="meter-track"><div class="meter-fill" style="width: 100%;"></div></div>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Everything is balanced. No further action needed.</p>
        </div>
      `;
    }
  });

  balancesHTML += `</div>`;
  balancesList.innerHTML = balancesHTML;

  // Choice Tile clicks
  const allChoiceTiles = balancesList.querySelectorAll(".choice-tile");
  allChoiceTiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      const parentGroup = tile.closest(".choice-tiles-group");
      parentGroup.querySelectorAll(".choice-tile").forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
      const radio = tile.querySelector("input");
      if (radio) radio.checked = true;
    });
  });

  // Filter Pills Navigation
  const filterPills = balancesList.querySelectorAll(".filter-pill");
  const resultCards = balancesList.querySelectorAll(".action-result-card");

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      const filter = pill.dataset.filter;
      resultCards.forEach((card) => {
        if (filter === "all" || card.dataset.status === filter) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  finalizeSaveBtn.style.display = "inline-block";
  finalizeSaveBtn.disabled = false;
  finalizeSaveBtn.innerText = "Save Group Data & Generate Final Plan";
  settlementPlan.innerHTML = "";
});

// =============================================================
// STEP 3: FINALIZE, PERSIST IN LOCALSTORAGE & SETTLE
// =============================================================
finalizeSaveBtn.addEventListener("click", () => {
  if (isBillAlreadySaved) {
    alert("This settlement has already been saved!");
    return;
  }

  const groupName = groupNameInput.value.trim().toLowerCase();
  const surplusRadios = document.querySelectorAll(".surplus-pref:checked");
  const deficitRadios = document.querySelectorAll(".deficit-pref:checked");

  const surplusChoices = {};
  surplusRadios.forEach((radio) => {
    surplusChoices[radio.dataset.phone] = radio.value;
  });

  const deficitChoices = {};
  deficitRadios.forEach((radio) => {
    deficitChoices[radio.dataset.phone] = radio.value;
  });

  const targetRateToINR = RATES_TO_INR[targetCurrencyGlobal];

  currentParticipantsData.forEach((p) => {
    let newCreditINR = 0.0;
    let newDebtINR = 0.0;

    if (p.status === "SURPLUS") {
      p.preference = surplusChoices[p.phone] || "SAVE_LATER";
      if (p.preference === "SAVE_LATER") {
        newCreditINR = p.netBalance * targetRateToINR;
        p.savedWalletBalance = p.netBalance;
      } else {
        p.savedWalletBalance = 0.0;
      }
      p.pendingDebt = 0.0;
    } else if (p.status === "DEFICIT") {
      p.preference = deficitChoices[p.phone] || "PAY_NOW";
      if (p.preference === "PAY_LATER") {
        newDebtINR = Math.abs(p.netBalance) * targetRateToINR;
        p.pendingDebt = Math.abs(p.netBalance);
      } else {
        p.pendingDebt = 0.0;
      }
      p.savedWalletBalance = 0.0;
    } else {
      p.preference = "SETTLED";
      p.savedWalletBalance = 0.0;
      p.pendingDebt = 0.0;
    }

    saveUserLedger(p.phone, p.name, newCreditINR, newDebtINR);
  });

  const groupRecord = {
    groupName: groupNameInput.value.trim(),
    lastUpdated: new Date().toLocaleDateString(),
    currency: targetCurrencyGlobal,
    currencySymbol: targetSymbolGlobal,
    participants: currentParticipantsData
  };

  localStorage.setItem(`group_${groupName}`, JSON.stringify(groupRecord));
  isBillAlreadySaved = true;
  finalizeSaveBtn.disabled = true;
  finalizeSaveBtn.innerText = "✓ Saved to Database";

  // Build Final Settlement Plan
  const activeDebtors = currentParticipantsData
    .filter((p) => p.status === "DEFICIT" && p.preference === "PAY_NOW")
    .map((d) => ({ name: d.name, amount: Math.abs(d.netBalance) }));

  const activeCreditors = currentParticipantsData
    .filter((p) => p.status === "SURPLUS" && p.preference === "PAY_ASAP")
    .map((c) => ({ name: c.name, amount: c.netBalance }));

  const immediateTransactions = calculateSettlements(activeDebtors, activeCreditors);

  let planHTML = `<h3>Final Settlement Plan (${targetCurrencyGlobal})</h3>`;
  if (immediateTransactions.length === 0) {
    planHTML += `<p>No immediate cash transfers needed (balances either saved for next settlement or already settled).</p>`;
  } else {
    planHTML += `<ol>`;
    immediateTransactions.forEach((tx) => {
      planHTML += `<li><strong>${tx.from}</strong> pays <strong>${tx.to}</strong> ${targetSymbolGlobal}${tx.amount.toFixed(2)}</li>`;
    });
    planHTML += `</ol>`;
  }

  const rolledOver = currentParticipantsData.filter((p) => p.savedWalletBalance > 0);
  const deferredDebts = currentParticipantsData.filter((p) => p.pendingDebt > 0);

  if (rolledOver.length > 0 || deferredDebts.length > 0) {
    planHTML += `<h4>Saved for Next Settlement:</h4><ul>`;
    rolledOver.forEach((r) => {
      planHTML += `<li>💾 <strong>${r.name}</strong> saved surplus of <strong>${targetSymbolGlobal}${r.savedWalletBalance.toFixed(2)}</strong> for the next settlement.</li>`;
    });
    deferredDebts.forEach((d) => {
      planHTML += `<li>⏳ <strong>${d.name}</strong> saved deficit of <strong>${targetSymbolGlobal}${d.pendingDebt.toFixed(2)}</strong> to be paid later.</li>`;
    });
    planHTML += `</ul>`;
  }

  planHTML += `<p style="color: green;"><strong>Success:</strong> Saved! You can inspect records on the <a href="groups.html">Group Settlements</a> page.</p>`;
  settlementPlan.innerHTML = planHTML;
});

// Greedy minimum cash flow settlement matcher
function calculateSettlements(debtors, creditors) {
  const transactions = [];
  const debtorsCopy = debtors.map((d) => ({ ...d }));
  const creditorsCopy = creditors.map((c) => ({ ...c }));

  let i = 0;
  let j = 0;

  while (i < debtorsCopy.length && j < creditorsCopy.length) {
    const settleAmount = Math.min(debtorsCopy[i].amount, creditorsCopy[j].amount);

    if (settleAmount > 0.009) {
      transactions.push({
        from: debtorsCopy[i].name,
        to: creditorsCopy[j].name,
        amount: Number(settleAmount.toFixed(2))
      });
    }

    debtorsCopy[i].amount -= settleAmount;
    creditorsCopy[j].amount -= settleAmount;

    if (debtorsCopy[i].amount < 0.01) i++;
    if (creditorsCopy[j].amount < 0.01) j++;
  }

  return transactions;
}

// =============================================================
// CONFETTI CELEBRATION ENGINE
// =============================================================
function launchSettlementConfetti() {
  const canvas = document.getElementById("settlement-confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confettiPieces = [];
  const colors = ["#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6", "#34d399"];

  for (let i = 0; i < 110; i++) {
    confettiPieces.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      r: Math.random() * 6 + 3,
      d: Math.random() * 80 + 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0,
      vx: (Math.random() - 0.5) * 22,
      vy: (Math.random() - 0.7) * 22,
      opacity: 1
    });
  }

  let animationFrame;
  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let activePieces = 0;

    confettiPieces.forEach((p) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) * 0.4;
      p.x += Math.sin(p.d);
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.vx *= 0.97;
      p.tilt = Math.sin(p.tiltAngle - activePieces / 3) * 15;
      p.opacity -= 0.007;

      if (p.opacity > 0) {
        activePieces++;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
      }
    });

    if (activePieces > 0) {
      animationFrame = requestAnimationFrame(renderConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  renderConfetti();
}

// Trigger confetti when clicking the Finalize / Save button
if (finalizeSaveBtn) {
  const existingSaveHandler = finalizeSaveBtn.onclick;
  finalizeSaveBtn.addEventListener("click", () => {
    setTimeout(launchSettlementConfetti, 100);
  });
}

// Quick Preset Chip Listeners
const presetChips = document.querySelectorAll(".preset-chip");
presetChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    presetChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    const preset = chip.dataset.preset;
    if (preset === "equal" && splitMethodSelect) {
      splitMethodSelect.value = "EQUAL";
      splitMethodSelect.dispatchEvent(new Event("change"));
    } else if (preset === "custom" && splitMethodSelect) {
      splitMethodSelect.value = "CUSTOM";
      splitMethodSelect.dispatchEvent(new Event("change"));
    } else if (preset === "single-payer") {
      const cards = document.querySelectorAll(".participant-card");
      if (cards.length > 0) {
        cards.forEach((c, idx) => {
          const paidInput = c.querySelector(".participant-paid");
          if (idx === 0) {
            paidInput.value = totalBillInput.value || 0;
          } else {
            paidInput.value = 0;
          }
        });
        updateRemainingBalance();
      }
    }
  });
});

// =============================================================
// MS TEAMS STYLE COIN-DROP SOUND & RAINING MONEY BURST (3.5s)
// =============================================================

// 1. Pure Web Audio API Metallic Coin Drop Sound
function playCoinDropSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Metallic chime frequency pairs for a realistic coin ping
    const frequencies = [987.77, 1318.51, 1567.98, 2093.00];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      // Volume envelope (fast attack, resonant metallic decay)
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.log("AudioContext autoplay handled:", e);
  }
}

// 2. Physics-based Raining Money Burst (Coins, Notes, and Shimmer)
function triggerMoneyRainBurst() {
  const canvas = document.getElementById("money-rain-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  playCoinDropSound();

  const particles = [];
  const symbols = ["₹", "$", "€", "💵", "✨", "🪙"];
  const count = 90;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5 - 20, // Start above the screen
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      size: Math.random() * 16 + 18,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 4, // Gravity fall speed
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 8,
      wobble: Math.random() * 10,
      opacity: 1
    });
  }

  const startTime = Date.now();
  const DURATION_MS = 8000; // Plays for 3.5 seconds

  function animate() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.wobble) * 1.5;
      p.wobble += 0.05;
      p.rot += p.vRot;

      // Fade out smoothly during the final 800ms
      if (elapsed > DURATION_MS - 800) {
        p.opacity = Math.max(0, (DURATION_MS - elapsed) / 800);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;

      if (p.symbol === "💵" || p.symbol === "✨" || p.symbol === "🪙") {
        ctx.font = `${p.size}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 0);
      } else {
        // Render 3D Gold Coin with Currency Sign
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b"; // Gold coin surface
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#d97706";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${p.size * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 1);
      }

      ctx.restore();
    });

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(animate);
}

// 3. Connect to the "Calculate Split & Preferences" button
if (calculateBtn) {
  calculateBtn.addEventListener("click", () => {
    // Only trigger if validation passes and results are shown
    setTimeout(() => {
      if (document.querySelectorAll(".action-result-card").length > 0) {
        triggerMoneyRainBurst();
      }
    }, 150);
  });
}