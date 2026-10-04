const searchGroupBtn = document.getElementById("search-group-btn");
const searchGroupInput = document.getElementById("search-group-name");
const clearAllDataBtn = document.getElementById("clear-all-data-btn");

const groupDetails = document.getElementById("group-details");
const groupSurplusList = document.getElementById("group-surplus-list");
const groupDeficitList = document.getElementById("group-deficit-list");
const groupSettledList = document.getElementById("group-settled-list");
const groupRolloverWallet = document.getElementById("group-rollover-wallet");

// Clear corrupted test data
clearAllDataBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all saved groups and user balances?")) {
    localStorage.clear();
    alert("All saved data cleared!");
    location.reload();
  }
});

searchGroupBtn.addEventListener("click", () => {
  const query = searchGroupInput.value.trim().toLowerCase();

  if (!query) {
    alert("Please enter a group name to search.");
    return;
  }

  const savedData = localStorage.getItem(`group_${query}`);

  if (!savedData) {
    groupDetails.innerHTML = `<p style="color: red;">No saved group found with name "<strong>${searchGroupInput.value.trim()}</strong>".</p>`;
    groupSurplusList.innerHTML = "";
    groupDeficitList.innerHTML = "";
    groupSettledList.innerHTML = "";
    groupRolloverWallet.innerHTML = "";
    return;
  }

  const group = JSON.parse(savedData);
  const sym = group.currencySymbol || "₹";

  groupDetails.innerHTML = `
    <h2>Group: ${group.groupName}</h2>
    <p><strong>Currency:</strong> ${group.currency}</p>
    <p><strong>Last Recorded Date:</strong> ${group.lastUpdated}</p>
    <hr>
  `;

  // Surplus Category
  const surplusMembers = group.participants.filter((p) => p.status === "SURPLUS");
  let surplusHTML = `<h3>Surplus Participants (Eligible for Refunds)</h3>`;
  if (surplusMembers.length === 0) {
    surplusHTML += `<p>None</p>`;
  } else {
    surplusHTML += `<ul>`;
    surplusMembers.forEach((p) => {
      surplusHTML += `<li><strong>${p.name}</strong> (${p.phone}) — Surplus Amount: ${sym}${p.netBalance.toFixed(2)} [Choice: ${p.preference}]</li>`;
    });
    surplusHTML += `</ul>`;
  }
  groupSurplusList.innerHTML = surplusHTML;

  // Deficit Category
  const deficitMembers = group.participants.filter((p) => p.status === "DEFICIT");
  let deficitHTML = `<h3>Deficit Participants (Owing Balance)</h3>`;
  if (deficitMembers.length === 0) {
    deficitHTML += `<p>None</p>`;
  } else {
    deficitHTML += `<ul>`;
    deficitMembers.forEach((p) => {
      deficitHTML += `<li><strong>${p.name}</strong> (${p.phone}) — Deficit Amount: ${sym}${Math.abs(p.netBalance).toFixed(2)} [Choice: ${p.preference}]</li>`;
    });
    deficitHTML += `</ul>`;
  }
  groupDeficitList.innerHTML = deficitHTML;

  // Settled Category
  const settledMembers = group.participants.filter((p) => p.status === "SETTLED");
  let settledHTML = `<h3>Settled Participants</h3>`;
  if (settledMembers.length === 0) {
    settledHTML += `<p>None</p>`;
  } else {
    settledHTML += `<ul>`;
    settledMembers.forEach((p) => {
      settledHTML += `<li><strong>${p.name}</strong> (${p.phone}) — Fully settled.</li>`;
    });
    settledHTML += `</ul>`;
  }
  groupSettledList.innerHTML = settledHTML;

  // Persistent Member Wallet & Outstanding Balances
  let ledgerHTML = `<h3>Persistent Member Wallet & Outstanding Balances</h3><ul>`;
  group.participants.forEach((p) => {
    const rawLedger = localStorage.getItem(`user_ledger_${p.phone}`);
    if (rawLedger) {
      const ledger = JSON.parse(rawLedger);
      ledgerHTML += `<li><strong>${p.name}</strong> (${p.phone}) — Wallet Credit: ₹${ledger.walletCredit.toFixed(2)} | Unpaid Debt: ₹${ledger.pendingDebt.toFixed(2)}</li>`;
    }
  });
  ledgerHTML += `</ul><hr>`;
  groupRolloverWallet.innerHTML = ledgerHTML;
});