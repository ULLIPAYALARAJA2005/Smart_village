import React, { useState } from "react";
import VoiceComplaintModal from "./VoiceComplaintModal";
import "../styles/voiceFeature.css";

export default function VoiceFeatureSection({ userId }) {
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const handleSuccess = (issue) => {
    // you could toast a success message here
    closeModal();
  };

  return (
    <section className="voice-feature-section">
      <div className="voice-feature-container">
        <h2 className="voice-feature-title">Voice AI Complaint System</h2>
        <p className="voice-feature-subtitle">
          Speak your issue and we’ll file the complaint for you – no typing needed!
        </p>
        <button className="voice-mic-button" onClick={openModal} aria-label="Open voice complaint modal">
          <div className="mic-icon" />
        </button>
      </div>
      <VoiceComplaintModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
        userId={userId}
      />
    </section>
  );
}
