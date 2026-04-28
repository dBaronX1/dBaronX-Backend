"use client";
import React, { useEffect, useState } from 'react';

export default function PresalePopup() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  if (!showPopup) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}>
      <div style={{ background: "#fff", padding: 20 }}>
        <iframe
          src="https://forms.zoho.com/infodba1/form/dBaronXPrivateSaleCommitment"
          width="500"
          height="500"
        />
        <button
          onClick={() => setShowPopup(false)}
          style={{ marginTop: 10 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
