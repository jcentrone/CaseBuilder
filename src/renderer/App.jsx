// src/renderer/App.jsx
import React, {useEffect, useState} from 'react'
import {BrowserRouter as Router, Route, Routes, useNavigate} from 'react-router-dom'
import UserSettingsForm from "./components/UserSettingsForm";
import Layout from './layout/Layout'
import CasesList from './pages/CaseList'
import CaseDetail from './pages/CaseDetail'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import CaseDocuments from './pages/CaseDocuments'
import CaseEvidence from './pages/CaseEvidence'
import CaseGraph from './pages/CaseGraph'
import CaseAssistant from './pages/CaseAssistant'
import CalendarPage from "./pages/CalendarPage"
import CaseForm from "./components/CaseForm"
import LawChunkViewer from "./pages/LawChunkViewer";
import ChatHistory from "./components/ChatHistory";
import ChatContainer from "./components/ChatContainer";


function ElectronListener() {
    const navigate = useNavigate();

    useEffect(() => {
        window.electronAPI?.ipcRenderer.on("open-user-profile", () => {
            navigate("/settings"); // Navigate to settings when menu option is clicked
        });

        return () => {
            window.electronAPI?.ipcRenderer.removeAllListeners("open-user-profile");
        };
    }, [navigate]);

    return null; // This component only listens for Electron events
}


export default function App() {

    // Lift the state to manage the current module.
    const [currentModule, setCurrentModule] = useState('Clients');

    return (
        <Router>
            <ElectronListener/>
            <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
                <Routes>
                    <Route path="/cases" element={<CasesList/>}/>
                    <Route path="/cases/:caseId" element={<CaseDetail setCurrentModule={setCurrentModule}/>}>
                        <Route path="documents" element={<CaseDocuments/>}/>
                        <Route path="evidence" element={<CaseEvidence/>}/>
                        <Route path="graph" element={<CaseGraph/>}/>
                        <Route path="chat-history" element={<ChatHistory/>}/> {/* ✅ Replacing assistant */}
                        <Route path="chat/:chatId" element={<ChatContainer/>}/>
                        <Route path="details" element={<CaseForm/>}/>
                    </Route>
                    <Route path="/clients" element={<Clients setCurrentModule={setCurrentModule}/>}/>
                    <Route
                        path="/clients/:clientId"
                        element={<ClientDetail setCurrentModule={setCurrentModule}/>}
                    />
                    <Route path="/assistant/:caseId/:chatId" element={<CaseAssistant/>}/>

                    <Route path="/documents" element={<CaseDocuments/>}/>
                    <Route path="/graph" element={<CaseGraph/>}/>
                    <Route path="/assistant" element={<CaseAssistant/>}/>
                    <Route path="/visualizer" element={<LawChunkViewer/>}/>
                    <Route path="/calendar" element={<CalendarPage/>}/>
                    <Route path="/settings" element={<UserSettingsForm/>}/>
                    <Route path="*" element={<Clients setCurrentModule={setCurrentModule}/>}/>

                </Routes>
            </Layout>
        </Router>
    )
}
