document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("participants-list-container");
  const globalSettlementContainer = document.getElementById("global-settlement-transactions");

  const countAll = document.getElementById("count-all");
  const countSurplus = document.getElementById("count-surplus");
  const countDeficit = document.getElementById("count-deficit");
  const countSettled = document.getElementById("count-settled");

  // Currency rate conversion helper
  const RATES_TO_INR = {
    INR: 1.0,
    USD: 83.5,
    EURO: 90.2,
    DHIRAMH: 22.7,
    DINAR: 271.8,
    YEN: 0.55,
    RUBEL: 0.91
  };

  // 1. Scan and aggregate all groups stored in localStorage
  const userMap = {}; // Keyed by phone number

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith("group_")) {
      try {
        const group = JSON.parse(localStorage.getItem(key));
        const groupName = group.groupName || key.replace("group_", "");
        const groupCurrency = group.currency || "INR";
        const rateToINR = RATES_TO_INR[groupCurrency] || 1.0;

        if (Array.isArray(group.participants)) {
          group.participants.forEach((p) => {
            const phone = p.phone;
            const name = p.name;
            // Normalize net balance into INR
            const netInTarget = p.netBalance !== undefined ? p.netBalance : 0;
            const netBalanceINR = Number((netInTarget * rateToINR).toFixed(2));

            if (!userMap[phone]) {
              userMap[phone] = {
                name: name,
                phone: phone,
                totalNetINR: 0,
                history: []
              };
            }

            userMap[phone].totalNetINR += netBalanceINR;
            userMap[phone].history.push({
              groupName: groupName,
              currency: groupCurrency,
              originalNet: netInTarget,
              netINR: netBalanceINR
            });
          });
        }
      } catch (err) {
        console.error("Error parsing group:", key, err);
      }
    }
  }

  const allUsers = Object.values(userMap);
  allUsers.forEach((u) => {
    u.totalNetINR = Number(u.totalNetINR.toFixed(2));
    if (u.totalNetINR > 0.01) u.category = "surplus";
    else if (u.totalNetINR < -0.01) u.category = "deficit";
    else u.category = "settled";
  });

  // 2. Compute Global Multi-Trip Debt Settlement (Who pays whom across all trips)
  const debtors = allUsers
    .filter((u) => u.category === "deficit")
    .map((u) => ({ name: u.name, phone: u.phone, amount: Math.abs(u.totalNetINR) }));

  const creditors = allUsers
    .filter((u) => u.category === "surplus")
    .map((u) => ({ name: u.name, phone: u.phone, amount: u.totalNetINR }));

  const globalSettlements = matchSettlements(debtors, creditors);

  // 3. Render Global Settlement Transactions
  if (globalSettlements.length === 0) {
    globalSettlementContainer.innerHTML = `
      <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; color: #15803d; font-weight: 700;">
        🎉 All square! No pending cross-trip payments required. Everyone is fully settled.
      </div>
    `;
  } else {
    let settlementHTML = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    globalSettlements.forEach((tx) => {
      settlementHTML += `
        <div class="money-flow-stage" style="margin: 4px 0;">
          <div class="flow-participant">
            <div class="flow-node-avatar debtor">${tx.from.slice(0, 2).toUpperCase()}</div>
            <span class="flow-name">${tx.from}</span>
          </div>

          <div class="flow-stream-line">
            <div class="flow-animated-particle"></div>
            <div class="flow-amount-pill">Pays ₹${tx.amount.toFixed(2)}</div>
          </div>

          <div class="flow-participant">
            <div class="flow-node-avatar creditor">${tx.to.slice(0, 2).toUpperCase()}</div>
            <span class="flow-name">${tx.to}</span>
          </div>
        </div>
      `;
    });
    settlementHTML += `</div>`;
    globalSettlementContainer.innerHTML = settlementHTML;
  }

  // 4. Update Tab Counters
  const surplusUsers = allUsers.filter((u) => u.category === "surplus");
  const deficitUsers = allUsers.filter((u) => u.category === "deficit");
  const settledUsers = allUsers.filter((u) => u.category === "settled");

  countAll.innerText = allUsers.length;
  countSurplus.innerText = surplusUsers.length;
  countDeficit.innerText = deficitUsers.length;
  countSettled.innerText = settledUsers.length;

  // 5. Render Individual Member Cards
  function renderList(list, filterName) {
    if (list.length === 0) {
      container.innerHTML = `<p style="padding: 16px; color: var(--text-muted);">No participants found under <strong>${filterName}</strong>.</p>`;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;
    list.forEach((user) => {
      let statusBadge = "";
      if (user.category === "surplus") {
        statusBadge = `<span class="status-chip surplus-chip">📈 Overall Surplus: +₹${user.totalNetINR.toFixed(2)} (Receives)</span>`;
      } else if (user.category === "deficit") {
        statusBadge = `<span class="status-chip deficit-chip">📉 Overall Deficit: -₹${Math.abs(user.totalNetINR).toFixed(2)} (Owes)</span>`;
      } else {
        statusBadge = `<span class="status-chip settled-chip">✓ Fully Settled (₹0.00)</span>`;
      }

      html += `
        <div class="participant-card" style="margin-bottom: 0;">
          <div class="card-header-bar">
            <div class="participant-avatar-badge">
              <div class="avatar-circle">${user.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3>${user.name}</h3>
                <small style="color: var(--text-muted);">📱 ${user.phone}</small>
              </div>
            </div>
            ${statusBadge}
          </div>

          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; font-weight: 700; color: var(--primary); font-size: 13px;">
              View breakdown across ${user.history.length} trip(s)
            </summary>
            <ul style="margin-top: 8px; list-style: none; padding-left: 0;">
      `;

      user.history.forEach((h) => {
        const sign = h.netINR >= 0 ? "+₹" : "-₹";
        const color = h.netINR >= 0 ? "green" : "red";
        html += `
          <li style="padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; font-size: 13px; display: flex; justify-content: space-between;">
            <span><strong>${h.groupName}</strong></span>
            <span style="color: ${color}; font-weight: 700;">${sign}${Math.abs(h.netINR).toFixed(2)}</span>
          </li>
        `;
      });

      html += `
            </ul>
          </details>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  // Initial list render
  renderList(allUsers, "All");

  // Tab switching
  const tabButtons = document.querySelectorAll(".filter-pill");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      if (tab === "all") renderList(allUsers, "All");
      else if (tab === "surplus") renderList(surplusUsers, "Surplus");
      else if (tab === "deficit") renderList(deficitUsers, "Deficit");
      else if (tab === "settled") renderList(settledUsers, "Settled");
    });
  });

  // Greedy Minimal Settlement Algorithm
  function matchSettlements(debtorsList, creditorsList) {
    const transactions = [];
    const deb = debtorsList.map((d) => ({ ...d }));
    const cred = creditorsList.map((c) => ({ ...c }));

    let i = 0;
    let j = 0;

    while (i < deb.length && j < cred.length) {
      const settleAmount = Math.min(deb[i].amount, cred[j].amount);

      if (settleAmount > 0.009) {
        transactions.push({
          from: deb[i].name,
          to: cred[j].name,
          amount: Number(settleAmount.toFixed(2))
        });
      }

      deb[i].amount -= settleAmount;
      cred[j].amount -= settleAmount;

      if (deb[i].amount < 0.01) i++;
      if (cred[j].amount < 0.01) j++;
    }

    return transactions;
  }
});