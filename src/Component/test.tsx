import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";

const VideoChat = () => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isStartedVideo, setIsStartedVideo] = useState<boolean>(false);
    const [room, setRoom] = useState<string>("test_room");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

    useEffect(() => {
        const nextSocket = io("http://localhost:8080"); // 자신의 시그널링 서버 IP 주소
        setSocket(nextSocket);

        // 구글에서 제공해주는 coturn 서버 활용
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
                {
                    urls: "stun:stun1.l.google.com:19302",
                },
                {
                    urls: "stun:stun2.l.google.com:19302",
                },
                {
                    urls: "stun:stun3.l.google.com:19302",
                },
            ],
        });

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            nextSocket.emit("candidate", { candidate: event.candidate, room });
        };

        pc.ontrack = (event) => {
            if (!remoteVideoRef.current || !event.streams[0]) return;
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        nextSocket.on("offer", async (msg) => {
            // 내가 보낸 offer인 경우, skip
            if (msg.sender === socket?.id) return;

            // connection에 상대 peer의 SDP 정보를 설정
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

            // 설정 이후 상대 peer에게 나의 SDP 응답
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            nextSocket.emit("answer", { sdp: pc.localDescription, room });
        });

        nextSocket.on("answer", (msg) => {
            if (msg.sender === socket?.id) return;
            // connection에 상대 peer에게 받은 SDP 정보를 설정
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        });

        nextSocket.on("candidate", (msg) => {
            if (msg.sender === socket?.id) return;
            // 데이터를 보낼 수 있는 네트워크 경로를 찾기 위해 ICE 프로세스를 수행하는 단계
            pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        });

        setPeerConnection(pc);
    }, []);

    const startVideo = async () => {
        if (!localVideoRef.current) return;
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => peerConnection?.addTrack(track, stream));
        setIsStartedVideo(true);
    };

    const joinRoom = () => {
        if (!socket || !room) return;
        socket.emit("join", { room });
    };

    const call = async () => {
        const offer = await peerConnection?.createOffer();
        await peerConnection?.setLocalDescription(offer);
        socket?.emit("offer", { sdp: offer, room });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-center gap-2">
                <div className="flex flex-col items-center">
                    <div className="font-semibold">내 화면</div>
                    <video ref={localVideoRef} autoPlay playsInline muted></video>
                </div>
                <div className="flex flex-col items-center">
                    <div className="font-semibold">상대 화면</div>
                    <video ref={remoteVideoRef} autoPlay playsInline></video>
                </div>
            </div>
            <div className="text-center font-semibold">Room Name: {room}</div>
            <div className="justify-center flex items-center gap-6">
                {!isStartedVideo && (
                    <button
                        className="shadow-md px-3 py-2 rounded hover:bg-slate-50 active:shadow-none"
                        onClick={() => {
                            startVideo();
                            joinRoom();
                        }}
                    >
                        비디오 연결
                    </button>
                )}
                <button className="shadow-md px-3 py-2 rounded hover:bg-slate-50 active:shadow-none" onClick={call}>
                    통화 시작
                </button>
            </div>
        </div>
    );
};

export default VideoChat;
