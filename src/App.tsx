import React from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoCall from "./Component/vidiocall";
import VideoChat from "./Component/test";

function App() {
    // return <VideoCall />;
    // return <VideoChat />;
    return (
        <Router>
            <Routes>
                <Route path="/" element={<></>} />
                <Route path="/:roomName" element={<VideoCall />} />
            </Routes>
        </Router>
    );
}

export default App;
