import React, { useState, useRef } from "react";

const Controls = ({ stream, setStream, peersRef }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  // Mikrofon Aç/Kapa
  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
      setIsMicOn(!isMicOn);
    }
  };

  // Kamera Aç/Kapa
  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
      setIsCameraOn(!isCameraOn);
    }
  };

  // Ekran Paylaşımı Aç/Kapat
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        // Yeni ekran paylaşımı akışını kaydet
        screenStreamRef.current = screenStream;
        setStream(screenStream);

        // Tüm peer'lerdeki videoyu değiştir
        if (peersRef?.current) {
          peersRef.current.forEach(({ peer }) => {
            peer.replaceTrack(
              stream.getVideoTracks()[0], // Mevcut kamerayı al
              screenStream.getVideoTracks()[0], // Ekran paylaşımına geçir
              stream
            );
          });
        }

        // Kullanıcı ekran paylaşımını durdurduğunda eski akışa geri dön
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (error) {
        console.error("Ekran paylaşımı hatası:", error);
      }
    } else {
      stopScreenShare();
    }
  };

  // Ekran Paylaşımını Durdur ve Kameraya Geri Dön
  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peersRef?.current) {
      peersRef.current.forEach(({ peer }) => {
        peer.replaceTrack(
          screenStreamRef.current?.getVideoTracks()[0], // Ekran paylaşımından dönerken
          stream.getVideoTracks()[0], // Kameraya geri dön
          screenStreamRef.current
        );
      });
    }

    setStream(stream);
    setIsScreenSharing(false);
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
