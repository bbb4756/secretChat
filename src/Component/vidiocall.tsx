import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import html2canvas from "html2canvas";

import "./videoCall.scss";

const VideoCall = () => {
    const socketRef = useRef<Socket>();
    const myVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection>();

    const { roomName } = useParams();
    console.log(useParams());

    const cameraRef = useRef<HTMLDivElement>(null);
    const onCapture = () => {
        if (cameraRef.current) {
            html2canvas(cameraRef.current).then((canvas) => {
                //사용할 이미지 포멧과 제목 선택
                onSaveAs(canvas.toDataURL("image/png"), "image-download.png");
            });
        }
    };

    const onSaveAs = (uri: string, filename: string) => {
        //a 태그를 생성하고 다운로드받음
        const link = document.createElement("a");
        document.body.appendChild(link);
        link.href = uri;
        link.download = filename;
        link.click();
        document.body.removeChild(link);
    };

    const getMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (myVideoRef.current) {
                myVideoRef.current.srcObject = stream;
            }
            if (!(pcRef.current && socketRef.current)) {
                return;
            }
            stream.getTracks().forEach((track) => {
                if (!pcRef.current) {
                    return;
                }
                pcRef.current.addTrack(track, stream);
            });

            pcRef.current.onicecandidate = (e) => {
                if (e.candidate) {
                    if (!socketRef.current) {
                        return;
                    }
                    console.log("recv candidate");
                    socketRef.current.emit("candidate", e.candidate, roomName);
                }
            };

            pcRef.current.ontrack = (e) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = e.streams[0];
                }
            };
        } catch (e) {
            console.error(e);
        }
    };

    const createOffer = async () => {
        console.log("create Offer");
        if (!(pcRef.current && socketRef.current)) {
            return;
        }
        try {
            const sdp = await pcRef.current.createOffer();
            pcRef.current.setLocalDescription(sdp);
            console.log("sent the offer");
            socketRef.current.emit("offer", sdp, roomName);
            console.log(sdp, roomName);
        } catch (e) {
            console.error(e);
        }
    };

    const createAnswer = async (sdp: RTCSessionDescription) => {
        console.log("createAnswer");
        if (!(pcRef.current && socketRef.current)) {
            return;
        }

        try {
            pcRef.current.setRemoteDescription(sdp);
            const answerSdp = await pcRef.current.createAnswer();
            pcRef.current.setLocalDescription(answerSdp);

            console.log("sent the answer");
            socketRef.current.emit("answer", answerSdp, roomName);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        socketRef.current = io("localhost:8080");

        pcRef.current = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
            ],
        });

        socketRef.current.on("all_users", (allUsers: Array<{ id: string }>) => {
            if (allUsers.length > 0) {
                createOffer();
            }
        });

        socketRef.current.on("getOffer", (sdp: RTCSessionDescription) => {
            console.log("recv Offer");
            createAnswer(sdp);
        });

        socketRef.current.on("getAnswer", (sdp: RTCSessionDescription) => {
            console.log("recv Answer");
            if (!pcRef.current) {
                return;
            }
            pcRef.current.setRemoteDescription(sdp);
        });

        socketRef.current.on("getCandidate", async (candidate: RTCIceCandidate) => {
            if (!pcRef.current) {
                return;
            }

            await pcRef.current.addIceCandidate(candidate);
        });

        socketRef.current.emit("join_room", {
            room: roomName,
        });

        getMedia();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (pcRef.current) {
                pcRef.current.close();
            }
        };
    }, []);

    return (
        <div
            style={{
                width: "100%",
                height: "auto",
                display: "flex",
                flexDirection: "column",
                alignContent: "center",
                background: "#1e1e1e",
            }}
            ref={cameraRef}
        >
            <div id="text" data-text="y2k Video Chat">
                y2k Video Chat
            </div>
            <div
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    position: "relative",
                }}
            >
                <img
                    src="/camera.png"
                    width={1000}
                    height={500}
                    style={{
                        position: "absolute",
                        top: "27%",
                        filter: "blur(1px) brightness(60%) contrast(120%) grayscale(40%) saturate(140%)",
                    }}
                ></img>
                <div style={{ width: "60%", marginTop: "17%" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-around",
                            alignItems: "center",
                        }}
                    >
                        <div
                            style={{
                                width: 400,
                                height: 300,
                                position: "relative",
                            }}
                        >
                            <video
                                id="myvideo"
                                style={{
                                    width: 400,
                                    height: 300,

                                    transform: "scaleX(-1)",
                                    filter: "blur(1.2px) brightness(80%) contrast(120%) grayscale(40%) saturate(140%)",
                                }}
                                ref={myVideoRef}
                                autoPlay
                                playsInline
                                muted
                            />
                            <p
                                style={{
                                    fontSize: 20,
                                    color: "#939393",
                                    position: "absolute",
                                    right: 10,
                                    bottom: -15,
                                    fontFamily: "Ownglyph_ParkDaHyun",
                                }}
                            >
                                나
                            </p>
                        </div>

                        <div
                            style={{
                                width: 400,
                                height: 300,
                                position: "relative",
                            }}
                        >
                            <video
                                id="remotevideo"
                                style={{
                                    width: 500,
                                    height: 300,
                                    // backgroundColor: "red",
                                    transform: "scaleX(-1)",
                                    filter: "blur(1px) brightness(80%) contrast(120%) grayscale(40%) saturate(140%)",
                                }}
                                ref={remoteVideoRef}
                                muted
                                autoPlay
                                playsInline
                            />
                            {/* <img
                                src={"/test.jpeg"}
                                width={400}
                                height={300}
                                object-fit="cover"
                                style={{ filter: "blur(1px)  contrast(120%)" }}
                            /> */}
                            <p
                                style={{
                                    fontSize: 20,
                                    color: "#939393",
                                    position: "absolute",
                                    left: 10,
                                    bottom: -15,
                                    fontFamily: "Ownglyph_ParkDaHyun",
                                }}
                            >
                                너
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div
                style={{
                    width: "67%",
                    height: 100,
                    alignSelf: "center",
                    position: "relative",
                    // background: "red",
                    marginTop: "7%",
                }}
            >
                <div className="tabs">
                    <button className="tab" onClick={onCapture}>
                        📷 사진찍기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
