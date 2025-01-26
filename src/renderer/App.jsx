// src/renderer/App.jsx
import React, {useState} from 'react'
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import Layout from './layout/Layout'
import CasesList from './pages/CaseList'
import CaseDetail from './pages/CaseDetail'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import CaseDocuments from './pages/CaseDocuments'
import CaseGraph from './pages/CaseGraph'
import CaseAssistant from './pages/CaseAssistant'
import CalendarPage from "./pages/CalendarPage"
import CaseForm from "./components/CaseForm"

export default function App() {

    // Lift the state to manage the current module.
    const [currentModule, setCurrentModule] = useState('Cases');

    return (
        <Router>
            <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
                <Routes>
                    <Route path="/cases" element={<CasesList/>}/>
                    <Route path="/cases/:caseId" element={<CaseDetail setCurrentModule={setCurrentModule}/>}>
                        <Route path="documents" element={<CaseDocuments/>}/>
                        <Route path="evidence" element={<CaseDocuments/>}/>
                        <Route path="graph" element={<CaseGraph/>}/>
                        <Route path="assistant" element={<CaseAssistant/>}/>
                        <Route path="details" element={<CaseForm/>}/>
                    </Route>
                    <Route path="/clients" element={<Clients setCurrentModule={setCurrentModule}/>}/>
                    <Route
                        path="/clients/:clientId"
                        element={<ClientDetail setCurrentModule={setCurrentModule}/>}
                    />
                    <Route path="/documents" element={<CaseDocuments/>}/>
                    <Route path="/graph" element={<CaseGraph/>}/>
                    <Route path="/assistant" element={<CaseAssistant/>}/>
                    <Route path="/calendar" element={<CalendarPage/>}/>
                    <Route path="*" element={<CasesList/>}/>

                </Routes>
            </Layout>
        </Router>
    )
}
