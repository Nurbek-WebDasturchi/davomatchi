import React, { useEffect, useState } from "react";

export default function ExcelSentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("attendance:excel-sent", show);
    return () => window.removeEventListener("attendance:excel-sent", show);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="excel-sent-backdrop" onMouseDown={() => setOpen(false)}>
      <section
        className="excel-sent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-sent-title"
        onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="excel-sent-close"
          onClick={() => setOpen(false)}
          aria-label="Yopish">
          <i className="fi fi-rr-cross-small" aria-hidden="true" />
        </button>
        <div className="excel-sent-check" aria-hidden="true">
          <i className="fi fi-rr-check" />
        </div>
        <div className="excel-sent-file" aria-hidden="true">
          <i className="fi fi-rr-file-excel" />
          <span>.XLSX</span>
        </div>
        <p className="excel-sent-eyebrow">MUVAFFAQIYATLI YUBORILDI</p>
        <h2 id="excel-sent-title">Fayl tayyor!</h2>
        <p className="excel-sent-copy">
          Davomat Excel fayli tayyorlandi va sizga Telegram bot orqali yuborildi.
        </p>
        <div className="excel-sent-destination">
          <i className="fi fi-rr-paper-plane" aria-hidden="true" />
          <span>Telegram bot chatini tekshiring</span>
        </div>
        <button className="excel-sent-confirm" onClick={() => setOpen(false)}>
          Tushunarli
        </button>
      </section>
    </div>
  );
}
