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

  // **Kamera Değiştir (Ön/Arka)**
  const switchCamera = async () => {
    if (!stream) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");

      if (videoDevices.length > 1) {
        const currentDevice = stream.getVideoTracks()[0].getSettings().deviceId;
        const newDevice = videoDevices.find(device => device.deviceId !== currentDevice);

        if (newDevice) {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: newDevice.deviceId } },
            audio: true,
          });

          // Yeni video akışını güncelle
          const newVideoTrack = newStream.getVideoTracks()[0];
          const oldVideoTrack = stream.getVideoTracks()[0];

          // Eski video akışını durdur
          stream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();

          // Yeni video akışını ekle
          stream.addTrack(newVideoTrack);
          setStream(newStream);

          // Peer'lere yeni kamerayı gönder
          if (peersRef?.current) {
            peersRef.current.forEach(({ peer }) => {
              peer.replaceTrack(oldVideoTrack, newVideoTrack, stream);
            });
          }
        }
      }
    } catch (error) {
      console.error("Kamera değiştirme hatası:", error);
    }
  };

  // **Ekran Paylaşımı Aç/Kapat**
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  
        // Eski video akışını durdur
        stream.getVideoTracks().forEach(track => track.stop());
  
        // Yeni ekran paylaşımı akışını kaydet
        screenStreamRef.current = screenStream;
        setStream(screenStream);
  
        // Tüm peer'lerdeki videoyu değiştir
        if (peersRef?.current) {
          peersRef.current.forEach(({ peer }) => {
            peer.replaceTrack(
              stream.getVideoTracks()[0], // Kamerayı kaldır
              screenStream.getVideoTracks()[0], // Ekran paylaşımını ekle
              stream
            );
          });
        }
  
        // Kullanıcı ekran paylaşımını durdurduğunda kameraya geri dön
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
  
  // **Ekran Paylaşımını Durdur ve Kameraya Geri Dön**
  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
  
    try {
      // Kamera akışını tekrar al
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  
      setStream(newStream);
  
      // Peer'lerdeki ekran paylaşımı akışını tekrar kameraya çevir
      if (peersRef?.current) {
        peersRef.current.forEach(({ peer }) => {
          peer.replaceTrack(
            screenStreamRef.current?.getVideoTracks()[0], // Ekran paylaşımını kaldır
            newStream.getVideoTracks()[0], // Kameraya geri dön
            newStream
          );
        });
      }
  
      setIsScreenSharing(false);
    } catch (error) {
      console.error("Kameraya geri dönme hatası:", error);
    }
  };
  

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={toggleMic}>{isMicOn ? "Mikrofonu Kapat" : "Mikrofonu Aç"}</button>
      <button onClick={toggleCamera}>{isCameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"}</button>
      <button onClick={switchCamera}>Kamerayı Çevir</button>
      <button onClick={toggleScreenShare}>
        {isScreenSharing ? "Ekran Paylaşımını Durdur" : "Ekran Paylaşımını Başlat"}
      </button>
    </div>
  );
};

export default Controls;
