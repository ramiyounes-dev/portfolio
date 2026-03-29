/**
 * main.js — Mainframe Banking System UI Controller
 * Manages all AJAX calls to Flask/COBOL backend and DOM updates.
 */

// ─── State ──────────────────────────────────────────────────────────
let allTransactions = [];      // Committed transactions
let pendingTransactions = [];  // Unsorted pending
let sortedTransactions = [];   // Sorted but not committed
let accounts = [];
let batchBoundaries = [];
let batchState = null;
let selectedAccountNum = null;
let selectedBatchNum = null;
let busy = false;

// ─── Init ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initSystem();
});

async function initSystem() {
    setActionLog('Initializing mainframe banking system...\nSeeding accounts and transactions...\nCalling COBOL CREATE-ACCOUNT for 10 records...');

    try {
        const res = await fetch('/api/init', { method: 'POST' });
        const data = await res.json();

        accounts = data.accounts || [];
        allTransactions = data.transactions || [];
        batchBoundaries = data.batch_boundaries || [];
        batchState = data.batch_state;
        pendingTransactions = [];
        sortedTransactions = [];

        renderTransactionLedger();
        renderAccountsLedger();
        updateBatchStatus();

        setActionLog(
            'System initialized successfully.\n' +
            `Loaded ${accounts.length} accounts.\n` +
            `Loaded ${allTransactions.length} committed transactions.\n` +
            `Across ${batchBoundaries.length} historical batches.\n\n` +
            'Ready for operations.'
        );
        setResultsLog('System ready.\nSelect an account and click "Check Transactions" to query.\nClick a batch divider to inspect that batch.');
    } catch (err) {
        setActionLog('ERROR: Failed to initialize system.\n' + err.message);
    }
}

// ─── Transaction Ledger ─────────────────────────────────────────────

function renderTransactionLedger() {
    const tbody = document.getElementById('txn-body');
    tbody.innerHTML = '';

    let currentBatch = 0;
    const totalCount = allTransactions.length + pendingTransactions.length + sortedTransactions.length;

    // Render committed transactions grouped by batch
    for (let i = 0; i < allTransactions.length; i++) {
        const txn = allTransactions[i];
        const batchNum = parseInt(txn.batch_num) || 0;

        // Insert batch divider when batch changes
        if (batchNum > currentBatch) {
            if (currentBatch > 0) {
                const boundary = batchBoundaries.find(b => b.batch_num === currentBatch);
                const ts = boundary ? formatTimestamp(boundary.timestamp) : '';
                tbody.appendChild(createBatchDivider(currentBatch, ts));
            }
            currentBatch = batchNum;
        }

        const rowState = txn.status === 'ALERT' ? 'alert' : 'committed';
        tbody.appendChild(createTxnRow(txn, rowState));
    }

    // Final committed batch divider
    if (currentBatch > 0) {
        const boundary = batchBoundaries.find(b => b.batch_num === currentBatch);
        const ts = boundary ? formatTimestamp(boundary.timestamp) : '';
        tbody.appendChild(createBatchDivider(currentBatch, ts));
    }

    // Render sorted (orange) transactions
    for (const txn of sortedTransactions) {
        tbody.appendChild(createTxnRow(txn, 'sorted'));
    }

    // Render pending (red) transactions
    for (const txn of pendingTransactions) {
        tbody.appendChild(createTxnRow(txn, 'pending'));
    }

    document.getElementById('txn-count').textContent = `${totalCount} records`;

    // Auto-scroll to bottom
    const ledger = document.getElementById('txn-ledger');
    ledger.scrollTop = ledger.scrollHeight;
}

function createTxnRow(txn, state) {
    const tr = document.createElement('tr');
    tr.className = `row-${state}`;
    tr.dataset.txnId = txn.txn_id;

    const amount = parseFloat(txn.amount) || 0;
    const amountClass = amount >= 0 ? 'amount-positive' : 'amount-negative';
    const amountStr = formatAmount(amount, txn.currency);

    const statusLabel = state === 'alert' ? 'ALERT' :
                        state === 'committed' ? 'COMMIT' :
                        state === 'sorted' ? 'SORTED' : 'PENDING';

    tr.innerHTML = `
        <td>${txn.txn_id || ''}</td>
        <td>${formatTimestamp(txn.timestamp)}</td>
        <td>${txn.acct_number || ''}</td>
        <td>${(txn.txn_type || '').trim()}</td>
        <td class="${amountClass}">${amountStr}</td>
        <td>${txn.currency || ''}</td>
        <td>${(txn.description || '').trim()}</td>
        <td>${statusLabel}</td>
    `;
    return tr;
}

function createBatchDivider(batchNum, timestamp) {
    const tr = document.createElement('tr');
    tr.className = 'batch-divider';
    if (batchNum === selectedBatchNum) {
        tr.classList.add('batch-selected');
    }
    tr.style.cursor = 'pointer';
    tr.onclick = () => selectBatch(batchNum);
    tr.innerHTML = `<td colspan="8">
        <div class="divider-line">
            ── BATCH #${batchNum} COMMITTED ${timestamp ? '[' + timestamp + ']' : ''} ──
        </div>
    </td>`;
    return tr;
}

function selectBatch(batchNum) {
    selectedBatchNum = batchNum;
    renderTransactionLedger();
    showBatchDetails(batchNum);
}

function showBatchDetails(batchNum) {
    // Gather all transactions in this batch
    const batchTxns = allTransactions.filter(t => parseInt(t.batch_num) === batchNum);
    const batchCommitted = batchTxns.filter(t => t.status !== 'ALERT');
    const batchAlerts = batchTxns.filter(t => t.status === 'ALERT');
    const boundary = batchBoundaries.find(b => b.batch_num === batchNum);

    // Compute per-account deltas (committed only)
    const deltas = {};
    for (const txn of batchCommitted) {
        const acctNum = txn.acct_number;
        if (!deltas[acctNum]) {
            deltas[acctNum] = { count: 0, total: 0, currency: txn.currency };
        }
        deltas[acctNum].count++;
        deltas[acctNum].total += parseFloat(txn.amount) || 0;
    }

    // Action log
    setActionLog(highlightCobol(
        `* Inspecting BATCH #${batchNum}\n` +
        `* Committed: ${boundary ? formatTimestamp(boundary.timestamp) : 'N/A'}\n` +
        `* Transactions: ${batchCommitted.length} committed` +
        (batchAlerts.length > 0 ? `, ${batchAlerts.length} alert(s)` : '') + `\n` +
        `* Accounts affected: ${Object.keys(deltas).length}\n\n` +
        `PROCEDURE DIVISION.\n` +
        `    OPEN INPUT TRANS-FILE\n` +
        `    PERFORM UNTIL WS-EOF = 1\n` +
        `        READ TRANS-FILE NEXT\n` +
        `        IF TXN-BATCH-NUM = ${batchNum}\n` +
        `            DISPLAY TXN record\n` +
        `        END-IF\n` +
        `    END-PERFORM\n\n` +
        `    -- Equivalent SQL:\n` +
        `    SELECT * FROM TRANSACTIONS\n` +
        `     WHERE BATCH_NUM = ${batchNum}\n` +
        `     ORDER BY ACCOUNT_NUMBER, TIMESTAMP;`
    ));

    // Results: batch summary + per-account impact
    let html = `BATCH #${batchNum} DETAILS\n`;
    html += `Committed: ${boundary ? formatTimestamp(boundary.timestamp) : 'N/A'}\n`;
    html += `${batchCommitted.length} committed`;
    if (batchAlerts.length > 0) html += `, <span class="log-error">${batchAlerts.length} alert(s)</span>`;
    html += '\n\n';
    html += `Per-Account Impact:\n`;
    html += '─'.repeat(54) + '\n';
    html += `${'ACCOUNT #'.padEnd(10)}  ${'TXNS'.padStart(4)}   ${'NET CHANGE'.padStart(14)}   CUR\n`;
    html += '─'.repeat(54) + '\n';

    const sortedAccts = Object.keys(deltas).sort();
    for (const acctNum of sortedAccts) {
        const d = deltas[acctNum];
        const net = d.total;
        const netStr = (net >= 0 ? '+' : '') + formatAmount(net, d.currency);
        const cls = net >= 0 ? 'log-success' : 'log-error';
        html += `<span class="${cls}">${acctNum}  ${String(d.count).padStart(4)}   ${netStr.padStart(14)}   ${d.currency}</span>\n`;
    }

    html += '─'.repeat(54) + '\n';
    html += `\nTransactions:\n`;
    html += `${'TXN ID'.padEnd(10)} | ${'ACCOUNT #'.padEnd(10)} | ${'TYPE'.padEnd(10)} | ${'AMOUNT'.padStart(14)} | STATUS\n`;
    html += '─'.repeat(84) + '\n';
    for (const txn of batchCommitted) {
        const amt = formatAmount(parseFloat(txn.amount) || 0, txn.currency).padStart(14);
        html += `${(txn.txn_id || '').padEnd(10)} | ${(txn.acct_number || '').padEnd(10)} | ${(txn.txn_type || '').trim().padEnd(10)} | ${amt} | <span class="log-success">COMMIT</span>\n`;
    }
    for (const txn of batchAlerts) {
        const amt = formatAmount(parseFloat(txn.amount) || 0, txn.currency).padStart(14);
        html += `<span class="log-error">${(txn.txn_id || '').padEnd(10)} | ${(txn.acct_number || '').padEnd(10)} | ${(txn.txn_type || '').trim().padEnd(10)} | ${amt} | ALERT </span>\n`;
    }

    document.getElementById('results-log').innerHTML = html;
}

// ─── Accounts Ledger ────────────────────────────────────────────────

function renderAccountsLedger() {
    const tbody = document.getElementById('acct-body');
    tbody.innerHTML = '';

    // Sort by account number
    const sorted = [...accounts].sort((a, b) =>
        (a.acct_number || '').localeCompare(b.acct_number || '')
    );

    for (const acct of sorted) {
        const tr = document.createElement('tr');
        tr.className = 'acct-row';
        if ((acct.status || '').trim().toUpperCase() === 'CLOSED') {
            tr.classList.add('acct-closed');
        }
        if (acct.acct_number === selectedAccountNum) {
            tr.classList.add('selected');
        }
        tr.dataset.acctNum = acct.acct_number;
        tr.onclick = () => selectAccount(acct.acct_number);

        const balance = parseFloat(acct.balance) || 0;
        const balClass = balance >= 0 ? 'amount-positive' : 'amount-negative';

        tr.innerHTML = `
            <td>${acct.acct_number || ''}</td>
            <td>${(acct.owner_name || '').trim()}</td>
            <td>${(acct.acct_type || '').trim()}</td>
            <td>${acct.currency || ''}</td>
            <td class="${balClass}">${formatAmount(balance, acct.currency)}</td>
            <td>${(acct.status || '').trim()}</td>
        `;
        tbody.appendChild(tr);
    }

    document.getElementById('acct-count').textContent = `${accounts.length} records`;
}

function selectAccount(acctNum) {
    selectedAccountNum = acctNum;
    selectedBatchNum = null;
    renderAccountsLedger();
    renderTransactionLedger();

    const acct = accounts.find(a => a.acct_number === acctNum);
    if (acct) {
        setResultsLog(
            `Account Selected: ${acct.acct_number}\n` +
            `Owner:    ${(acct.owner_name || '').trim()}\n` +
            `Type:     ${(acct.acct_type || '').trim()}\n` +
            `Currency: ${acct.currency}\n` +
            `Balance:  ${formatAmount(acct.balance, acct.currency)}\n` +
            `Status:   ${(acct.status || '').trim()}\n\n` +
            'Click "Check Transactions" to view history.'
        );
    }
}

// ─── Actions ────────────────────────────────────────────────────────

async function addRandom(count) {
    if (busy) return;
    setBusy(true);

    try {
        const res = await fetch('/api/add-random', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count }),
        });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            return;
        }

        // Add to pending
        for (const txn of (data.transactions || [])) {
            txn.status = 'PENDING';
            pendingTransactions.push(txn);
        }

        renderTransactionLedger();
        renderAccountsLedger();
        updateBatchStatus();

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }
    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

async function sortBatch() {
    if (busy) return;

    if (pendingTransactions.length === 0) {
        setActionLog('No pending transactions to sort.');
        return;
    }

    setBusy(true);

    try {
        const res = await fetch('/api/sort-batch', { method: 'POST' });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            return;
        }

        // Move pending to sorted
        sortedTransactions = data.transactions || [];
        pendingTransactions = [];

        renderTransactionLedger();
        updateBatchStatus();

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }
    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

async function updateBalances() {
    if (busy) return;

    if (sortedTransactions.length === 0 && pendingTransactions.length > 0) {
        setActionLog('ERROR: Batch must be sorted before posting. Please sort first.');
        alert('Batch must be sorted before posting. Please sort first.');
        return;
    }

    if (sortedTransactions.length === 0) {
        setActionLog('No sorted transactions to commit.');
        return;
    }

    // Snapshot balances before update for diff highlighting
    const balBefore = {};
    for (const acct of accounts) {
        balBefore[acct.acct_number] = acct.balance;
    }

    setBusy(true);

    try {
        const res = await fetch('/api/update-balances', { method: 'POST' });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            return;
        }

        // Get the current batch number for the divider
        const newBatchNum = sortedTransactions.length > 0 ?
            parseInt(sortedTransactions[0].batch_num) || (batchBoundaries.length + 1) :
            batchBoundaries.length + 1;

        // Move sorted to committed
        const committed = data.transactions || [];
        for (const txn of committed) {
            txn.status = 'COMMIT';
            allTransactions.push(txn);
        }

        // Add alert-flagged transactions (account not found)
        const alertTxns = data.alerts || [];
        for (const txn of alertTxns) {
            txn.status = 'ALERT';
            allTransactions.push(txn);
        }

        // Add batch boundary
        const now = new Date();
        const ts = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        batchBoundaries.push({
            batch_num: newBatchNum,
            last_txn_id: committed.length > 0 ? committed[committed.length - 1].txn_id : '',
            timestamp: ts,
        });

        sortedTransactions = [];
        pendingTransactions = [];

        // Update accounts from server response
        if (data.accounts) {
            accounts = data.accounts;
        }

        batchState = data.batch_state;
        selectedBatchNum = newBatchNum;
        renderTransactionLedger();
        renderAccountsLedger();
        updateBatchStatus();

        // Flash newly committed rows
        setTimeout(() => {
            document.querySelectorAll('#txn-body tr.row-committed').forEach(tr => {
                const txnId = tr.dataset.txnId;
                if (committed.find(t => t.txn_id === txnId)) {
                    tr.classList.add('row-flash');
                }
            });
        }, 100);

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }

        // Results summary with green highlights on changed balances
        let resultHtml = `Batch #${newBatchNum} committed: ${committed.length} transactions posted.\n`;
        if (alertTxns.length > 0) {
            resultHtml += `<span class="log-error">ALERT: ${alertTxns.length} transaction(s) skipped — account not found: ${alertTxns.map(t => t.acct_number).join(', ')}</span>\n`;
        }
        resultHtml += '\n';
        resultHtml += 'Updated Account Balances:\n';
        resultHtml += '─'.repeat(68) + '\n';
        resultHtml += `${'ACCOUNT #'.padEnd(10)}  ${'BEFORE'.padStart(14)}     ${'AFTER'.padStart(14)}  ${'CUR'}  CHANGE\n`;
        resultHtml += '─'.repeat(68) + '\n';
        for (const acct of accounts) {
            const before = balBefore[acct.acct_number];
            const isNew = before === undefined;
            const bal = parseFloat(acct.balance) || 0;
            const changed = isNew || before !== bal;
            const beforeStr = isNew ? '(new)'.padStart(14) : formatAmount(before, acct.currency).padStart(14);
            const afterStr = formatAmount(bal, acct.currency).padStart(14);
            const diff = isNew ? bal : Math.round((bal - before) * 100) / 100;
            const diffStr = diff === 0 ? '' : (diff > 0 ? '+' : '') + formatAmount(diff, acct.currency);
            if (changed) {
                resultHtml += `<span class="log-success">${acct.acct_number}  ${beforeStr}  \u2192  ${afterStr}  ${acct.currency}  ${diffStr}</span>\n`;
            } else {
                resultHtml += `${acct.acct_number}  ${beforeStr}     ${afterStr}  ${acct.currency}\n`;
            }
        }
        document.getElementById('results-log').innerHTML = resultHtml;

    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

function createAccount() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('new-acct-owner').focus();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

async function submitCreateAccount() {
    if (busy) return;
    setBusy(true);
    closeModal();

    const owner = document.getElementById('new-acct-owner').value || 'New Account Holder';
    const acctType = document.getElementById('new-acct-type').value;
    const currency = document.getElementById('new-acct-currency').value;
    const balance = document.getElementById('new-acct-balance').value || '0';

    try {
        const res = await fetch('/api/create-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, acct_type: acctType, currency, balance }),
        });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            return;
        }

        if (data.account) {
            accounts.push(data.account);
            renderAccountsLedger();
        }

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }

        setResultsLog(
            'Account created successfully.\n\n' +
            `Account #: ${data.account?.acct_number || 'N/A'}\n` +
            `Owner:     ${owner}\n` +
            `Type:      ${acctType}\n` +
            `Currency:  ${currency}\n` +
            `Balance:   ${balance}`
        );
    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

async function deleteAccount() {
    if (busy) return;
    if (!selectedAccountNum) {
        setActionLog('Select an account first.');
        return;
    }

    const acct = accounts.find(a => a.acct_number === selectedAccountNum);
    if (acct && (acct.status || '').trim().toUpperCase() === 'CLOSED') {
        setActionLog('Account is already closed.');
        return;
    }

    if (!confirm(`Close account ${selectedAccountNum}? This will drain any remaining balance.`)) {
        return;
    }

    setBusy(true);

    try {
        const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acct_number: selectedAccountNum }),
        });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            return;
        }

        // Update local state
        for (const acct of accounts) {
            if (acct.acct_number === selectedAccountNum) {
                acct.status = 'CLOSED';
                acct.balance = 0;
                break;
            }
        }
        renderAccountsLedger();

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }

        setResultsLog(
            `Account ${selectedAccountNum} has been closed.\n\n` +
            'Past transactions remain in the ledger.\n' +
            'The account is marked CLOSED \u2014 no new transactions accepted.'
        );
    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

async function checkTransactions() {
    if (busy) return;
    if (!selectedAccountNum) {
        setActionLog('Select an account first.');
        return;
    }

    setBusy(true);

    try {
        const res = await fetch('/api/query-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acct_number: selectedAccountNum }),
        });
        const data = await res.json();

        if (data.error) {
            setActionLog('ERROR: ' + data.error);
            setResultsLog('Query failed: ' + data.error);
            return;
        }

        if (data.action_log) {
            setActionLog(highlightCobol(data.action_log.join('\n')));
        }

        // Format results
        let text = '';
        if (data.account) {
            const a = data.account;
            text += `Account: ${a.acct_number}\n`;
            text += `Owner:   ${(a.owner_name || '').trim()}\n`;
            text += `Type:    ${(a.acct_type || '').trim()}\n`;
            text += `Currency:${a.currency}  Balance: ${formatAmount(a.balance, a.currency)}\n`;
            text += `Status:  ${(a.status || '').trim()}\n`;
            text += '\n';
        }

        if (data.sql_preview) {
            text += '-- SQL Equivalent:\n' + data.sql_preview + '\n\n';
        }

        text += `Transaction History (${(data.transactions || []).length} records):\n`;
        text += '\u2500'.repeat(70) + '\n';
        text += 'TXN ID     | TIMESTAMP        | TYPE       | AMOUNT          | BAL AFTER\n';
        text += '\u2500'.repeat(70) + '\n';

        for (const txn of (data.transactions || [])) {
            const amt = formatAmount(txn.amount, txn.currency).padStart(14);
            const bal = formatAmount(txn.running_bal, txn.currency).padStart(14);
            text += `${(txn.txn_id || '').padEnd(10)} | ${formatTimestamp(txn.timestamp).padEnd(16)} | ${(txn.txn_type || '').trim().padEnd(10)} | ${amt} | ${bal}\n`;
        }

        setResultsLog(text);
    } catch (err) {
        setActionLog('ERROR: ' + err.message);
    } finally {
        setBusy(false);
    }
}

// ─── UI Helpers ─────────────────────────────────────────────────────

function setActionLog(text) {
    document.getElementById('action-log').innerHTML = text;
    const el = document.getElementById('action-console');
    el.scrollTop = el.scrollHeight;
}

function setResultsLog(text) {
    document.getElementById('results-log').textContent = text;
    const el = document.getElementById('results-console');
    el.scrollTop = el.scrollHeight;
}

function updateBatchStatus() {
    const indicator = document.getElementById('batch-status-indicator');
    const batchSeqEl = document.getElementById('batch-seq');

    if (sortedTransactions.length > 0) {
        indicator.textContent = 'SORTED';
        indicator.className = 'status-sorted';
    } else if (pendingTransactions.length > 0) {
        indicator.textContent = 'PENDING';
        indicator.className = 'status-pending';
    } else {
        indicator.textContent = 'IDLE';
        indicator.className = 'status-idle';
    }

    const seq = batchState ? batchState.sequence_num : (batchBoundaries.length + 1);
    batchSeqEl.textContent = `BATCH #${seq}`;
}

function setBusy(state) {
    busy = state;
    document.querySelectorAll('.btn').forEach(btn => {
        btn.disabled = state;
    });
}

function formatTimestamp(ts) {
    if (!ts || ts.length < 8) return ts || '';
    const y = ts.substring(0, 4);
    const m = ts.substring(4, 6);
    const d = ts.substring(6, 8);
    const h = ts.substring(8, 10) || '00';
    const mi = ts.substring(10, 12) || '00';
    const s = ts.substring(12, 14) || '00';
    return `${y}-${m}-${d} ${h}:${mi}:${s}`;
}

function formatAmount(value, currency) {
    const num = parseFloat(value) || 0;
    const cur = (currency || '').trim();

    // Zero-decimal currencies
    if (cur === 'JPY' || cur === 'LBP') {
        return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function highlightCobol(text) {
    return text
        .replace(/\b(PROCEDURE|DIVISION|SORT|OPEN|CLOSE|READ|WRITE|REWRITE|MOVE|COMPUTE|ADD|IF|END-IF|PERFORM|UNTIL|INPUT|OUTPUT|EXTEND|I-O|ASCENDING|KEY|USING|GIVING|NOT|EQUAL|FUNCTION|RANDOM)\b/g,
            '<span class="log-keyword">$1</span>')
        .replace(/'([^']*)'/g, '<span class="log-string">\'$1\'</span>')
        .replace(/(\*[^\n]*)/g, '<span class="log-comment">$1</span>')
        .replace(/(--[^\n]*)/g, '<span class="log-comment">$1</span>')
        .replace(/(ERROR:[^\n]*)/g, '<span class="log-error">$1</span>');
}
