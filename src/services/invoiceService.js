/**
 * services/invoiceService.js
 * Generates and prints HTML invoices for orders and sales.
 * Works 100% offline — opens a new window with embedded styles.
 */

import { formatDate } from '../utils/helpers.js';

const BDT = (n) => '৳' + Number(n || 0).toLocaleString('en-IN');

const INVOICE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
  .page { max-width: 680px; margin: 0 auto; padding: 32px 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; }
  .brand h1 { font-size: 22px; font-weight: 900; color: #1d4ed8; letter-spacing: -0.5px; }
  .brand p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .inv-meta { text-align: right; }
  .inv-meta h2 { font-size: 18px; font-weight: 700; color: #111; }
  .inv-meta p  { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .inv-num  { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 3px 10px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-top: 4px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .party h3 { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .party p  { font-size: 13px; color: #111; line-height: 1.6; }
  .party .name { font-weight: 700; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #1d4ed8; color: #fff; }
  thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  .totals { margin-left: auto; width: 260px; }
  .totals table { margin-bottom: 0; }
  .totals td { padding: 6px 10px; border: none; font-size: 13px; }
  .totals .label { color: #6b7280; }
  .totals .total-row { background: #1d4ed8; color: #fff; font-weight: 700; font-size: 15px; border-radius: 6px; }
  .totals .total-row td { padding: 10px; }
  .due-row { background: #fef2f2; color: #dc2626; font-weight: 700; }
  .due-row td { padding: 7px 10px; }
  .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .sig { text-align: center; }
  .footer .sig p { font-size: 11px; color: #6b7280; margin-top: 24px; border-top: 1px solid #d1d5db; padding-top: 6px; width: 160px; }
  .footer .note { font-size: 11px; color: #6b7280; max-width: 300px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-delivered { background: #dcfce7; color: #16a34a; }
  .badge-pending   { background: #fef9c3; color: #ca8a04; }
  .badge-completed { background: #dbeafe; color: #1d4ed8; }
  @media print { body { font-size: 12px; } .page { padding: 16px; } }
`;

/**
 * printOrderInvoice(order, factoryName)
 * Generates a printable order invoice.
 */
export const printOrderInvoice = (order, factoryName = 'Siam Plastic Factory') => {
  const badgeClass = {
    Delivered: 'badge-delivered',
    Completed: 'badge-completed',
    Pending:   'badge-pending',
  }[order.status] || 'badge-pending';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>Invoice ${order.orderId}</title>
  <style>${INVOICE_STYLES}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>🏭 ${factoryName}</h1>
      <p>Plastic Bottle Manufacturer · Bangladesh</p>
    </div>
    <div class="inv-meta">
      <h2>ORDER INVOICE</h2>
      <p>Issued: ${formatDate(new Date().toISOString().split('T')[0])}</p>
      <div class="inv-num">${order.orderId}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p class="name">${order.customerName}</p>
      ${order.phone   ? `<p>📞 ${order.phone}</p>`   : ''}
      ${order.address ? `<p>📍 ${order.address}</p>` : ''}
    </div>
    <div class="party" style="text-align:right;">
      <h3>Order Details</h3>
      <p>Status: <span class="status-badge ${badgeClass}">${order.status}</span></p>
      <p>Delivery: ${formatDate(order.deliveryDate)}</p>
      <p>Cap Included: ${order.capIncluded ? 'Yes' : 'No'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th style="text-align:center;">Quantity</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${order.productType}${order.capIncluded ? ' (with cap)' : ''}</td>
        <td style="text-align:center;">${Number(order.quantity).toLocaleString()} pcs</td>
        <td style="text-align:right;">${BDT(order.pricePerPiece)}</td>
        <td style="text-align:right;">${BDT(order.totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Sub Total</td><td style="text-align:right;">${BDT(order.totalAmount)}</td></tr>
      <tr><td class="label">Advance Paid</td><td style="text-align:right; color:#16a34a;">${BDT(order.advancePaid)}</td></tr>
      <tr class="total-row"><td>Total</td><td style="text-align:right;">${BDT(order.totalAmount)}</td></tr>
      ${order.dueAmount > 0
        ? `<tr class="due-row"><td>Due Balance</td><td style="text-align:right;">${BDT(order.dueAmount)}</td></tr>`
        : `<tr><td colspan="2" style="text-align:center;color:#16a34a;font-weight:700;padding:8px;">✓ Fully Paid</td></tr>`
      }
    </table>
  </div>

  <div class="footer">
    <div class="note">
      <p>Thank you for your business!</p>
      <p style="margin-top:4px;">For queries: contact the factory directly.</p>
    </div>
    <div class="sig">
      <p>Authorised Signature</p>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  _openPrintWindow(html);
};

/**
 * printSalesInvoice(sale, factoryName)
 * Generates a printable sales invoice.
 */
export const printSalesInvoice = (sale, factoryName = 'Siam Plastic Factory') => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${sale.invoiceNumber}</title>
  <style>${INVOICE_STYLES}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>🏭 ${factoryName}</h1>
      <p>Plastic Bottle Manufacturer · Bangladesh</p>
    </div>
    <div class="inv-meta">
      <h2>SALES INVOICE</h2>
      <p>Date: ${formatDate(sale.date)}</p>
      <div class="inv-num">${sale.invoiceNumber}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p class="name">${sale.customerName}</p>
      ${sale.phone ? `<p>📞 ${sale.phone}</p>` : ''}
    </div>
    <div class="party" style="text-align:right;">
      <h3>Payment</h3>
      <p>Method: ${sale.paymentMethod}</p>
      <p>Date: ${formatDate(sale.date)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th><th>Product</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${sale.product}</td>
        <td style="text-align:center;">${Number(sale.quantity).toLocaleString()} pcs</td>
        <td style="text-align:right;">${BDT(sale.rate)}</td>
        <td style="text-align:right;">${BDT(sale.total)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Sub Total</td><td style="text-align:right;">${BDT(sale.total)}</td></tr>
      <tr><td class="label">Amount Paid</td><td style="text-align:right; color:#16a34a;">${BDT(sale.paid)}</td></tr>
      <tr class="total-row"><td>Total</td><td style="text-align:right;">${BDT(sale.total)}</td></tr>
      ${sale.due > 0
        ? `<tr class="due-row"><td>Due Balance</td><td style="text-align:right;">${BDT(sale.due)}</td></tr>`
        : `<tr><td colspan="2" style="text-align:center;color:#16a34a;font-weight:700;padding:8px;">✓ Fully Paid</td></tr>`
      }
    </table>
  </div>

  <div class="footer">
    <div class="note"><p>Thank you for your business!</p></div>
    <div class="sig"><p>Authorised Signature</p></div>
  </div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  _openPrintWindow(html);
};

/**
 * printDailyReport(date, data, factoryName)
 * Prints a factory daily summary report.
 */
export const printDailyReport = (date, data, factoryName = 'Siam Plastic Factory') => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Daily Report — ${date}</title>
  <style>
    ${INVOICE_STYLES}
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 13px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #dbeafe; padding-bottom: 6px; margin-bottom: 12px; }
    .kv { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .kv:last-child { border-bottom: none; }
    .kv .v { font-weight: 600; }
    .profit-positive { color: #16a34a; }
    .profit-negative { color: #dc2626; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      <h1>🏭 ${factoryName}</h1>
      <p>Daily Factory Report</p>
    </div>
    <div class="inv-meta">
      <h2>DAILY REPORT</h2>
      <p>${formatDate(date)}</p>
    </div>
  </div>

  <div class="section">
    <h3>Production Summary</h3>
    <div class="kv"><span>Total Bottles Produced</span><span class="v">${(data.bottles || 0).toLocaleString()} pcs</span></div>
    <div class="kv"><span>Good Bottles</span><span class="v">${(data.goodBottles || 0).toLocaleString()} pcs</span></div>
    <div class="kv"><span>Rejected Bottles</span><span class="v" style="color:#dc2626;">${(data.rejects || 0).toLocaleString()} pcs</span></div>
    <div class="kv"><span>Caps Produced</span><span class="v">${(data.caps || 0).toLocaleString()} pcs</span></div>
    <div class="kv"><span>Shifts Worked</span><span class="v">${(data.shifts || []).join(', ') || '—'}</span></div>
  </div>

  <div class="section">
    <h3>Financial Summary</h3>
    <div class="kv"><span>Sales Revenue</span><span class="v" style="color:#16a34a;">${BDT(data.revenue)}</span></div>
    <div class="kv"><span>Production Cost</span><span class="v">${BDT(data.prodCost)}</span></div>
    <div class="kv"><span>Other Expenses</span><span class="v">${BDT(data.expenses)}</span></div>
    <div class="kv" style="background:#f8fafc;padding:8px;border-radius:6px;margin-top:4px;">
      <span style="font-weight:700;">Net Profit / Loss</span>
      <span class="v ${data.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}" style="font-size:15px;">
        ${data.netProfit >= 0 ? '+' : ''}${BDT(data.netProfit)}
      </span>
    </div>
  </div>

  <div class="footer">
    <div class="note"><p>Generated: ${new Date().toLocaleString()}</p></div>
    <div class="sig"><p>Factory Manager</p></div>
  </div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  _openPrintWindow(html);
};

// ─── Internal helper ──────────────────────────────────────────────────────────
const _openPrintWindow = (html) => {
  const win = window.open('', '_blank', 'width=750,height=600');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this app to print invoices.');
    return;
  }
  win.document.write(html);
  win.document.close();
};
