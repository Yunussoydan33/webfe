import React, { useState } from "react";

const Controls = ({ stream, setStream }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  let screenStream = null;

  // Mikrofon Aç/Kapa
  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  // Kamera Aç/Kapa
  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !isCameraOn;
      setIsCameraOn(!isCameraOn);
    }
  };

  // Ekran Paylaşımı Aç/Kapat
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setStream(screenStream);

        screenStream.getVideoTracks()[0].onended = () => {
          setStream(stream);
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (error) {
        console.error("Ekran paylaşımı hatası:", error);
      }
    } else {
      setStream(stream);
      setIsScreenSharing(false);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={toggleMic}>{isMicOn ? "Mikrofonu Kapat" : "Mikrofonu Aç"}</button>
      <button onClick={toggleCamera}>{isCameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"}</button>
      <button onClick={toggleScreenShare}>
        {isScreenSharing ? "Ekran Paylaşımını Durdur" : "Ekran Paylaşımını Başlat"}
      </button>
    </div>
  );
};

export default Controls;
