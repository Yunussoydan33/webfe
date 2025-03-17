import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import Controls from "./Controls";
import "./App.css";

const socket = io("https://webbb-f474.onrender.com");

const App = () => {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState(null);
  const userVideo = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    if (!joined) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((userStream) => {
      setStream(userStream);
      userVideo.current.srcObject = userStream;

      socket.emit("join-room", roomId);

      socket.on("other-users", (users) => {
        const peersArr = [];
        users.forEach((userId) => {
          const peer = createPeer(userId, socket.id, userStream);
          peersRef.current.push({ peerId: userId, peer });
          peersArr.push(peer);
        });
        setPeers(peersArr);
      });

      socket.on("user-joined", (data) => {
        const peer = addPeer(data.signal, data.callerId, userStream);
        peersRef.current.push({ peerId: data.callerId, peer });
        setPeers((prevPeers) => [...prevPeers, peer]);
      });

      socket.on("receive-returned-signal", (data) => {
        const peerObj = peersRef.current.find((p) => p.peerId === data.id);
        if (peerObj) peerObj.peer.signal(data.signal);
      });

      socket.on("user-disconnected", (userId) => {
        const peerObj = peersRef.current.find((p) => p.peerId === userId);
        if (peerObj) {
          peerObj.peer.destroy();
        }
        peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
        setPeers((prevPeers) => prevPeers.filter((p) => p.peer !== peerObj?.peer));
      });

      return () => {
        socket.off("other-users");
        socket.off("user-joined");
        socket.off("receive-returned-signal");
        socket.off("user-disconnected");
      };
    });
  }, [joined, roomId]);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("send-signal", { userToSignal, callerId, signal });
    });
    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.signal(incomingSignal);
    peer.on("signal", (signal) => {
      socket.emit("return-signal", { signal, callerId });
    });
    return peer;
  }

  return (
    <div className="container">
      {!joined ? (
        <div className="join-screen">
          <h1>Oda ID Gir</h1>
          <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <button onClick={() => setJoined(true)}>Odaya Gir</button>
        </div>
      ) : (
        <div className="video-container">
          <h1>Oda: {roomId}</h1>
          <video ref={userVideo} autoPlay playsInline muted className="user-video" />
          {peers.map((peer, index) => (
            <Video key={index} peer={peer} />
          ))}
          <Controls stream={stream} setStream={setStream} />
        </div>
      )}
    </div>
  );
};

const Video = ({ peer }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
    return () => {
      peer.destroy(); // Peer bağlantısını temizle
    };
  }, [peer]);

  return <video ref={ref} autoPlay playsInline className="peer-video" />;
};

export default App;
