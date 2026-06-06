// ============================================================
//  Donation API Server  —  server.js
//  POST /api/donate  →  forwards to Frappe / ERPNext endpoint
// ============================================================

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ──────────────────────────────────────────────
//  STATIC CONFIG  (never changes)
// ──────────────────────────────────────────────
const STATIC = {
    API_URL: "https://erp.hkmhyd.org.in/api/method/dhananjaya.api.v1.direct.main.upload_donation",
    AUTH_TOKEN: "token 37cc2f1e9b7d168:50b6d424922f16a",

    receipt_series: "BJHR-WEB-.YY..MM.-.######",
    payment_method: "Gateway",
    print_remarks_on_receipt: true,
    try_patron_tagging: false,
};

// ──────────────────────────────────────────────
//  HELPER — normalise atg_required from UI
// ──────────────────────────────────────────────
function parseAtgRequired(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const v = value.trim().toLowerCase();
        if (v === "yes" || v === "true") return true;
        if (v === "no" || v === "false") return false;
    }
    return false;
}

// ──────────────────────────────────────────────
//  HELPER — today's date as YYYY-MM-DD
// ──────────────────────────────────────────────
function todayDate() {
    return new Date().toISOString().split("T")[0];
}

// ──────────────────────────────────────────────
//  POST /api/donate
// ──────────────────────────────────────────────
app.post("/api/donate", async (req, res) => {
    const body = req.body;

    // ---------- DYNAMIC fields (from UI / Excel) ----------
    const donor_name = body.donor_name || "";
    const pan_no = body.pan_no || "";
    const mobile = body.mobile || "";
    const email = body.email || "";
    const address = body.address || "";
    const amount = body.amount ?? 0;
    const seva = body.seva || "";
    const remarks = body.remarks || "";
    const atg_required = parseAtgRequired(body.atg_required);

    // trust & preacher — NOW DYNAMIC (sent from UI/Excel)
    const trust = body.trust || "None";
    const preacher = "HKWEB";

    // separated_address
    const sa = body.separated_address || {};
    const separated_address = {
        type: sa.type || "None",
        address_line_1: sa.address_line_1 || "None",
        address_line_2: sa.address_line_2 || "None",
        city: sa.city || "None",
        state: sa.state || "None",
        country: sa.country || "None",
        pin_code: sa.pin_code || "None",
    };

    // ---------- Build final payload ----------
    const payload = {
        donation: {
            // STATIC
            receipt_series: STATIC.receipt_series,
            payment_method: STATIC.payment_method,
            print_remarks_on_receipt: STATIC.print_remarks_on_receipt,
            try_patron_tagging: STATIC.try_patron_tagging,

            // AUTO
            donation_date: todayDate(),

            // DYNAMIC
            trust,
            preacher,
            donor_name,
            pan_no,
            mobile,
            email,
            address,
            separated_address,
            amount,
            seva,
            remarks,
            atg_required,
        },
    };

    // ---------- Forward to external API ----------
    try {
        const response = await axios.post(STATIC.API_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": STATIC.AUTH_TOKEN,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Donation submitted successfully",
            data: response.data,
        });
    } catch (error) {
        const errData = error.response?.data || error.message;
        console.error("Donation API error:", errData);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Failed to submit donation",
            error: errData,
        });
    }
});

// ──────────────────────────────────────────────
//  Start server
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Donation server running on http://localhost:${PORT}`);
});
