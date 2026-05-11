// Shared helpers for Rawqan static pages
window.RAWQAN = (function () {
  const SB_URL = "https://ikoajtpuimhzcecguyon.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb2FqdHB1aW1oemNlY2d1eW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTA0MDIsImV4cCI6MjA5MzcyNjQwMn0.pI5ndEBvDYLfp2pE5y4brx0xQfJi8BTrd1fLc4fSA9s";

  async function rest(path, opts = {}) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  return {
    SB_URL, SB_KEY,
    listFaqs: () => rest("chatbot_faqs?select=*&order=sort_order.asc"),
    listFaqsActive: () => rest("chatbot_faqs?select=*&active=eq.true&order=sort_order.asc"),
    addFaq: (row) => rest("chatbot_faqs", { method: "POST", body: JSON.stringify(row) }),
    updateFaq: (id, row) => rest(`chatbot_faqs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(row) }),
    deleteFaq: (id) => rest(`chatbot_faqs?id=eq.${id}`, { method: "DELETE" }),
    getSettings: async () => (await rest("chatbot_settings?select=*&limit=1"))[0],
    updateSettings: (id, row) => rest(`chatbot_settings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(row) }),
    listPayments: () => rest("payment_methods?select=*&order=sort_order.asc"),
    listPaymentsActive: () => rest("payment_methods?select=*&active=eq.true&order=sort_order.asc"),
    addPayment: (row) => rest("payment_methods", { method: "POST", body: JSON.stringify(row) }),
    updatePayment: (id, row) => rest(`payment_methods?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(row) }),
    deletePayment: (id) => rest(`payment_methods?id=eq.${id}`, { method: "DELETE" }),
  };
})();
