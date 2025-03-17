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
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!joined) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((userStream) => {
      setStream(userStream);
      userVideo.current.srcObject = userStream;

      socket.emit("join-room", roomId);

      socket.on("other-users", (users) => {
        users.forEach((userId) => {
          const peer = createPeer(userId, socket.id, userStream);
          peersRef.current.push({ peerId: userId, peer });
          setPeers((prevPeers) => [...prevPeers, { peer, id: userId }]);
        });
      });

      socket.on("user-joined", (data) => {
        const peer = addPeer(data.signal, data.callerId, userStream);
        peersRef.current.push({ peerId: data.callerId, peer });
        setPeers((prevPeers) => [...prevPeers, { peer, id: data.callerId }]);
      });

      socket.on("receive-returned-signal", (data) => {
        const peerObj = peersRef.current.find((p) => p.peerId === data.id);
        if (peerObj) {
          peerObj.peer.signal(data.signal);
        }
      });

      socket.on("user-disconnected", (userId) => {
        const peerObj = peersRef.current.find((p) => p.peerId === userId);
        if (peerObj) {
          peerObj.peer.destroy();
        }
        peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
        setPeers((prevPeers) => prevPeers.filter((p) => p.id !== userId));
      });

      socket.on("receive-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        socket.off("other-users");
        socket.off("user-joined");
        socket.off("receive-returned-signal");
        socket.off("user-disconnected");
        socket.off("receive-message");
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

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("send-message", message);
      setMessages((prev) => [...prev, `Sen: ${message}`]);
      setMessage("");
    }
  };

  return (
    <div className="container">
      {!joined ? (
        <div className="join-screen">
          <h1>Oda ID Gir</h1>
          <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <button onClick={() => setJoined(true)}>Odaya Gir</button>
        </div>
      ) : (
        <div>
          <h1>Oda: {roomId}</h1>
          <div className="video-container">
            <video ref={userVideo} autoPlay playsInline muted className="user-video" />
            {peers.map(({ peer, id }) => (
              <Video key={id} peer={peer} />
            ))}
          </div>
          <Controls stream={stream} setStream={setStream} />
          <div className="chat-box">
  <div className="messages">
    {messages.map((msg, index) => (
      <p key={index} className={msg.startsWith("Sen:") ? "user-message" : "other-message"}>
        {msg}
      </p>
    ))}
  </div>
  <div className="chat-input-container">
    <input
      type="text"
      className="chat-input"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder="Mesaj yaz..."
    />
    <button className="chat-send-button" onClick={sendMessage}>Gönder</button>
  </div>
</div>

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
      peer.destroy();
    };
  }, [peer]);

  return <video ref={ref} autoPlay playsInline className="peer-video" />;
};

export default App;
